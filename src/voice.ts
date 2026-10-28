import * as Speech from "expo-speech";

const MALE_NAMES = ["luca", "paolo", "giorgio", "giulio"];

/**
 * Elige la mejor voz italiana instalada en el iPhone.
 * Orden: Premium > Mejorada > normal, y dentro de cada nivel, del género del personaje.
 * Las voces Premium se descargan gratis en Ajustes > Accesibilidad > Contenido leído > Voces > Italiano.
 */
export async function pickVoice(gender: "f" | "m"): Promise<string | undefined> {
  try {
    const voices = (await Speech.getAvailableVoicesAsync()).filter((v) => v.language?.toLowerCase().startsWith("it"));
    const tier = (id: string, quality?: string) => {
      const i = id.toLowerCase();
      if (i.includes("premium")) return 3;
      if (i.includes("enhanced") || quality === Speech.VoiceQuality.Enhanced) return 2;
      if (i.includes("siri")) return 1;
      return 0;
    };
    const isMale = (name: string) => MALE_NAMES.some((m) => name.toLowerCase().includes(m));
    const sorted = voices
      .map((v) => ({ v, t: tier(v.identifier, v.quality), g: isMale(v.name) ? "m" : "f" }))
      .sort((a, b) => b.t - a.t || (a.g === gender ? -1 : 0) - (b.g === gender ? -1 : 0));
    return sorted[0]?.v.identifier;
  } catch {
    return undefined;
  }
}

/** Indica si hay alguna voz italiana de calidad Premium o Mejorada instalada. */
export async function hasGoodItalianVoice(): Promise<boolean> {
  try {
    const voices = (await Speech.getAvailableVoicesAsync()).filter((v) => v.language?.toLowerCase().startsWith("it"));
    return voices.some((v) => /premium|enhanced/i.test(v.identifier) || v.quality === Speech.VoiceQuality.Enhanced);
  } catch {
    return true;
  }
}
