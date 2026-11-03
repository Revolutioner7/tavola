import { CHARACTERS, CharacterId } from "./characters";

/**
 * El recorrido: diez hitos con la familia de Giulia, de una videollamada de 30 segundos
 * a una conversación larga con la abuela. Cada hito tiene un entrenamiento (una conversación
 * corta para preparar lo que hace falta) y la prueba del hito, que es la situación real.
 * Rodrigo ve la misión en castellano (es una instrucción, no una traducción);
 * el personaje recibe "steer" para llevar la conversación hacia ella sin decirlo,
 * y el repaso final decide si se ha cumplido con "check".
 */

export type Scene = {
  cast: CharacterId[]; // uno = conversación normal; varios = escena de grupo
  mission: string; // lo que ve Rodrigo
  check: string; // criterio para el repaso
  steer: string; // instrucción para el personaje o los personajes
  maxMinutes?: number; // a partir de aquí se pide cerrar la conversación
  voiceOnly?: boolean; // llamada sin texto: no se ve lo que dicen
  audioMessage?: boolean; // mensaje de voz: hablas tú solo, sin respuesta ni ayudas
  rateBoost?: number; // multiplica la velocidad de la voz (hermano: más rápido)
};

export type Step = Scene & {
  id: string;
  kind: "prep" | "prova";
  title: string; // en italiano
  emoji: string;
};

export type Hito = { id: string; title: string; emoji: string; situation: string; steps: Step[] };

