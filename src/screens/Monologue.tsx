import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { MONOLOGUE_TOPICS, monologueFixSystem } from "../brain/prompts";
import { callClaude, parseJson } from "../api";
import { MODEL_CONVERSATION } from "../config";
import { addMonologueRound, addUsefulPhrases } from "../db";
import { FluencyMetrics, fluencyFromWords, Word } from "../fluency";
import { colors, gap, radius } from "../theme";

const ROUND_SECONDS = [120, 90, 60];

type Phase = "intro" | "recording" | "fixing" | "fixes" | "results";
type Fix = { dijo: string; mejor: string };
type RoundResult = { metrics: FluencyMetrics; transcript: string };

export default function Monologue({ onBack }: { onBack: () => void }) {
  const [topic] = useState(() => MONOLOGUE_TOPICS[Math.floor(Math.random() * MONOLOGUE_TOPICS.length)]);
  const [runId] = useState(() => String(Date.now()));
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(0);
  const [remaining, setRemaining] = useState(ROUND_SECONDS[0]);
  const [liveText, setLiveText] = useState("");
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [usefulPhrase, setUsefulPhrase] = useState("");
  const [results, setResults] = useState<RoundResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Estado del reconocimiento dentro de una ronda (puede reiniciarse varias veces)
  const roundStart = useRef(0);
  const sessionOffset = useRef(0);
  const committedWords = useRef<Word[]>([]);
  const committedText = useRef("");
  const currentText = useRef("");
  const recording = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundRef = useRef(0);
  const resultsRef = useRef<RoundResult[]>([]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    ExpoSpeechRecognitionModule.abort();
  }, []);

  useSpeechRecognitionEvent("result", (event) => {
    const r = event.results[0];
    if (!r) return;
    currentText.current = r.transcript;
    setLiveText(`${committedText.current} ${r.transcript}`.trim());
    if (event.isFinal) {
      const words = (r.segments || []).map((s) => ({
        text: s.segment,
        start: s.startTimeMillis + sessionOffset.current,
        end: s.endTimeMillis + sessionOffset.current,
      }));
      committedWords.current.push(...words);
      committedText.current = `${committedText.current} ${r.transcript}`.trim();
      currentText.current = "";
    }
  });

  useSpeechRecognitionEvent("end", () => {
    // Si el iPhone corta el reconocimiento antes de tiempo, se reanuda sin que lo notes
    if (recording.current) startRecognizer();
    else finishRound();
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted" || event.error === "no-speech") return;
    setError(`El reconocimiento de voz ha fallado (${event.error}).`);
  });

  function startRecognizer() {
    sessionOffset.current = Date.now() - roundStart.current;
    ExpoSpeechRecognitionModule.start({
      lang: "it-IT",
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
    });
  }

  async function startRound(index: number) {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Micrófono", "Tavola necesita permiso de micrófono y de reconocimiento de voz. Actívalo en Ajustes del iPhone.");
      return;
    }
    setError(null);
    setRound(index);
    roundRef.current = index;
    setLiveText("");
    committedWords.current = [];
    committedText.current = "";
    currentText.current = "";
    roundStart.current = Date.now();
    recording.current = true;
    setRemaining(ROUND_SECONDS[index]);
    setPhase("recording");
    startRecognizer();

    timer.current = setInterval(() => {
      const left = ROUND_SECONDS[index] - Math.floor((Date.now() - roundStart.current) / 1000);
      setRemaining(Math.max(left, 0));
      if (left <= 0) stopRound();
    }, 250);
  }

  function stopRound() {
    if (!recording.current) return;
    recording.current = false;
    if (timer.current) clearInterval(timer.current);
    ExpoSpeechRecognitionModule.stop(); // el evento "end" llama a finishRound
  }

  async function finishRound() {
    const transcript = `${committedText.current} ${currentText.current}`.trim();
    const elapsed = (Date.now() - roundStart.current) / 1000;
    const metrics = fluencyFromWords(committedWords.current, elapsed, transcript);
    const index = roundRef.current;
    addMonologueRound({ runId, round: index + 1, topic, transcript, ...metrics });
    resultsRef.current = [...resultsRef.current, { metrics, transcript }];
    setResults(resultsRef.current);

    if (index === ROUND_SECONDS.length - 1) {
      setPhase("results");
      return;
    }
    if (index > 0) {
      // Solo se corrige tras la primera ronda; entre la segunda y la tercera se repite sin interrupciones
      setFixes([]);
      setPhase("fixes");
      return;
    }
    setPhase("fixing");
    try {
      const text = await callClaude({
        model: MODEL_CONVERSATION,
        systemStatic: monologueFixSystem(),
        messages: [{ role: "user", content: `Tema: ${topic}\n\nLo que dijo Rodrigo:\n${transcript || "(no se entendió nada)"}` }],
        maxTokens: 500,
      });
      const data = parseJson<{ arreglos: Fix[]; frase_util: string }>(text);
      setFixes((data.arreglos || []).slice(0, 3));
      setUsefulPhrase(data.frase_util || "");
      if (data.frase_util) addUsefulPhrases(0, [data.frase_util]);
    } catch (e: any) {
      setError(e?.message ?? "No se han podido preparar los arreglos.");
    }
    setPhase("fixes");
  }

  const nextSeconds = ROUND_SECONDS[round + 1];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable
        onPress={() => {
          recording.current = false;
          ExpoSpeechRecognitionModule.abort();
          onBack();
        }}
        hitSlop={12}
      >
        <Text style={styles.back}>‹ Inicio</Text>
      </Pressable>
      <Text style={styles.title}>Cuéntaselo a Nonna</Text>
      <Text style={styles.topic}>{topic}</Text>

      {phase === "intro" && (
        <>
          <Text style={styles.body}>
            Lo vas a contar tres veces: en 2 minutos, en 90 segundos y en 60. Entre la primera y la segunda verás tres cosas que arreglar. No te pares a buscar la palabra perfecta: si no te sale, dilo de otra manera y sigue.
          </Text>
          <Pressable style={styles.primary} onPress={() => startRound(0)}>
            <Text style={styles.primaryText}>Empezar (2 minutos)</Text>
          </Pressable>
        </>
      )}

      {phase === "recording" && (
        <>
          <Text style={styles.countdown}>
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </Text>
          <Text style={styles.roundLabel}>Ronda {round + 1} de 3</Text>
          <View style={styles.liveBox}>
            <Text style={styles.live}>{liveText || "Te escucho…"}</Text>
          </View>
          <Pressable style={styles.ghost} onPress={stopRound}>
            <Text style={styles.ghostText}>He terminado</Text>
          </Pressable>
        </>
      )}

      {phase === "fixing" && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Buscando lo más útil para la siguiente vez…</Text>
        </View>
      )}

      {phase === "fixes" && (
        <>
          <RoundSummary index={round} r={results[round]} />
          {fixes.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.label}>Para la siguiente vez</Text>
              {fixes.map((f, i) => (
                <View key={i} style={{ marginTop: 6 }}>
                  <Text style={styles.said}>{f.dijo}</Text>
                  <Text style={styles.correct}>{f.mejor}</Text>
                </View>
              ))}
              {usefulPhrase ? <Text style={[styles.body, { marginTop: 8 }]}>Te habría servido: {usefulPhrase}</Text> : null}
            </View>
          )}
          <Pressable style={styles.primary} onPress={() => startRound(round + 1)}>
            <Text style={styles.primaryText}>Otra vez, en {nextSeconds} segundos</Text>
          </Pressable>
        </>
      )}

      {phase === "results" && (
        <>
          <Text style={styles.body}>Así ha cambiado tu forma de hablar en las tres rondas:</Text>
          <View style={styles.card}>
            <View style={styles.tableRow}>
              <Text style={[styles.cell, styles.head]}>Ronda</Text>
              <Text style={[styles.cell, styles.head]}>Sílabas/min</Text>
              <Text style={[styles.cell, styles.head]}>Sílabas seguidas</Text>
              <Text style={[styles.cell, styles.head]}>Pausas/min</Text>
            </View>
            {results.map((r, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cell}>{ROUND_SECONDS[i]} s</Text>
                <Text style={styles.cell}>{r.metrics.speechRate || "–"}</Text>
                <Text style={styles.cell}>{r.metrics.meanRun || "–"}</Text>
                <Text style={styles.cell}>{r.metrics.pausesPerMinute || "–"}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>
            Lo normal es que en cada ronda hables más rápido, digas más sílabas seguidas y hagas menos pausas. Esa mejora es la que, repetida muchas veces, se convierte en soltura.
          </Text>
          <Pressable style={styles.primary} onPress={onBack}>
            <Text style={styles.primaryText}>Terminar</Text>
          </Pressable>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

function RoundSummary({ index, r }: { index: number; r?: RoundResult }) {
  if (!r) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Ronda {index + 1}</Text>
      <Text style={styles.body}>
        {r.metrics.speechRate || "–"} sílabas por minuto · {r.metrics.meanRun || "–"} sílabas seguidas de media · {r.metrics.words} palabras
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gap, paddingTop: 64, paddingBottom: 48, gap: 14 },
  back: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink },
  topic: { fontSize: 19, color: colors.accent, fontWeight: "600", lineHeight: 26 },
  body: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  muted: { color: colors.muted },
  countdown: { fontSize: 64, fontWeight: "700", color: colors.ink, textAlign: "center", fontVariant: ["tabular-nums"] },
  roundLabel: { textAlign: "center", color: colors.muted, marginTop: -8 },
  liveBox: { backgroundColor: colors.card, borderRadius: radius, padding: 16, minHeight: 140, borderWidth: 1, borderColor: colors.line },
  live: { fontSize: 17, color: colors.ink, lineHeight: 24 },
  loading: { alignItems: "center", gap: 8, padding: 24 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 4, borderWidth: 1, borderColor: colors.line },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  said: { fontSize: 16, color: colors.danger, textDecorationLine: "line-through" },
  correct: { fontSize: 17, color: colors.ok, fontWeight: "700" },
  tableRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  cell: { flex: 1, fontSize: 15, color: colors.ink, textAlign: "center" },
  head: { fontSize: 11, fontWeight: "700", color: colors.muted },
  note: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  error: { color: colors.danger },
  primary: { backgroundColor: colors.accent, borderRadius: radius, padding: 16, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghost: { borderRadius: radius, borderWidth: 1, borderColor: colors.accent, padding: 14, alignItems: "center" },
  ghostText: { color: colors.accent, fontWeight: "600", fontSize: 16 },
});
