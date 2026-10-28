import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getSetting, setSetting } from "../db";
import { hasGoodItalianVoice } from "../voice";
import { colors, gap, radius } from "../theme";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export default function Settings({ onBack }: { onBack: () => void }) {
  const [listening, setListening] = useState(getSetting("level_listening", "A1 (estimado)").slice(0, 2));
  const [speaking, setSpeaking] = useState(getSetting("level_speaking", "A1 (estimado)").slice(0, 2));

  const [goodVoice, setGoodVoice] = useState(true);
  useEffect(() => {
    hasGoodItalianVoice().then(setGoodVoice);
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>‹ Inicio</Text>
      </Pressable>
      <Text style={styles.title}>Mi nivel</Text>
      <Text style={styles.subtitle}>
        Hasta que esté la prueba de nivel, elige a ojo. Los personajes ajustan su italiano a tu nivel de escucha.
      </Text>

      <LevelPicker
        label="Escuchar"
        value={listening}
        onChange={(v) => {
          setListening(v);
          setSetting("level_listening", v);
        }}
      />
      <LevelPicker
        label="Hablar"
        value={speaking}
        onChange={(v) => {
          setSpeaking(v);
          setSetting("level_speaking", v);
        }}
      />

      <View style={[styles.card, !goodVoice && { borderColor: colors.accent }]}>
        <Text style={styles.label}>Voz de los personajes</Text>
        <Text style={styles.subtitle}>
          {goodVoice
            ? "Tienes instalada una voz italiana de buena calidad. Tavola la usa automáticamente."
            : "Ahora los personajes usan la voz básica del iPhone, que suena a robot. Descarga gratis una voz mejor:"}
        </Text>
        <Text style={styles.subtitle}>
          Ajustes del iPhone → Accesibilidad → Contenido leído → Voces → Italiano. Descarga las que pongan «Premium» (o «Mejorada»), una de mujer y una de hombre. Después cierra Tavola del todo y vuelve a abrirla.
        </Text>
      </View>
    </ScrollView>
  );
}

function LevelPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {LEVELS.map((l) => (
          <Pressable key={l} style={[styles.chip, value === l && styles.chipOn]} onPress={() => onChange(l)}>
            <Text style={[styles.chipText, value === l && { color: "#fff" }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gap, paddingTop: 64, paddingBottom: 48, gap: 12 },
  back: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  title: { fontSize: 32, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  label: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  row: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.accent, alignItems: "center" },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.accent, fontWeight: "700" },
});
