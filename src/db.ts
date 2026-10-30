import * as SQLite from "expo-sqlite";
import { CharacterId } from "./brain/characters";

// Todos los datos viven en el propio iPhone.
const db = SQLite.openDatabaseSync("tavola.db");

try {
  db.execSync("PRAGMA journal_mode = WAL;");
} catch {}

db.execSync(`
  CREATE TABLE IF NOT EXISTS path_progress (
    tappa_id TEXT PRIMARY KEY,
    completed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS character_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    user_seconds REAL DEFAULT 0,
    user_syllables INTEGER DEFAULT 0,
    user_words INTEGER DEFAULT 0,
    transcript TEXT
  );
  CREATE TABLE IF NOT EXISTS errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    code TEXT NOT NULL,
    said TEXT NOT NULL,
    correct TEXT NOT NULL,
    explanation TEXT,
    confidence TEXT,
    doubt INTEGER DEFAULT 0,
    retired INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS useful_phrases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS vocab (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lemma TEXT NOT NULL UNIQUE,
    emoji TEXT,
    image_url TEXT,
    explanation TEXT,
    source TEXT,
    correct INTEGER DEFAULT 0,
    seen INTEGER DEFAULT 0,
    due_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS looked_up_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lemma TEXT NOT NULL,
    sentence TEXT,
    emoji TEXT,
    explanation TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS monologues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    topic TEXT NOT NULL,
    seconds REAL,
    syllables INTEGER,
    words INTEGER,
    speech_rate INTEGER,
    mean_run REAL,
    pauses_per_minute REAL,
    transcript TEXT,
    created_at TEXT NOT NULL
  );
`);

const now = () => new Date().toISOString();

// Palabras que Rodrigo ha tocado para entenderlas (para repasarlas más adelante)
export function saveLookedUpWord(lemma: string, sentence: string, emoji: string, explanation: string) {
  db.runSync("INSERT INTO looked_up_words (lemma, sentence, emoji, explanation, created_at) VALUES (?, ?, ?, ?, ?)", [lemma, sentence, emoji, explanation, now()]);
}

// Vocabulario para el juego de las palabras: las que no sabías, las que dijiste mal y las que tocaste
export type VocabRow = { id: number; lemma: string; emoji: string | null; image_url: string | null; explanation: string | null; correct: number; seen: number };

export function addVocab(w: { lemma: string; emoji?: string; imageUrl?: string; explanation?: string; source: string }) {
  const lemma = w.lemma.trim().toLowerCase();
  if (!lemma) return;
  db.runSync(
    `INSERT INTO vocab (lemma, emoji, image_url, explanation, source, due_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(lemma) DO UPDATE SET
       emoji = COALESCE(NULLIF(excluded.emoji, ''), vocab.emoji),
       image_url = COALESCE(NULLIF(excluded.image_url, ''), vocab.image_url),
       explanation = COALESCE(NULLIF(excluded.explanation, ''), vocab.explanation),
       due_at = MIN(vocab.due_at, excluded.due_at)`,
    [lemma, w.emoji ?? "", w.imageUrl ?? "", w.explanation ?? "", w.source, now(), now()]
  );
}

/** Palabras que tocan repasar ahora (con imagen o emoji para poder emparejarlas). */
export function dueVocab(limit = 20): VocabRow[] {
  return db.getAllSync<VocabRow>(
    `SELECT id, lemma, emoji, image_url, explanation, correct, seen FROM vocab
     WHERE due_at <= ? AND (COALESCE(emoji, '') <> '' OR COALESCE(image_url, '') <> '')
     ORDER BY due_at ASC LIMIT ?`,
    [now(), limit]
  );
}

export function dueVocabCount(): number {
  return dueVocab(200).length;
}

/** Todas las palabras que tocan repasar, tengan imagen o no (para «Completa la frase»). */
export function dueVocabAny(limit = 20): VocabRow[] {
  return db.getAllSync<VocabRow>(
    `SELECT id, lemma, emoji, image_url, explanation, correct, seen FROM vocab
     WHERE due_at <= ? ORDER BY due_at ASC LIMIT ?`,
    [now(), limit]
  );
}

export function dueVocabAnyCount(): number {
  return db.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM vocab WHERE due_at <= ?", [now()])?.n ?? 0;
}

/** Espaciado: cada acierto seguido aleja el siguiente repaso; un fallo lo trae a dentro de 10 minutos. */
const INTERVALS_HOURS = [0.17, 24, 72, 168, 504, 1440];
export function recordVocabResult(id: number, ok: boolean) {
  const row = db.getFirstSync<{ correct: number }>("SELECT correct FROM vocab WHERE id = ?", [id]);
  const streak = ok ? (row?.correct ?? 0) + 1 : 0;
  const hours = ok ? INTERVALS_HOURS[Math.min(streak, INTERVALS_HOURS.length - 1)] : INTERVALS_HOURS[0];
  const due = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  db.runSync("UPDATE vocab SET correct = ?, seen = seen + 1, due_at = ? WHERE id = ?", [streak, due, id]);
}

