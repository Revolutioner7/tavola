import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { callClaude, parseJson } from "../api";
import { MODEL_CONVERSATION } from "../config";
import { dueVocabAny, recordVocabResult, type VocabRow } from "../db";
import { speak, stopSpeaking } from "../tts";
import { colors, gap, radius } from "../theme";

/**
 * «Completa la frase»: para las palabras que no tienen imagen (sperare, comunque, magari…).
 * Una frase italiana con un hueco y cuatro opciones. Todo en italiano, sin traducciones.
 */

const ROUND_SIZE = 6;
const VOICE = "it-IT-Chirp3-HD-Kore";

type Item = { lemma: string; frase: string; risposta: string; opzioni: string[]; spiegazione: string };
type Question = Item & { row: VocabRow };

const SYSTEM = `Sei un insegnante di italiano per principianti (livello A1-A2). Prepari un esercizio "completa la frase". Scrivi SOLO in italiano: vietato tradurre o usare altre lingue.

Ti danno una lista di parole. Per ognuna crea un esercizio.

Restituisci solo questo JSON:
{"esercizi":[{"lemma":"","frase":"","risposta":"","opzioni":[],"spiegazione":""}]}

- lemma: la parola come te l'hanno data.
- frase: una frase breve (5-10 parole), quotidiana, di famiglia o di cucina, con ___ al posto della parola. Il contesto deve far capire bene quale parola manca.
- risposta: la parola esatta che va nel buco, nella forma giusta (coniugata o accordata).
- opzioni: 4 opzioni, tra cui la risposta. Le altre 3 sono parole dello stesso tipo e nella stessa forma (verbi coniugati uguali, ecc.), ma che nella frase non hanno senso. Niente sinonimi corretti.
- spiegazione: massimo 12 parole, italiano semplicissimo, perché è la parola giusta.`;

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

async function buildRound(rows: VocabRow[]): Promise<Question[]> {
  const text = await callClaude({
    model: MODEL_CONVERSATION,
    systemStatic: SYSTEM,
    messages: [{ role: "user", content: "Parole: " + rows.map((r) => r.lemma).join(", ") }],
    maxTokens: 1200,
  });
  const { esercizi } = parseJson<{ esercizi: Item[] }>(text);
  const out: Question[] = [];
  for (const e of esercizi ?? []) {
    const row = rows.find((r) => r.lemma === e.lemma.trim().toLowerCase()) ?? rows.find((r) => e.lemma.toLowerCase().includes(r.lemma));
    if (!row || !e.frase?.includes("___") || !e.risposta) continue;
    const opts = Array.from(new Set([e.risposta, ...(e.opzioni ?? [])])).slice(0, 4);
    if (opts.length < 2) continue;
    out.push({ ...e, opzioni: shuffle(opts), row });
  }
  return out;
}