export const HITOS: Hito[] = [
  {
    id: "h1",
    title: "Videochiamata: ciao!",
    emoji: "📱",
    situation: "Giulia te pasa el móvil en una videollamada: su madre quiere saludarte.",
    steps: [
      {
        id: "h1-prep",
        kind: "prep",
        title: "Ciao, sono Rodrigo",
        emoji: "👋",
        cast: ["chiara"],
        mission: "Saluda, di quién eres y pregunta cómo está.",
        check: "Rodrigo saluda, dice quién es (su nombre o que es el novio de Giulia) y pregunta cómo está la otra persona.",
        steer: "Es la primera vez que habláis. Salúdale, pregúntale quién es y cómo está, y deja que te lo pregunte él a ti.",
        maxMinutes: 4,
      },
      {
        id: "h1-prova",
        kind: "prova",
        title: "Rosa al telefono",
        emoji: "📱",
        cast: ["rosa"],
        mission: "Saluda a la madre de Giulia, contesta cómo estás y despídete bien.",
        check: "Rodrigo saluda, responde a cómo está, contesta al menos una pregunta sencilla y se despide de forma adecuada.",
        steer:
          "Es una videollamada muy corta: Giulia le ha pasado el móvil a Rodrigo. Salúdale con cariño, pregúntale cómo está y una cosa muy sencilla. Tras 4 o 5 intercambios despídete con naturalidad (\"Ti ripasso Giulia, un bacio!\").",
        maxMinutes: 2,
      },
    ],
  },
  {
    id: "h2",
    title: "Videochiamata lunga",
    emoji: "🎥",
    situation: "Una videollamada de cinco minutos con los padres de Giulia: quieren saber de tu vida.",
    steps: [
      {
        id: "h2-prep",
        kind: "prep",
        title: "La mia vita a Barcellona",
        emoji: "🏙️",
        cast: ["chiara"],
        mission: "Cuenta a qué te dedicas, dónde vivís y qué hacéis un fin de semana normal.",
        check: "Rodrigo explica a qué se dedica, dónde vive y al menos una cosa que hace el fin de semana.",
        steer: "Conoces Barcelona. Pregúntale por su trabajo, su barrio y qué hacen Giulia y él los fines de semana, una cosa cada vez.",
      },
      {
        id: "h2-prova",
        kind: "prova",
        title: "Rosa e Tonio in video",
        emoji: "🎥",
        cast: ["rosa", "tonio"],
        mission: "Responde a sus preguntas sobre tu vida: el trabajo, la casa en Barcelona y vuestros planes.",
        check: "Rodrigo responde con frases completas al menos a tres preguntas sobre su trabajo, su casa y sus planes.",
        steer:
          "Videollamada de unos cinco minutos. Los dos queréis saber de la vida de Rodrigo: trabajo, la casa en Barcelona, cómo está Giulia, planes. Os interrumpís un poco entre vosotros, como en una llamada real.",
        maxMinutes: 6,
      },
    ],
  },
  {
    id: "h3",
    title: "Un vocale per Rosa",
    emoji: "🎙️",
    situation: "Rosa te ha mandado un audio de WhatsApp. Le contestas con otro audio, tú solo.",
    steps: [
      {
        id: "h3-prep",
        kind: "prep",
        title: "Racconta la settimana",
        emoji: "🗓️",
        cast: ["lucia"],
        mission: "Cuéntale a Nonna qué has hecho esta semana, en pasado, sin que te tenga que preguntar mucho.",
        check: "Rodrigo cuenta al menos tres cosas que hizo esta semana usando el pasado, con frases seguidas.",
        steer: "Pídele que te cuente su semana y deja que hable él: pregunta poco y con preguntas abiertas (\"E poi?\").",
      },
      {
        id: "h3-prova",
        kind: "prova",
        title: "Il vocale",
        emoji: "🎙️",
        cast: ["rosa"],
        mission: "Responde al audio de Rosa: cómo va tu semana y si iréis por Navidad. Un minuto, tú solo, sin ayudas.",
        check: "Rodrigo responde a las dos cosas (su semana y si irán por Navidad) con al menos cinco frases seguidas y se despide.",
        steer:
          "Le estás dejando a Rodrigo un mensaje de voz de WhatsApp de unos 20 segundos: pregúntale cómo va su semana y si Giulia y él vendrán por Navidad. Habla como en un audio, sin esperar respuesta, y termina con \"Mandami un vocale quando puoi!\".",
        audioMessage: true,
      },
    ],
  },
  {
    id: "h4",
    title: "Telefonata solo voce",
    emoji: "☎️",
    situation: "Una llamada sin vídeo ni texto: solo oyes la voz.",
    steps: [
      {
        id: "h4-prep",
        kind: "prep",
        title: "Puoi ripetere?",
        emoji: "👂",
        cast: ["chiara"],
        mission: "Conversación sin ver el texto. Si no entiendes, pide que repita o que hable más despacio, en italiano.",
        check: "Rodrigo mantiene la conversación sin ver el texto y, si no entiende algo, lo pide en italiano (puoi ripetere, più piano o similar).",
        steer: "Habla a ritmo normal de cosas cotidianas. Si te pide que repitas o vayas más despacio, hazlo con naturalidad.",
        voiceOnly: true,
      },
      {
        id: "h4-prova",
        kind: "prova",
        title: "Organizziamo la visita",
        emoji: "☎️",
        cast: ["rosa"],
        mission: "Organiza la visita por teléfono: qué día llegáis, a qué hora y quién os recoge.",
        check: "Al final de la llamada quedan claros el día de llegada, la hora y quién los recoge, y Rodrigo lo ha dicho o confirmado.",
        steer: "Llamas por teléfono para organizar la visita de Giulia y Rodrigo: pregunta qué día llegan, a qué hora aterriza el avión y propón quién los recoge en el aeropuerto de Brindisi.",
        voiceOnly: true,
        maxMinutes: 5,
      },
    ],
  },
  {
    id: "h5",
    title: "L'arrivo a casa",
    emoji: "🏡",
    situation: "Llegáis a Leverano: saludos, regalos y presentaciones con varios a la vez.",
    steps: [
      {
        id: "h5-prep",
        kind: "prep",
        title: "Un regalo per la nonna",
        emoji: "🎁",
        cast: ["lucia"],
        mission: "Dale un regalo a Nonna, explica qué es y por qué lo has elegido, y haz un cumplido sobre la casa.",
        check: "Rodrigo explica qué regalo trae y por qué, y hace al menos un cumplido.",
        steer: "Rodrigo acaba de llegar con un regalo para ti. Pregúntale qué es, de dónde viene, y enséñale la casa.",
      },
      {
        id: "h5-prova",
        kind: "prova",
        title: "Benvenuto a Leverano!",
        emoji: "🏡",
        cast: ["rosa", "tonio", "lucia"],
        mission: "Llegas a casa: saluda a cada uno, entrega el regalo y responde a las preguntas sobre el viaje.",
        check: "Rodrigo saluda a más de una persona, explica el regalo y responde sobre el viaje.",
        steer: "Rodrigo y Giulia acaban de llegar. Le recibís todos a la vez: abrazos, preguntas sobre el viaje, el regalo, si tiene hambre. Habláis un poco entre vosotros también.",
        maxMinutes: 6,
      },
    ],
  },
  {
    id: "h6",
    title: "A tavola",
    emoji: "🍝",
    situation: "La comida del domingo: hablan varios a la vez y no siempre contigo.",
    steps: [
      {
        id: "h6-prep",
        kind: "prep",
        title: "Passami il pane",
        emoji: "🥖",
        cast: ["lucia"],
        mission: "En la mesa: pide que te pasen algo, acepta un plato y rechaza otro con educación.",
        check: "Rodrigo pide algo en la mesa, acepta comida y rechaza otra con educación (no grazie, sono pieno o similar).",
        steer: "Estáis comiendo. Ofrécele platos sin parar, insiste un poco como buena abuela y pregúntale si le gusta.",
      },
      {
        id: "h6-prova",
        kind: "prova",
        title: "Il pranzo della domenica",
        emoji: "🍝",
        cast: ["rosa", "tonio", "lucia", "marco"],
        mission: "Comida familiar: sigue la conversación aunque hablen entre ellos y participa con cosas tuyas, no solo «sì».",
        check: "Rodrigo interviene con contenido propio (no solo sì o no) al menos tres veces y reacciona a lo que dicen los demás.",
        steer: "Comida del domingo. Habláis entre vosotros de cosas de la familia y del pueblo, con cruces de frases, pero cada turno alguien acaba dando pie a Rodrigo. Ofrecedle comida.",
        maxMinutes: 8,
      },
    ],
  },
  {
    id: "h7",
    title: "Passeggiata con Marco",
    emoji: "🚶",
    situation: "Un paseo con el hermano de Giulia: habla rápido y coloquial.",
    steps: [
      {
        id: "h7-prep",
        kind: "prep",
        title: "Boh, dai, magari",
        emoji: "😎",
        cast: ["chiara"],
        mission: "Charla informal: entiende y usa expresiones coloquiales («Boh», «Dai!», «Magari», «Che figata»).",
        check: "Rodrigo usa al menos dos expresiones coloquiales con sentido.",
        steer: "Habla muy informal, con expresiones coloquiales frecuentes (boh, dai, magari, che figata, vabbè), y anímale a usarlas.",
      },
      {
        id: "h7-prova",
        kind: "prova",
        title: "Due passi in paese",
        emoji: "🚶",
        cast: ["marco"],
        mission: "Paseo con el hermano de Giulia: habla de deporte, música o planes, y hazle preguntas tú a él.",
        check: "Rodrigo hace al menos dos preguntas propias y mantiene una charla informal.",
        steer: "Estáis paseando por el pueblo. Habla rápido e informal, como con un amigo, y espera que él también te pregunte cosas.",
        rateBoost: 1.12,
        maxMinutes: 7,
      },
    ],
  },
  {
    id: "h8",
    title: "In cucina con Rosa",
    emoji: "👩‍🍳",
    situation: "Rosa te pide ayuda en la cocina y te da instrucciones.",
    steps: [
      {
        id: "h8-prep",
        kind: "prep",
        title: "Taglia, mescola, assaggia",
        emoji: "🔪",
        cast: ["lucia"],
        mission: "Nonna te explica una receta: repite los pasos con tus palabras para comprobar que lo has entendido.",
        check: "Rodrigo repite o resume al menos dos pasos de la receta con sus palabras.",
        steer: "Explícale una receta paso a paso (taglia, soffriggi, mescola, assaggia) y pídele que te repita lo que ha entendido.",
      },
      {
        id: "h8-prova",
        kind: "prova",
        title: "Mi dai una mano?",
        emoji: "👩‍🍳",
        cast: ["rosa"],
        mission: "Ayuda a Rosa en la cocina: haz lo que te pide, pregunta cuando no entiendas y confirma («Così va bene?»).",
        check: "Rodrigo confirma o pregunta al menos dos veces y demuestra entender las instrucciones.",
        steer: "Estás cocinando y le pides ayuda. Dale instrucciones cortas, una cada vez (prendi, taglia, mescola, assaggia), y reacciona a lo que él dice que hace.",
        maxMinutes: 7,
      },
    ],
  },
  {
    id: "h9",
    title: "Dopo pranzo",
    emoji: "☕",
    situation: "La sobremesa: se cuentan historias y se discute de todo.",
    steps: [
      {
        id: "h9-prep",
        kind: "prep",
        title: "C'era una volta…",
        emoji: "📖",
        cast: ["tonio"],
        mission: "Cuéntale a Tonio una anécdota de un viaje, con principio, nudo y final.",
        check: "Rodrigo cuenta una historia en pasado con al menos tres hechos encadenados.",
        steer: "Pídele que te cuente una anécdota de algún viaje y reacciona con interés y preguntas (\"E poi? Ma dai!\").",
      },
      {
        id: "h9-prova",
        kind: "prova",
        title: "Il caffè e le chiacchiere",
        emoji: "☕",
        cast: ["tonio", "marco", "chiara"],
        mission: "Sobremesa: cuenta una historia tuya y da tu opinión cuando discutan («Secondo me…»).",
        check: "Rodrigo cuenta una historia en pasado con varios hechos y da al menos una opinión con una razón.",
        steer: "Sobremesa con café. Discutís entre vosotros de fútbol, de trabajo y de Barcelona; pedidle una historia y su opinión, y llevadle un poco la contraria.",
        maxMinutes: 8,
      },
    ],
  },
  {
    id: "h10",
    title: "La nonna",
    emoji: "👵",
    situation: "Una conversación larga con la abuela: habla lento, con acento del sur, de cómo era todo antes.",
    steps: [
      {
        id: "h10-prep",
        kind: "prep",
        title: "Com'era una volta",
        emoji: "🕰️",
        cast: ["tonio"],
        mission: "Pregunta a Tonio cómo era Leverano cuando era niño y reacciona a lo que cuenta.",
        check: "Rodrigo hace al menos dos preguntas sobre el pasado y reacciona a las respuestas.",
        steer: "Cuéntale cómo era el pueblo cuando eras niño, usando el imperfetto, y deja que te pregunte.",
      },
      {
        id: "h10-prova",
        kind: "prova",
        title: "Due chiacchiere con la nonna",
        emoji: "👵",
        cast: ["lucia"],
        mission: "Conversación larga con la abuela: entiende sus historias de antes, hazle preguntas y cuéntale de tu familia.",
        check: "Rodrigo hace preguntas sobre el pasado de la abuela, reacciona a sus historias y cuenta algo de su propia familia.",
        steer:
          "Hoy hablas con más acento del sur y de vez en cuando usas una palabra del dialecto salentino, que luego repites en italiano. Cuéntale cosas de cuando eras joven (la vendemmia, la guerra, cómo conociste a tu marido) y pregúntale por su familia.",
        maxMinutes: 12,
      },
    ],
  },
];

