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
let audioModeReady = false; // el modo de audio solo se ajusta una vez (o tras usar el micrófono)
const preloaded = new Map<string, AudioPlayer>(); // audios ya descargados (palabras del juego)
let activePreloaded: AudioPlayer | null = null;
const preKey = (text: string, voice: string, rate: number) => `${voice}|${rate.toFixed(2)}|${text}`;

/** Avisar cuando se ha usado el micrófono: después hay que volver a poner el audio en modo altavoz. */
export function markAudioModeDirty() {
  audioModeReady = false;
}

/** Descarga por adelantado el audio de textos cortos (por ejemplo las palabras de una ronda del juego). */
export function preloadSpeech(texts: string[], voice: string, rate = 1) {
  if (googleFailed) return;
  for (const raw of texts) {
    const text = speakable(raw);
    const k = preKey(text, voice, rate);
    if (!text || preloaded.has(k)) continue;
    preloaded.set(k, createAudioPlayer({ uri: ttsUri(text, voice, rate), headers: { "x-tavola-key": APP_KEY } }));
  }
}

/** Libera los audios descargados por adelantado. */
export function releasePreloaded() {
  preloaded.forEach((p) => {
    try {
      p.remove();
    } catch {}
  });
  preloaded.clear();
  activePreloaded = null;
}

type SpeakOpts = {
  googleVoice: string;
  deviceVoice?: string;
  rate?: number; // 1 = normal
  onDone?: () => void;
};

/**
 * Parte la respuesta en trozos para que el primero suene enseguida.
 * Cada trozo lleva al menos 6 palabras: con frases muy cortas («E le verdure?») la voz de Google
 * no tiene contexto suficiente y a veces las pronuncia como si fueran de otro idioma.
 */
const MIN_WORDS = 6;
export function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && words(out[out.length - 1]) < MIN_WORDS) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  // Si el último trozo se ha quedado corto, va con el anterior
  if (out.length > 1 && words(out[out.length - 1]) < MIN_WORDS) {
    const last = out.pop()!;
    out[out.length - 1] += ` ${last}`;
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
  if (activePreloaded) {
    try {
      activePreloaded.pause();
    } catch {}
    activePreloaded = null;
  }
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

/** Quita emojis, asteriscos y acotaciones para que la voz no los lea. */
export function speakable(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(/[*_~#]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([?!.,;:…])/g, "$1")
    .trim();
}

export async function speak(rawText: string, opts: SpeakOpts) {
  const text = speakable(rawText);
  stopSpeaking();
  if (!text) {
    opts.onDone?.();
    return;
  }
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

  if (!audioModeReady) {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldRouteThroughEarpiece: false });
      audioModeReady = true;
    } catch {}
    if (mySession !== session) return;
  }

  // Audio ya descargado: suena al instante
  const pre = preloaded.get(preKey(text, opts.googleVoice, rate));
  if (pre && pre.isLoaded) {
    activePreloaded = pre;
    const sub = pre.addListener("playbackStatusUpdate", (st: any) => {
      if (mySession !== session) return;
      if (st.didJustFinish) {
        sub.remove();
        finish();
      }
    });
    subs.push(sub);
    try {
      pre.seekTo(0);
    } catch {}
    pre.play();
    return;
  }

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
