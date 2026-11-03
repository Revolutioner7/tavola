import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CharacterId, getCharacter } from "../brain/characters";
import { HITOS, STEPS, currentIndex } from "../brain/path";
import { completedTappe } from "../db";
import { colors, gap, radius } from "../theme";

/**
 * El recorrido completo con la familia de Giulia: los diez hitos, del primero al último.
 * Los superados en verde, el actual abierto con sus dos pasos, los siguientes con candado.
 */
export default function Journey({ onBack, onStart }: { onBack: () => void; onStart: (id: CharacterId, stepId: string) => void }) {
  const { done, current } = useMemo(() => {
    const d = completedTappe();
    return { done: d, current: currentIndex(d) };
  }, []);
  const currentStep = STEPS[current];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>‹ Inicio</Text>
      </Pressable>
      <Text style={styles.title}>La famiglia di Giulia</Text>
      <Text style={styles.subtitle}>Diez situaciones reales, de una videollamada de 30 segundos a una tarde con la abuela. Cada hito tiene un entrenamiento y una prueba.</Text>

      {HITOS.map((h, i) => {
        const hDone = h.steps.every((s) => done.has(s.id));
        const isCurrent = !!currentStep && h.steps.some((s) => s.id === currentStep.id);
        const locked = !hDone && !isCurrent;
        return (
          <View key={h.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, hDone && { backgroundColor: colors.ok }, isCurrent && { backgroundColor: colors.accent }]}>
                <Text style={styles.dotText}>{hDone ? "✓" : locked ? "🔒" : h.emoji}</Text>
              </View>
              {i < HITOS.length - 1 && <View style={[styles.line, hDone && { backgroundColor: colors.ok }]} />}
            </View>
            <View style={[styles.card, isCurrent && styles.cardCurrent, locked && styles.cardLocked]}>
              <Text style={styles.num}>Hito {i + 1}</Text>
              <Text style={styles.hitoTitle}>{h.title}</Text>
              <Text style={styles.situation}>{h.situation}</Text>
              {isCurrent &&
                h.steps.map((s) => {
                  const sDone = done.has(s.id);
                  const sCurrent = s.id === currentStep.id;
                  const who = s.cast.map((c) => getCharacter(c).name).join(", ");
                  const body = (
                    <View style={[styles.step, sCurrent && styles.stepCurrent, !sDone && !sCurrent && { opacity: 0.5 }]}>
                      <Text style={styles.stepKind}>
                        {sDone ? "✓ " : ""}
                        {s.kind === "prep" ? "Entrenamiento" : "Prueba del hito"} · {who}
                      </Text>
                      <Text style={styles.stepTitle}>
                        {s.emoji} {s.title}
                      </Text>
                      {sCurrent && <Text style={styles.stepMission}>{s.mission}</Text>}
                      {sCurrent && <Text style={styles.go}>Empezar ›</Text>}
                    </View>
                  );
                  return sCurrent ? (
                    <Pressable key={s.id} onPress={() => onStart(s.cast[0], s.id)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                      {body}
                    </Pressable>
                  ) : (
                    <View key={s.id}>{body}</View>
                  );
                })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gap, paddingTop: 64, paddingBottom: 48 },
  back: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink, marginTop: 12 },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 21, marginTop: 4, marginBottom: 20 },
  row: { flexDirection: "row", gap: 12 },
  rail: { alignItems: "center", width: 40 },
  dot: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.line, alignItems: "center", justifyContent: "center" },
  dotText: { fontSize: 18, color: "#fff", fontWeight: "700" },
  line: { flex: 1, width: 3, backgroundColor: colors.line, marginVertical: 2 },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.line, marginBottom: 14 },
  cardCurrent: { borderWidth: 2, borderColor: colors.accent },
  cardLocked: { opacity: 0.55 },
  num: { fontSize: 12, fontWeight: "700", color: colors.accent, textTransform: "uppercase", letterSpacing: 0.5 },
  hitoTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  situation: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  step: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 2 },
  stepCurrent: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft },
  stepKind: { fontSize: 12, fontWeight: "700", color: colors.muted },
  stepTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  stepMission: { fontSize: 14, color: colors.ink, lineHeight: 20, marginTop: 4 },
  go: { fontSize: 15, fontWeight: "700", color: colors.accent, marginTop: 6 },
});
