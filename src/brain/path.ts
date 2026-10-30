import { CHARACTERS, CharacterId } from "./characters";

/**
 * El recorrido: etapas («tappe») con una misión de conversación cada una.
 * Se empieza solo con Nonna Lucia; cada personaje aparece al llegar a su primera etapa,
 * por orden de dificultad: Lucia → Chiara → Marco → Tonio.
 * La misión la ve Rodrigo (en castellano, es una instrucción, no una traducción) y la recibe el personaje
 * para llevar la conversación hacia ella sin decirlo. El repaso final decide si se ha cumplido.
 */

export type Tappa = {
  id: string;
  characterId: CharacterId;
  title: string; // en italiano
  emoji: string;
  mission: string; // lo que ve Rodrigo
  check: string; // criterio para el repaso: qué tiene que haber dicho Rodrigo
  steer: string; // instrucción para el personaje
};

export const TAPPE: Tappa[] = [
  {
    id: "lucia-1",
    characterId: "lucia",
    title: "Piacere, Nonna!",
    emoji: "👵",
    mission: "Preséntate: cómo te llamas, de dónde eres y dónde vives ahora.",
    check: "Rodrigo dice su nombre, de dónde es y dónde vive, en italiano y de forma comprensible.",
    steer: "Es vuestro primer encuentro. Pregúntale cómo se llama, de dónde es y dónde vive, una cosa cada vez.",
  },
  {
    id: "lucia-2",
    characterId: "lucia",
    title: "Cosa ti piace mangiare?",
    emoji: "🍝",
    mission: "Dile a Nonna tres comidas que te gustan y una que no.",
    check: "Rodrigo nombra al menos tres comidas que le gustan y una que no le gusta (mi piace / non mi piace o equivalente).",
    steer: "Quieres saber qué le gusta comer para preparar la comida del domingo. Pregúntale qué le gusta y qué no.",
  },
  {
    id: "lucia-3",
    characterId: "lucia",
    title: "In cucina con Nonna",
    emoji: "🧅",
    mission: "Explícale un plato que sabes cocinar: los ingredientes y al menos dos pasos.",
    check: "Rodrigo nombra un plato, al menos tres ingredientes y describe al menos dos pasos de la preparación.",
    steer: "Pídele que te enseñe un plato de su país. Pregunta por los ingredientes y por cómo se hace, paso a paso.",
  },
  {
    id: "chiara-1",
    characterId: "chiara",
    title: "Il tuo quartiere",
    emoji: "🏙️",
    mission: "Cuéntale a Chiara cómo es tu barrio de Barcelona y qué se puede hacer allí.",
    check: "Rodrigo describe su barrio (cómo es) y dice al menos dos cosas que se pueden hacer allí.",
    steer: "Conoces Barcelona. Pregúntale en qué barrio vive, cómo es y qué se puede hacer allí.",
  },
  {
    id: "chiara-2",
    characterId: "chiara",
    title: "Che lavoro fai?",
    emoji: "💼",
    mission: "Explícale en qué trabajas y qué haces en un día normal.",
    check: "Rodrigo explica a qué se dedica y describe al menos dos actividades de un día normal de trabajo.",
    steer: "Habla de trabajo: pregúntale a qué se dedica y cómo es un día normal para él.",
  },
  {
    id: "chiara-3",
    characterId: "chiara",
    title: "Un consiglio",
    emoji: "🗺️",
    mission: "Chiara vuelve a Barcelona un fin de semana: recomiéndale dos sitios y di por qué.",
    check: "Rodrigo recomienda al menos dos sitios concretos y da una razón para cada uno.",
    steer: "Cuéntale que vas a Barcelona un fin de semana con una amiga y pídele consejos: adónde ir y por qué.",
  },
  {
    id: "marco-1",
    characterId: "marco",
    title: "In bici",
    emoji: "🚴",
    mission: "Cuéntale a Marco tu última salida en bici: adónde fuiste, con quién y cómo fue.",
    check: "Rodrigo cuenta una salida en bici en pasado (passato prossimo), con lugar y al menos otro detalle.",
    steer: "Eres ciclista. Pregúntale por su última salida en bici: adónde fue, con quién, cómo fue.",
  },
  {
    id: "marco-2",
    characterId: "marco",
    title: "Andiamo al concerto?",
    emoji: "🎸",
    mission: "Quedad para ir a un concierto: decidid qué día, a qué hora y dónde os veis.",
    check: "Rodrigo propone o acepta un plan y quedan fijados el día, la hora y el lugar de encuentro.",
    steer: "Propón ir juntos a un concierto este verano. Negocia día, hora y punto de encuentro; pon alguna pega para que él proponga.",
  },
  {
    id: "marco-3",
    characterId: "marco",
    title: "Il fine settimana",
    emoji: "📅",
    mission: "Cuéntale tus planes para el próximo fin de semana.",
    check: "Rodrigo cuenta al menos dos planes para el fin de semana usando futuro o presente con valor de futuro.",
    steer: "Pregúntale qué va a hacer el fin de semana que viene, y cuéntale tú los tuyos.",
  },
  {
    id: "tonio-1",
    characterId: "tonio",
    title: "Forza Lecce!",
    emoji: "⚽",
    mission: "Dale a Zio Tonio tu opinión sobre fútbol y defiéndela cuando te lleve la contraria.",
    check: "Rodrigo da una opinión (secondo me, penso che o equivalente) y la mantiene con al menos una razón cuando Tonio le contradice.",
    steer: "Pregúntale su opinión de fútbol y llévale la contraria con humor, para que tenga que defenderla.",
  },
  {
    id: "tonio-2",
    characterId: "tonio",
    title: "Il vicino Cosimo",
    emoji: "🫒",
    mission: "Tonio te cuenta su problema con el vecino: dale un consejo.",
    check: "Rodrigo da al menos un consejo concreto (dovresti, perché non…, o equivalente) y lo justifica.",
    steer: "Cuéntale tu problema con el vecino Cosimo y el olivo, y pídele consejo. Pon objeciones a sus ideas.",
  },
  {
    id: "tonio-3",
    characterId: "tonio",
    title: "Il pranzo della domenica",
    emoji: "🍷",
    mission: "Confirma que vienes a la comida del domingo: cuándo llegas, con quién y qué traes.",
    check: "Rodrigo dice cuándo llega, con quién viene y qué lleva a la comida.",
    steer: "Invítale a la comida del domingo en casa de la Nonna. Pregunta a qué hora llega, con quién viene y qué trae.",
  },
];

export function getTappa(id: string | undefined): Tappa | undefined {
  return id ? TAPPE.find((t) => t.id === id) : undefined;
}

/** Índice de la etapa actual (la primera sin superar). TAPPE.length si ya están todas. */
export function currentIndex(completed: Set<string>): number {
  const i = TAPPE.findIndex((t) => !completed.has(t.id));
  return i === -1 ? TAPPE.length : i;
}

/** Personajes disponibles: los que tienen alguna etapa ya alcanzada. */
export function unlockedCharacters(completed: Set<string>): CharacterId[] {
  const reached = TAPPE.slice(0, currentIndex(completed) + 1);
  return CHARACTERS.filter((c) => reached.some((t) => t.characterId === c.id)).map((c) => c.id);
}

/** Si superar esta etapa abre un personaje nuevo, lo devuelve. */
export function characterUnlockedBy(tappaId: string): CharacterId | undefined {
  const i = TAPPE.findIndex((t) => t.id === tappaId);
  const next = TAPPE[i + 1];
  if (!next) return undefined;
  const firstOfNext = TAPPE.findIndex((t) => t.characterId === next.characterId);
  return firstOfNext === i + 1 ? next.characterId : undefined;
}