// Monólogos 4/3/2 ("Cuéntaselo a Nonna")
export function addMonologueRound(r: {
  runId: string;
  round: number;
  topic: string;
  seconds: number;
  syllables: number;
  words: number;
  speechRate: number;
  meanRun: number;
  pausesPerMinute: number;
  transcript: string;
}) {
  db.runSync(
    `INSERT INTO monologues (run_id, round, topic, seconds, syllables, words, speech_rate, mean_run, pauses_per_minute, transcript, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [r.runId, r.round, r.topic, r.seconds, r.syllables, r.words, r.speechRate, r.meanRun, r.pausesPerMinute, r.transcript, now()]
  );
}
export function monologueCountThisWeek(): number {
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  return db.getFirstSync<{ n: number }>("SELECT COUNT(DISTINCT run_id) AS n FROM monologues WHERE created_at > ?", [weekAgo])?.n ?? 0;
}

// Ajustes
export function getSetting(key: string, fallback: string): string {
  const row = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? fallback;
}
export function setSetting(key: string, value: string) {
  db.runSync("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
}

// Lo que los personajes saben de Rodrigo
export function getUserFacts(limit = 30): string[] {
  return db
    .getAllSync<{ text: string }>("SELECT text FROM user_facts ORDER BY id DESC LIMIT ?", [limit])
    .map((r) => r.text)
    .reverse();
}
export function addUserFacts(facts: string[]) {
  for (const f of facts) {
    const text = f.trim();
    if (text) db.runSync("INSERT INTO user_facts (text, created_at) VALUES (?, ?)", [text, now()]);
  }
}

// Memoria de cada personaje
export function getCharacterMemory(id: CharacterId, limit = 8): string[] {
  return db
    .getAllSync<{ summary: string; created_at: string }>(
      "SELECT summary, created_at FROM character_memory WHERE character_id = ? ORDER BY id DESC LIMIT ?",
      [id, limit]
    )
    .reverse()
    .map((r) => `${r.created_at.slice(0, 10)}: ${r.summary}`);
}
export function addCharacterMemory(id: CharacterId, summary: string) {
  if (summary.trim()) db.runSync("INSERT INTO character_memory (character_id, summary, created_at) VALUES (?, ?, ?)", [id, summary.trim(), now()]);
}

// Sesiones
export function startSession(id: CharacterId): number {
  const r = db.runSync("INSERT INTO sessions (character_id, started_at) VALUES (?, ?)", [id, now()]);
  return Number(r.lastInsertRowId);
}
export function finishSession(sessionId: number, stats: { seconds: number; syllables: number; words: number; transcript: string }) {
  db.runSync(
    "UPDATE sessions SET ended_at = ?, user_seconds = ?, user_syllables = ?, user_words = ?, transcript = ? WHERE id = ?",
    [now(), stats.seconds, stats.syllables, stats.words, stats.transcript, sessionId]
  );
}
export type SessionRow = { id: number; character_id: string; started_at: string; user_seconds: number; user_syllables: number; user_words: number };
export function recentSessions(limit = 20): SessionRow[] {
  return db.getAllSync<SessionRow>(
    "SELECT id, character_id, started_at, user_seconds, user_syllables, user_words FROM sessions WHERE ended_at IS NOT NULL ORDER BY id DESC LIMIT ?",
    [limit]
  );
}

// Libro de errores
export type ErrorRow = { id: number; code: string; said: string; correct: string; explanation: string; confidence: string; doubt: number; retired: number; created_at: string };
export function addError(sessionId: number, e: { code: string; said: string; correct: string; explanation: string; confidence: string }) {
  db.runSync(
    "INSERT INTO errors (session_id, code, said, correct, explanation, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [sessionId, e.code || "OTRO", e.said, e.correct, e.explanation, e.confidence, now()]
  );
}
export function openErrors(limit = 200): ErrorRow[] {
  return db.getAllSync<ErrorRow>("SELECT * FROM errors WHERE retired = 0 ORDER BY id DESC LIMIT ?", [limit]);
}
export function errorCountByCode(code: string): number {
  return db.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM errors WHERE code = ?", [code])?.n ?? 0;
}
export function setErrorDoubt(id: number, doubt: boolean) {
  db.runSync("UPDATE errors SET doubt = ? WHERE id = ?", [doubt ? 1 : 0, id]);
}
export function retireError(id: number) {
  db.runSync("UPDATE errors SET retired = 1 WHERE id = ?", [id]);
}
export function errorBookForPrompt(limit = 15): string[] {
  return db
    .getAllSync<{ code: string; said: string; correct: string }>(
      "SELECT code, said, correct FROM errors WHERE retired = 0 AND doubt = 0 ORDER BY id DESC LIMIT ?",
      [limit]
    )
    .map((e) => `${e.code}: «${e.said}» → «${e.correct}»`);
}

// Frases útiles
export function addUsefulPhrases(sessionId: number, phrases: string[]) {
  for (const p of phrases) if (p.trim()) db.runSync("INSERT INTO useful_phrases (session_id, text, created_at) VALUES (?, ?, ?)", [sessionId, p.trim(), now()]);
}
export function recentPhrases(limit = 50): string[] {
  return db.getAllSync<{ text: string }>("SELECT text FROM useful_phrases ORDER BY id DESC LIMIT ?", [limit]).map((r) => r.text);
}

// Recorrido: etapas superadas
export function completedTappe(): Set<string> {
  return new Set(db.getAllSync<{ tappa_id: string }>("SELECT tappa_id FROM path_progress").map((r) => r.tappa_id));
}

export function completeTappa(id: string) {
  db.runSync("INSERT OR IGNORE INTO path_progress (tappa_id, completed_at) VALUES (?, ?)", [id, now()]);
}