export default function ClozeGame({ onBack }: { onBack: () => void }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const rows = shuffle(dueVocabAny(30)).slice(0, ROUND_SIZE);
    if (rows.length === 0) {
      setQuestions([]);
      return;
    }
    buildRound(rows)
      .then(setQuestions)
      .catch((e) => setError(String(e?.message ?? e)));
    return () => stopSpeaking();
  }, []);

  const q = questions?.[index];
  const finished = questions !== null && questions.length > 0 && index >= questions.length;

  function choose(option: string) {
    if (!q || chosen) return;
    setChosen(option);
    const ok = option === q.risposta;
    if (ok) setScore((s) => s + 1);
    recordVocabResult(q.row.id, ok);
    speak(q.frase.replace("___", q.risposta), { googleVoice: VOICE, rate: 0.9 });
  }

  function next() {
    stopSpeaking();
    setChosen(null);
    setIndex((i) => i + 1);
  }

  const header = (
    <>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>‹ Inicio</Text>
      </Pressable>
      <Text style={styles.title}>Completa la frase</Text>
    </>
  );

  if (error) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.emptyTitle}>No se ha podido preparar el juego</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <Pressable style={styles.primary} onPress={onBack}>
          <Text style={styles.primaryText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (questions === null) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.emptyText}>Preparo le frasi…</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.emptyTitle}>Todavía no hay palabras</Text>
        <Text style={styles.emptyText}>
          Aquí aparecerán las palabras que no sabías, las que dijiste mal y las que tocaste. Habla un rato con la familia y vuelve.
        </Text>
        <Pressable style={styles.primary} onPress={onBack}>
          <Text style={styles.primaryText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.doneTitle}>Brava! 🎉</Text>
        <Text style={styles.emptyText}>
          {score} su {questions.length} giuste
        </Text>
        <Pressable style={styles.primary} onPress={onBack}>
          <Text style={styles.primaryText}>Fine</Text>
        </Pressable>
      </View>
    );
  }

  const [before, after] = q!.frase.split("___");
  const ok = chosen === q!.risposta;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {header}
      <Text style={styles.progress}>
        {index + 1} / {questions.length}
      </Text>

      <View style={styles.sentenceCard}>
        <Text style={styles.sentence}>
          {before}
          <Text style={[styles.blank, chosen && { color: ok ? colors.ok : colors.danger }]}>{chosen ? q!.risposta : "_____"}</Text>
          {after}
        </Text>
      </View>

      <View style={styles.options}>
        {q!.opzioni.map((o) => {
          const isAnswer = o === q!.risposta;
          const isChosen = o === chosen;
          return (
            <Pressable
              key={o}
              onPress={() => choose(o)}
              style={[styles.option, chosen && isAnswer && styles.optionOk, isChosen && !isAnswer && styles.optionWrong]}
            >
              <Text style={styles.optionText}>{o}</Text>
            </Pressable>
          );
        })}
      </View>

      {chosen && (
        <View style={styles.feedback}>
          <Text style={[styles.verdict, { color: ok ? colors.ok : colors.danger }]}>{ok ? "Giusto! 👏" : "Quasi… 🤏"}</Text>
          {!!q!.spiegazione && <Text style={styles.explain}>{q!.spiegazione}</Text>}
          <Pressable onPress={() => speak(q!.frase.replace("___", q!.risposta), { googleVoice: VOICE, rate: 0.8 })} hitSlop={8}>
            <Text style={styles.listen}>🔊 Ascolta</Text>
          </Pressable>
          <Pressable style={styles.primary} onPress={next}>
            <Text style={styles.primaryText}>Avanti</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  content: { padding: gap, paddingTop: 64, paddingBottom: 48, gap: 16 },
  back: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink },
  progress: { fontSize: 14, color: colors.muted, marginTop: -8 },
  sentenceCard: { backgroundColor: colors.card, borderRadius: radius, padding: 20, borderWidth: 1, borderColor: colors.line },
  sentence: { fontSize: 22, lineHeight: 32, color: colors.ink },
  blank: { fontWeight: "700", color: colors.accent },
  options: { gap: 10 },
  option: { padding: 16, borderRadius: radius, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.card, alignItems: "center" },
  optionOk: { borderColor: colors.ok, backgroundColor: "#E3F1E4" },
  optionWrong: { borderColor: colors.danger, backgroundColor: "#F8E1E1" },
  optionText: { fontSize: 18, fontWeight: "600", color: colors.ink },
  feedback: { gap: 10, alignItems: "center" },
  verdict: { fontSize: 22, fontWeight: "700" },
  explain: { fontSize: 16, color: colors.ink, textAlign: "center", lineHeight: 22 },
  listen: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  primary: { backgroundColor: colors.accent, borderRadius: radius, padding: 16, alignItems: "center", alignSelf: "stretch" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  doneTitle: { fontSize: 32, fontWeight: "700", color: colors.ink },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: colors.ink, textAlign: "center" },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22 },
});
