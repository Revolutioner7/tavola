import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { API_URL, APP_KEY } from "./config";

/**
 * Voz de los personajes.
 * Usa la voz natural de Google (a través del intermediario de Cloudflare) y, si falla,
 * la voz del iPhone para no dejar a nadie mudo.
 *
 * Para que el personaje empiece a hablar cuanto antes, el texto se parte en frases:
 * se pide y se reproduce la primera (que tarda muy poco en generarse) mientras
 * se van preparando las siguientes.
 */

let session = 0; // cada llamada a speak() abre una sesión; stopSpeaking() la invalida
let players: AudioPlayer[] = [];
let subs: { remove: () => void }[] = [];
let googleFailed = false;

type SpeakOpts = {
  googleVoice: string;
  deviceVoice?: string;
  rate?: number; // 1 = normal
  onDone?: () => void;
};

export function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Une frases muy cortas con la siguiente para que la voz no suene a trozos
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && out[out.length - 1].length < 12) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out.length ? out : [text];
}

function cleanup() {
  subs.forEach((s) => {
    try {
      s.remove();
    } catch {}
  });
  subs = [];
  players.forEach((p) => {
    try {
      p.pause();
      p.remove();
    } catch {}
  });
  players = [];
}

export function stopSpeaking() {
  session++;
  cleanup();
  Speech.stop();
}

function ttsUri(text: string, voice: string, rate: number) {
  return `${API_URL}/v1/tts?voice=${encodeURIComponent(voice)}&rate=${rate.toFixed(2)}&text=${encodeURIComponent(text)}`;
}

function deviceSpeak(text: string, opts: SpeakOpts, mySession: number, onEnd: () => void) {
  Speech.speak(text, {
    language: "it-IT",
    voice: opts.deviceVoice,
    rate: 0.95 * (opts.rate ?? 1),
    onDone: () => {
      if (mySession === session) onEnd();
    },
    onError: () => {
      if (mySession === session) onEnd();
    },
  });
}

export async function speak(text: string, opts: SpeakOpts) {
  stopSpeaking();
  const mySession = session;
  const rate = opts.rate ?? 1;
  const finish = () => {
    if (mySession !== session) return;
    cleanup();
    opts.onDone?.();
  };

  if (googleFailed) {
    deviceSpeak(text, opts, mySession, finish);
    return;
  }

  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldRouteThroughEarpiece: false });
  } catch {}
  if (mySession !== session) return;

  const sentences = splitSentences(text);
  const make = (i: number) => {
    if (i >= sentences.length || players[i]) return;
    players[i] = createAudioPlayer({ uri: ttsUri(sentences[i], opts.googleVoice, rate), headers: { "x-tavola-key": APP_KEY } });
  };

  const playAt = (i: number) => {
    if (mySession !== session) return;
    if (i >= sentences.length) return finish();
    make(i);
    make(i + 1); // prepara la siguiente mientras suena esta
    const p = players[i];
    let started = false;
    const timeout = setTimeout(() => {
      if (started || mySession !== session) return;
      // Google no responde: el resto lo dice la voz del iPhone
      googleFailed = i === 0;
      cleanup();
      deviceSpeak(sentences.slice(i).join(" "), opts, mySession, finish);
    }, 6000);
    const sub = p.addListener("playbackStatusUpdate", (s: any) => {
      if (mySession !== session) return;
      if (s.isLoaded && !started) {
        started = true;
        clearTimeout(timeout);
      }
      if (s.didJustFinish) {
        sub.remove();
        playAt(i + 1);
      }
    });
    subs.push(sub);
    p.play();
  };

  playAt(0);
}
