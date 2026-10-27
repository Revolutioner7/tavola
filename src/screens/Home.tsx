import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CHARACTERS, CharacterId } from "../brain/characters";
import { recentSessions, openErrors } from "../db";
import { syllablesPerMinute } from "../fluency";
import { colors, gap, radius } from "../theme";

type Props = {
  onStart: (id: CharacterId) => void;
  onMonologue: () => void;
  onErrors: () => void;
  onSettings: () => void;
};

export default function Home({ onStart, onMonologue, onErrors, onSettings }: Props) {
  const { weekCount, lastRate, minutesWeek, openCount } = useMemo(() => {
    const sessions = recentSessions(50);
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const week = sessions.filter((s) => new Date(s.started_at).getTime() > weekAgo);
    const last = sessions[0];
    return {
      weekCount: week.length,
      minutesWeek: Math.round(week.reduce((n, s) => n + s.user_seconds, 0) / 60),
      lastRate: last ? syllablesPerMinute(last.user_syllables, last.user_seconds) : 0,
      openCount: openErrors().length,
    };
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Tavola</Text>
      <Text style={styles.subtitle}>¿Con quién hablas hoy?</Text>

      <View style={styles.statsRow}>
        <Stat label="Sesiones esta semana" value={`${weekCount} / 3`} />
        <Stat label="Minutos hablados" value={`${minutesWeek}`} />
        <Stat label="Sílabas por minuto" value={lastRate ? `${lastRate}` : "–"} />
      </View>

      <Pressable style={({ pressed }) => [styles.drill, pressed && styles.pressed]} onPress={onMonologue}>
        <Text style={styles.drillTitle}>Cuéntaselo a Nonna</Text>
        <Text style={styles.drillText}>Cuenta lo mismo tres veces, cada vez más rápido: 2 minutos, 90 y 60 segundos.</Text>
      </Pressable>

      <Text style={styles.section}>Conversar</Text>
      {CHARACTERS.map((c) => (
        <Pressable key={c.id} style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => onStart(c.id)}>
          <View style={[styles.avatar, { backgroundColor: c.color }]}>
            <Text style={styles.avatarText}>{c.name.replace("Nonna ", "").replace("Zio ", "")[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {c.name} <Text style={styles.age}>· {c.age}</Text>
            </Text>
            <Text style={styles.tagline}>{c.tagline}</Text>
            <Text style={styles.difficulty}>{"●".repeat(c.difficulty) + "○".repeat(3 - c.difficulty)} dificultad</Text>
          </View>
        </Pressable>
      ))}

      <View style={styles.footer}>
        <Pressable style={styles.secondary} onPress={onErrors}>
          <Text style={styles.secondaryText}>Libro de errores ({openCount})</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onSettings}>
          <Text style={styles.secondaryText}>Mi nivel</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gap, paddingTop: 72, paddingBottom: 48, gap },
  brand: { fontSize: 40, fontWeight: "700", color: colors.accent, letterSpacing: -1 },
  subtitle: { fontSize: 18, color: colors.muted, marginTop: -8 },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius, padding: 12, borderWidth: 1, borderColor: colors.line },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  drill: { backgroundColor: colors.accent, borderRadius: radius, padding: 18, gap: 4 },
  drillTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  drillText: { color: "#fff", opacity: 0.9, fontSize: 14, lineHeight: 20 },
  section: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  card: { flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: colors.card, borderRadius: radius, padding: 16, borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.7 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "600", color: colors.ink },
  age: { fontWeight: "400", color: colors.muted },
  tagline: { fontSize: 14, color: colors.muted, marginTop: 2 },
  difficulty: { fontSize: 12, color: colors.accent, marginTop: 6 },
  footer: { flexDirection: "row", gap: 8, marginTop: 8 },
  secondary: { flex: 1, padding: 14, borderRadius: radius, borderWidth: 1, borderColor: colors.accent, alignItems: "center" },
  secondaryText: { color: colors.accent, fontWeight: "600" },
});
