import type { ExpoSpeechRecognitionResultSegment } from "expo-speech-recognition";

/** Cuenta sílabas aproximadas en italiano: grupos de vocales. */
export function countSyllables(text: string): number {
  const groups = text.toLowerCase().match(/[aeiouàèéìíòóùú]+/g);
  if (!groups) return 0;
  // Un grupo con "i" o "u" seguida de otra vocal suele ser una sola sílaba (piace, buono),
  // y los hiatos (paese, mio) cuentan doble; se aproxima sumando media sílaba por grupo largo.
  return groups.reduce((n, g) => n + (g.length >= 3 ? 2 : 1), 0);
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Duración hablada de un turno a partir de los tiempos de cada palabra.
 * Si el reconocedor no devuelve tiempos, se usa la duración medida con el reloj.
 */
export function turnSeconds(segments: ExpoSpeechRecognitionResultSegment[] | undefined, fallbackSeconds: number): number {
  if (segments && segments.length) {
    const start = segments[0].startTimeMillis;
    const end = segments[segments.length - 1].endTimeMillis;
    if (end > start) return (end - start) / 1000;
  }
  return fallbackSeconds;
}

export type Word = { text: string; start: number; end: number }; // tiempos en ms

/** Pausa: hueco de al menos 250 ms entre dos palabras (el umbral habitual en los estudios). */
const PAUSE_MS = 250;

export type FluencyMetrics = {
  seconds: number; // tiempo total del monólogo (con pausas)
  syllables: number;
  words: number;
  speechRate: number; // sílabas por minuto, pausas incluidas
  meanRun: number; // sílabas medias entre pausas
  pausesPerMinute: number;
};

/** Métricas de fluidez a partir de las palabras con sus tiempos. */
export function fluencyFromWords(words: Word[], fallbackSeconds: number, fallbackText: string): FluencyMetrics {
  if (words.length < 2) {
    const syllables = countSyllables(fallbackText);
    return {
      seconds: fallbackSeconds,
      syllables,
      words: countWords(fallbackText),
      speechRate: syllablesPerMinute(syllables, fallbackSeconds),
      meanRun: 0,
      pausesPerMinute: 0,
    };
  }
  const seconds = (words[words.length - 1].end - words[0].start) / 1000;
  const runs: number[] = [];
  let current = countSyllables(words[0].text);
  let pauses = 0;
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    const syl = countSyllables(words[i].text);
    if (gap >= PAUSE_MS) {
      pauses++;
      runs.push(current);
      current = syl;
    } else {
      current += syl;
    }
  }
  runs.push(current);
  const syllables = runs.reduce((a, b) => a + b, 0);
  return {
    seconds,
    syllables,
    words: words.length,
    speechRate: syllablesPerMinute(syllables, seconds),
    meanRun: Math.round((syllables / runs.length) * 10) / 10,
    pausesPerMinute: seconds > 0 ? Math.round((pauses / seconds) * 60 * 10) / 10 : 0,
  };
}

/** Sílabas por minuto: la métrica principal de fluidez. */
export function syllablesPerMinute(syllables: number, seconds: number): number {
  if (seconds < 5) return 0;
  return Math.round((syllables / seconds) * 60);
}
