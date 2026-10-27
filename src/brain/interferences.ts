// Interferencias del portugués de Brasil y del castellano hacia el italiano.
// La tarjeta (en castellano) se muestra cuando un mismo error se repite tres veces.

export type Interference = {
  code: string;
  priority: 1 | 2 | 3; // 1 cambia el significado, 2 suena mal, 3 se fosiliza
  what: string;
  example: string;
  card: string;
};

export const INTERFERENCES: Interference[] = [
  // Pronunciación
  { code: "PRON-DOBLES", priority: 1, what: "No distinguir consonantes simples y dobles", example: "nono / nonno, casa / cassa, caro / carro", card: "En italiano la doble se mantiene un instante más y cambia el significado: «nono» es noveno, «nonno» es abuelo." },
  { code: "PRON-TI-DI", priority: 2, what: "Decir «tchi» y «dji» ante i, como en Brasil", example: "«djiciamo» por diciamo", card: "En italiano la t y la d ante i suenan secas, igual que ante a, sin silbido." },
  { code: "PRON-VOCAL-FINAL", priority: 2, what: "Cerrar la -o final en «u» y la -e en «i»", example: "«grandi» por grande", card: "Todas las vocales suenan plenas, también al final. «Grandi» es plural, no singular." },
  { code: "PRON-L-FINAL", priority: 1, what: "Convertir la l en «u»", example: "«auto» por alto", card: "La l italiana se pronuncia siempre. «Alto» y «auto» son palabras distintas." },
  { code: "PRON-R", priority: 2, what: "R inicial o doble gutural, a la brasileña", example: "«Homa» por Roma", card: "La r italiana es vibrante con la punta de la lengua, como en «pero» o «perro»." },
  // Gramática
  { code: "GRAM-CLITICO-OBJETO", priority: 2, what: "Omitir el pronombre de objeto o usar el de sujeto", example: "«ho visto» sin l', «vedo lui»", card: "El pronombre de objeto es obligatorio y va delante: «l'ho visto», «lo vedo»." },
  { code: "GRAM-AUX-ESSERE", priority: 2, what: "Avere con verbos de movimiento o cambio", example: "«ho andato»", card: "Movimiento o cambio de estado van con essere y el participio concuerda: «sono andato/a»." },
  { code: "GRAM-SUJETO-IO", priority: 3, what: "Poner «io» en casi todas las frases", example: "«io penso che io vado»", card: "El sujeto se omite salvo para contrastar, igual que en castellano." },
  { code: "GRAM-OPINION-SUBJ", priority: 2, what: "Indicativo tras verbos de opinión", example: "«credo che è»", card: "Tras credo, penso o mi sembra va subjuntivo: «credo che sia»." },
  { code: "GRAM-FUTURO-SUBJ", priority: 2, what: "Calcar el futuro de subjuntivo del portugués", example: "«quando fosse» por quando sarò", card: "Donde el portugués dice «quando eu for», el italiano usa futuro: «quando andrò»." },
  { code: "GRAM-FICAR", priority: 3, what: "Buscar un «ficar» que no existe", example: "«rimango contento» por sono contento", card: "«Ficar» no tiene un solo equivalente: stare, restare, diventare o trovarsi según el caso." },
  { code: "GRAM-ARTICULOS", priority: 2, what: "Errores con lo, gli, le", example: "«il uomo», «i studenti»", card: "Ante s + consonante, z, gn, ps y vocal: lo / gli. «Lo studente, gli studenti, l'uomo, gli uomini»." },
  { code: "GRAM-PREPOSICIONES", priority: 2, what: "a, in, da, di cambiadas", example: "«vado in casa di Marco», «vengo di Barcellona»", card: "A casa de alguien es «da»: «vado da Marco». Procedencia: «vengo da Barcellona»." },
  { code: "GRAM-CI-NE", priority: 3, what: "Evitar ci y ne", example: "«ho due» por ne ho due", card: "Ne sustituye a «de eso»: «ne voglio due». Ci sustituye a «allí»: «ci vado domani»." },
  // Falsos amigos
  { code: "FA-SQUISITO", priority: 1, what: "squisito = delicioso (no raro)", example: "«è squisito» para decir que es raro", card: "Squisito es delicioso. Raro se dice «strano»." },
  { code: "FA-GUARDARE", priority: 1, what: "guardare = mirar (no guardar)", example: "«guardo le chiavi» por metto via", card: "Guardare es mirar. Guardar algo se dice «mettere via» o «conservare»." },
  { code: "FA-PRENDERE", priority: 1, what: "prendere = coger, tomar", example: "confundirlo con arrestar", card: "Prendere es coger o tomar: «prendo un caffè». Arrestar es «arrestare»." },
  { code: "FA-CALDO", priority: 1, what: "caldo = calor, caliente", example: "«un caldo di pollo»", card: "Caldo es calor o caliente. El caldo de comer es «brodo»." },
  { code: "FA-BURRO", priority: 1, what: "burro = mantequilla", example: "usarlo como asno o tonto", card: "Burro es mantequilla. El animal es «asino»." },
  { code: "FA-SALIRE", priority: 1, what: "salire = subir", example: "«salgo di casa»", card: "Salire es subir. Salir es «uscire»: «esco di casa»." },
  { code: "FA-AVERE-FAME", priority: 2, what: "avere fame (no tenere)", example: "«tengo fame»", card: "Hambre, sed, frío o años van con avere: «ho fame», «ho trent'anni»." },
  { code: "FA-PRONTO", priority: 1, what: "pronto = ¿diga? / listo", example: "usarlo como rápido", card: "Pronto es «¿diga?» al teléfono o «listo». Rápido es «presto»." },
  { code: "FA-LARGO", priority: 1, what: "largo = ancho", example: "«una strada larga» pensando en larga", card: "Largo es ancho. Largo de longitud es «lungo»." },
  { code: "FA-CAMERA", priority: 1, what: "camera = habitación", example: "usarlo como cámara de fotos", card: "Camera es habitación. La cámara de fotos es «macchina fotografica»." },
];

export function interferencesForPrompt(): string {
  return INTERFERENCES.map((i) => `${i.code} (prioridad ${i.priority}): ${i.what}. Ej.: ${i.example}`).join("\n");
}

export function findInterference(code: string): Interference | undefined {
  return INTERFERENCES.find((i) => i.code === code);
}