export const STEPS: Step[] = HITOS.flatMap((h) => h.steps);

/** Prueba de nivel: una conversación que empieza muy fácil y va subiendo hasta donde llegues. */
export const PLACEMENT: Step = {
  id: "placement",
  kind: "prova",
  title: "Prova di livello",
  emoji: "🧭",
  cast: ["chiara"],
  mission: "Prueba de nivel, unos 5 minutos. Empieza muy fácil y va subiendo. Contesta como puedas y usa las ayudas solo si de verdad las necesitas.",
  check: "",
  steer: `ESTO ES UNA PRUEBA DE NIVEL. Aquí no se aplica la regla 2 de adaptar tu italiano: lo vas cambiando tú por escalones.
- Empieza en A1: preguntas muy sencillas (cómo se llama, de dónde es, dónde vive).
- Cada vez que responda bien, sube un escalón en tu siguiente pregunta: A2 (rutina, qué hizo ayer), B1 (contar una experiencia, planes, una opinión con su razón), B2 (hipótesis: "cosa faresti se...", temas más abstractos), C1 (matices, ironía, temas complejos, más rápido).
- Si no entiende o responde con errores graves, baja un escalón y vuelve a intentar subir después.
- Una sola pregunta por turno. Unos 8 a 10 turnos. Habla con la velocidad y el vocabulario del escalón en que estás.
- No reformules sus errores ni le ayudes con la gramática: solo conversa. Nunca digas que es una prueba ni en qué nivel está.`,
  maxMinutes: 6,
};

