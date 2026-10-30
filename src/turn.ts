import { callClaude, parseJson } from "./api";
import { MODEL_CONVERSATION } from "./config";
import { addVocab } from "./db";

/**
 * Análisis de cada turno, en paralelo a la voz del personaje (no añade espera):
 * - qué dijo Rodrigo mal y cómo se dice bien (para marcar la reformulación),
 * - qué palabras no sabía o usó mal (van al juego de las palabras),
 * - qué cosas concretas de la respuesta del personaje se pueden enseñar con una imagen.
 */

export type Visual = { parola: string; lemma: string; emoji: string; image?: string };
export type TurnAnalysis = {
  correzione: { detto: string; meglio: string } | null;
  visual: Visual[];
};

const SYSTEM = `Analizas un turno de una conversación de práctica de italiano oral.
Rodrigo es principiante; su lengua materna es el castellano y piensa en portugués de Brasil. Su frase es una transcripción automática de su voz: cuando no sabe una palabra la dice en castellano, y aparece escrita deformada como si fuera italiano (por ejemplo "cebolla" puede salir "ce volia").

Devuelve solo este JSON, sin texto alrededor:
{"correzione":null,"parole":[],"immagini":[]}

- correzione: si Rodrigo dijo algo mal o en castellano, {"detto":"el fragmento tal como lo dijo","meglio":"cómo se dice bien en italiano, con el cambio mínimo"}. Elige solo lo más importante. null si está bien o si parece un fallo del reconocimiento de voz.
- parole: palabras italianas que Rodrigo no sabía (las dijo en castellano) o usó mal. Cada una: {"lemma":"forma base en italiano","emoji":"1 a 3 emoji que la muestren o vacío","wiki":"título exacto de la página de it.wikipedia.org que la ilustra con una foto, o vacío"}.
- immagini: hasta 3 cosas concretas que se pueden ver (comida, objetos, animales, lugares, acciones claras) mencionadas en la respuesta del personaje y que a un principiante le ayuda ver. Cada una: {"parola":"la palabra tal como aparece en la respuesta","lemma":"forma base","emoji":"1 a 3 emoji","wiki":"título exacto de it.wikipedia o vacío"}. No incluyas palabras abstractas ni muy básicas (ciao, sì, bene).
Nunca escribas nada en castellano en los campos italianos.`;

type Raw = {
  correzione: { detto: string; meglio: string } | null;
  parole?: { lemma: string; emoji?: string; wiki?: string }[];
  immagini?: { parola: string; lemma: string; emoji?: string; wiki?: string }[];
};

const imageCache = new Map<string, string | null>();

/** Foto de la Wikipedia italiana para una palabra (gratis, sin clave). */
export async function wikiImage(title: string): Promise<string | undefined> {
  const t = title.trim();
  if (!t) return undefined;
  if (imageCache.has(t)) return imageCache.get(t) ?? undefined;
  try {
    const r = await fetch(`https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, "_"))}`, {
      headers: { accept: "application/json" },
    });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const src: string | undefined = j.type === "standard" ? j.thumbnail?.source : undefined;
    imageCache.set(t, src ?? null);
    return src;
  } catch {
    imageCache.set(t, null);
    return undefined;
  }
}

export async function analyzeTurn(userText: string, reply: string): Promise<TurnAnalysis> {
  const text = await callClaude({
    model: MODEL_CONVERSATION,
    systemStatic: SYSTEM,
    messages: [{ role: "user", content: `Rodrigo ha dicho: ${userText}\n\nEl personaje ha respondido: ${reply}` }],
    maxTokens: 500,
  });
  const raw = parseJson<Raw>(text);

  for (const p of raw.parole ?? []) {
    const image = p.wiki ? await wikiImage(p.wiki) : undefined;
    addVocab({ lemma: p.lemma, emoji: p.emoji, imageUrl: image, source: "conversazione" });
  }

  const visual: Visual[] = [];
  for (const v of (raw.immagini ?? []).slice(0, 3)) {
    const image = v.wiki ? await wikiImage(v.wiki) : undefined;
    if (!image && !v.emoji) continue;
    visual.push({ parola: v.parola, lemma: v.lemma, emoji: v.emoji ?? "", image });
  }

  const c = raw.correzione;
  return {
    correzione: c && c.detto && c.meglio && c.detto.trim() !== c.meglio.trim() ? c : null,
    visual,
  };
}
