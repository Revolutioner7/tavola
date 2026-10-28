import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { API_URL, APP_KEY } from "./config";

/**
 * Voz de los personajes.
 * Primero intenta la voz natural de Google (a través del intermediario de Cloudflare).
 * Si falla (sin conexión, sin configurar), usa la voz del iPhone para no dejar a nadie mudo.
 */

let player: AudioPlayer | null = null;
let finishSub: { remove: () => void } | null = null;
let speaking = false;
let googleAvailable: boolean | null = null;

type SpeakOpts = {
  googleVoice: string;
  deviceVoice?: string;
  rate?: number; // 1 = normal
  onDone?: () => void;
};

async function prepareAudio() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldRouteThroughEarpiece: false });
  } catch {}
}

export function stopSpeaking() {
  speaking = false;
  try {
    finishSub?.remove();
  } catch {}
  finishSub = null;
  try {
    player?.pause();
    player?.remove();
  } catch {}
  player = null;
  Speech.stop();
}

export async function speak(text: string, opts: SpeakOpts) {
  stopSpeaking();
  speaking = true;
  const rate = opts.rate ?? 1;
  const done = () => {
    if (!speaking) return;
    speaking = false;
    opts.onDone?.();
  };

  if (googleAvailable !== false) {
    try {
      await prepareAudio();
      const uri = `${API_URL}/v1/tts?voice=${encodeURIComponent(opts.googleVoice)}&rate=${rate.toFixed(2)}&text=${encodeURIComponent(text)}`;
      const p = createAudioPlayer({ uri, headers: { "x-tavola-key": APP_KEY } });
      player = p;
      let started = false;
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => !started && reject(new Error("timeout")), 8000);
        finishSub = p.addListener("playbackStatusUpdate", (s: any) => {
          if (s.isLoaded && !started) {
            started = true;
            clearTimeout(timeout);
            resolve();
          }
          if (s.didJustFinish) done();
        });
        p.play();
      });
      googleAvailable = true;
      return;
    } catch {
      // Sin voz de Google: se pasa a la del iPhone
      if (googleAvailable === null) googleAvailable = false;
      try {
        player?.remove();
      } catch {}
      player = null;
      if (!speaking) return;
    }
  }

  Speech.speak(text, {
    language: "it-IT",
    voice: opts.deviceVoice,
    rate: 0.95 * rate,
    onDone: done,
    onStopped: () => {},
    onError: done,
  });
}

/** Comprueba si el intermediario tiene la voz de Google configurada. */
export async function checkGoogleVoice(): Promise<boolean> {
  try {
    const r = await fetch(`${API_URL}/health`);
    const j = await r.json();
    googleAvailable = Boolean(j.tts);
  } catch {
    googleAvailable = null;
  }
  return Boolean(googleAvailable);
}
