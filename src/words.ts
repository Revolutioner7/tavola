import { callClaude, parseJson } from "./api";
import { MODEL_CONVERSATION } from "./config";
import { addVocab, saveLookedUpWord } from "./db";
import { wikiImage } from "./turn";

export type WordExplanation = {
  lemma: string;
  emoji: string;
  spiegazione: string;
  esempio: string;
  contrario: string;
  gesto: string;
  wiki?: string;
  image?: string;
};

const SYSTEM = `Sei un insegnante di italiano per principianti assoluti (livello A1). Spieghi parole SOLO in italiano: è vietato tradurre o usare altre lingue, anche una sola parola.

Ti danno una parola e la frase in cui appare. Spiega il significato che ha in QUELLA frase.

Restituisci solo questo JSON:
{"lemma":"","emoji":"","spiegazione":"","esempio":"","contrario":"","gesto":"","wiki":""}

- lemma: la forma base (infinito per i verbi, singolare maschile per nomi e aggettivi).
- emoji: da 1 a 3 emoji che mostrano il significato. Stringa vuota se non c'è un'emoji chiara.
- spiegazione: massimo 12 parole, italiano semplicissimo, parole molto frequenti. Mai definire una parola con se stessa.
- esempio: una frase breve e diversa, con la parola.
- contrario: il contrario, se è utile per capire. Altrimenti stringa vuota.
- gesto: se esiste un gesto italiano tipico o un mimo semplice che mostra il significato, descrivilo in massimo 10 parole semplici (es. "Muovi la mano davanti alla bocca, come quando mangi"). Altrimenti stringa vuota.
- wiki: se è una cosa concreta che si può vedere, il titolo esatto della pagina di it.wikipedia.org con una foto che la mostra. Altrimenti stringa vuota.`;

const cache = new Map<string, WordExplanation>();

/** Limpia la palabra tocada (sin signos de puntuación). */
export function cleanWord(raw: string): string {
  return raw.replace(/^[^\p{L}']+|[^\p{L}']+$/gu, "");
}

export async function explainWord(word: string, sentence: string): Promise<WordExplanation> {
  const key = `${word.toLowerCase()}|${sentence}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const text = await callClaude({
    model: MODEL_CONVERSATION,
    systemStatic: SYSTEM,
    messages: [{ role: "user", content: `Parola: ${word}\nFrase: ${sentence}` }],
    maxTokens: 300,
  });
  const data = parseJson<WordExplanation>(text);
  if (data.wiki) data.image = await wikiImage(data.wiki);
  cache.set(key, data);
  try {
    addVocab({ lemma: data.lemma || word, emoji: data.emoji, imageUrl: data.image, explanation: data.spiegazione, source: "toccata" });
  } catch {}
  try {
    saveLookedUpWord(data.lemma || word, sentence, data.emoji, data.spiegazione);
  } catch {}
  return data;
}
