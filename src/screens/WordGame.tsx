import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { dueVocab, recordVocabResult, type VocabRow } from "../db";
import { speak, stopSpeaking } from "../tts";
import { colors, gap, radius } from "../theme";

/**
 * Juego de emparejar: palabras italianas con su imagen o emoji. Sin traducciones.
 * Usa las palabras que no sabías, las que dijiste mal y las que tocaste en las conversaciones.
 * Cada acierto aleja el siguiente repaso de esa palabra; un fallo la vuelve a traer pronto.
 */

const ROUND_SIZE = 4;
const VOICE = "it-IT-Chirp3-HD-Kore";

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export default function WordGame({ onBack }: { onBack: () => void }) {
  const [pool] = useState<VocabRow[]>(() => shuffle(dueVocab(40)));
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null); // id de la palabra elegida
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null); // id de la imagen fallada
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [score, setScore] = useState({ ok: 0, total: 0 });

  const words = useMemo(() => pool.slice(round * ROUND_SIZE, round * ROUND_SIZE + ROUND_SIZE), [pool, round]);
  const pictures = useMemo(() => shuffle(words), [words]);
  const roundDone = words.length > 0 && matched.size === words.length;
  const finished = words.length === 0 || (roundDone && (round + 1) * ROUND_SIZE >= pool.length);

  useEffect(() => () => stopSpeaking(), []);

  function say(w: VocabRow) {
    speak(w.lemma, { googleVoice: VOICE, rate: 0.9 });
  }

  function pickWord(w: VocabRow) {
    if (matched.has(w.id)) return;
    setSelected(w.id);
    say(w);
  }

  function pickPicture(p: VocabRow) {
    if (selected === null || matched.has(p.id)) return;
    if (p.id === selected) {
      const next = new Set(matched);
      next.add(p.id);
      setMatched(next);
      // Solo cuenta como acierto si no la habías fallado antes en esta ronda
      const firstTry = !missed.has(p.id);
      recordVocabResult(p.id, firstTry);
      setScore((s) => ({ ok: s.ok + (firstTry ? 1 : 0), total: s.total + 1 }));
      setSelected(null);
    } else {
      setWrong(p.id);
      setMissed((m) => new Set(m).add(selected));
      setTimeout(() => setWrong(null), 600);
    }
  }

  function nextRound() {
    setRound((r) => r + 1);
    setMatched(new Set());
    setMissed(new Set());
    setSelected(null);
  }

  if (pool.length < 2) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.emptyTitle}>Todavía no hay palabras</Text>
        <Text style={styles.emptyText}>
          Aquí aparecerán las palabras que no sabías, las que dijiste mal y las que tocaste en las conversaciones. Habla un rato con la familia y vuelve.
        </Text>
        <Pressable style={styles.primary} onPress={onBack}>
          <Text style={styles.primaryText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>‹ Inicio</Text>
      </Pressable>
      <Text style={styles.title}>Abbina le parole</Text>
      <Text style={styles.subtitle}>Tocca una parola, ascoltala, poi tocca la sua immagine.</Text>

      {!finished && (
        <>
          <View style={styles.wordsRow}>
            {words.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => pickWord(w)}
                style={[styles.word, selected === w.id && styles.wordSelected, matched.has(w.id) && styles.wordDone]}
              >
                <Text style={[styles.wordText, matched.has(w.id) && { color: colors.ok }]}>{w.lemma}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.grid}>
            {pictures.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => pickPicture(p)}
                style={[styles.card, matched.has(p.id) && styles.cardDone, wrong === p.id && styles.cardWrong]}
              >
                {p.image_url ? <Image source={{ uri: p.image_url }} style={styles.img} /> : <Text style={styles.emoji}>{p.emoji}</Text>}
                {matched.has(p.id) && <Text style={styles.cardLabel}>{p.lemma}</Text>}
              </Pressable>
            ))}
          </View>

          {roundDone && (
            <Pressable style={styles.primary} onPress={nextRound}>
              <Text style={styles.primaryText}>Avanti</Text>
            </Pressable>
          )}
        </>
      )}

      {finished && (
        <View style={styles.done}>
          <Text style={styles.doneTitle}>Brava! 🎉</Text>
          <Text style={styles.doneText}>
            {score.ok} su {score.total} al primo colpo
          </Text>
          <Pressable style={styles.primary} onPress={onBack}>
            <Text style={styles.primaryText}>Fine</Text>
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
  subtitle: { fontSize: 15, color: colors.muted, marginTop: -8 },
  wordsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  word: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.card },
  wordSelected: { backgroundColor: colors.accentSoft },
  wordDone: { borderColor: colors.ok, opacity: 0.6 },
  wordText: { fontSize: 18, fontWeight: "600", color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47%", aspectRatio: 1, borderRadius: radius, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardDone: { borderColor: colors.ok },
  cardWrong: { borderColor: colors.danger, backgroundColor: "#F8E1E1" },
  img: { width: "100%", height: "100%" },
  emoji: { fontSize: 64 },
  cardLabel: { position: "absolute", bottom: 8, backgroundColor: "rgba(255,255,255,0.9)", paddingHorizontal: 8, borderRadius: 8, fontWeight: "700", color: colors.ok },
  primary: { backgroundColor: colors.accent, borderRadius: radius, padding: 16, alignItems: "center", alignSelf: "stretch" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  done: { alignItems: "center", gap: 12, marginTop: 24 },
  doneTitle: { fontSize: 32, fontWeight: "700", color: colors.ink },
  doneText: { fontSize: 18, color: colors.muted },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: colors.ink, textAlign: "center" },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22 },
});