export function getStep(id: string | undefined): Step | undefined {
  if (!id) return undefined;
  if (id === PLACEMENT.id) return PLACEMENT;
  return STEPS.find((s) => s.id === id);
}

/** Hito en el que conviene empezar según el nivel de habla de la prueba. */
export function suggestedHito(speaking: string): number {
  const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const i = Math.max(0, order.indexOf(speaking.slice(0, 2).toUpperCase()));
  return [0, 2, 4, 6, 8, 8][i];
}

export function hitoOf(stepId: string): Hito | undefined {
  return HITOS.find((h) => h.steps.some((s) => s.id === stepId));
}

/** Índice del paso actual (el primero sin superar). STEPS.length si ya están todos. */
export function currentIndex(completed: Set<string>): number {
  const i = STEPS.findIndex((s) => !completed.has(s.id));
  return i === -1 ? STEPS.length : i;
}

/** Hitos superados (con la prueba hecha). */
export function hitosDone(completed: Set<string>): number {
  return HITOS.filter((h) => h.steps.every((s) => completed.has(s.id))).length;
}

/** Personajes disponibles: los que ya han salido en algún paso alcanzado. */
export function unlockedCharacters(completed: Set<string>): CharacterId[] {
  const reached = STEPS.slice(0, currentIndex(completed) + 1);
  return CHARACTERS.filter((c) => reached.some((s) => s.cast.includes(c.id))).map((c) => c.id);
}

/** Personajes que aparecen por primera vez en el paso siguiente a este. */
export function charactersUnlockedBy(stepId: string): CharacterId[] {
  const i = STEPS.findIndex((s) => s.id === stepId);
  const next = STEPS[i + 1];
  if (!next) return [];
  const before = new Set(STEPS.slice(0, i + 1).flatMap((s) => s.cast));
  return next.cast.filter((c) => !before.has(c));
}

/** Pasos hasta el hito indicado (para empezar más adelante tras la prueba de nivel). */
export function stepsBeforeHito(hitoIndex: number): string[] {
  return HITOS.slice(0, hitoIndex).flatMap((h) => h.steps.map((s) => s.id));
}
