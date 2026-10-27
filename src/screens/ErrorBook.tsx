import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { findInterference } from "../brain/interferences";
import { ErrorRow, openErrors, retireError, setErrorDoubt } from "../db";
import { colors, gap, radius } from "../theme";

export default function ErrorBook({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<ErrorRow[]>(openErrors());
  const refresh = () => setRows(openErrors());

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>‹ Inicio</Text>
      </Pressable>
      <Text style={styles.title}>Libro de errores</Text>
      <Text style={styles.subtitle}>Solo tus errores reales. Retíralos cuando ya no los cometas.</Text>

      {rows.length === 0 && <Text style={styles.empty}>Todavía no hay errores. Habla con algún personaje.</Text>}

      {rows.map((e) => {
        const info = findInterference(e.code);
        return (
          <View key={e.id} style={[styles.card, e.doubt ? { borderColor: colors.warn } : null]}>
            <Text style={styles.code}>{info?.what ?? e.code}</Text>
            <Text style={styles.said}>{e.said}</Text>
            <Text style={styles.correct}>{e.correct}</Text>
            {e.explanation ? <Text style={styles.body}>{e.explanation}</Text> : null}
            {e.doubt ? <Text style={styles.doubtNote}>Marcada como dudosa: pregúntaselo a Giulia.</Text> : null}
            <View style={styles.row}>
              <Pressable
                style={styles.ghost}
                onPress={() => {
                  setErrorDoubt(e.id, !e.doubt);
                  refresh();
                }}
              >
                <Text style={styles.ghostText}>{e.doubt ? "Ya no dudo" : "Dudo de esto"}</Text>
              </Pressable>
              <Pressable
                style={styles.ghost}
                onPress={() => {
                  retireError(e.id);
                  refresh();
                }}
              >
                <Text style={styles.ghostText}>Ya lo domino</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gap, paddingTop: 64, paddingBottom: 48, gap: 12 },
  back: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  title: { fontSize: 32, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted },
  empty: { color: colors.muted, marginTop: 24, textAlign: "center" },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 6, borderWidth: 1, borderColor: colors.line },
  code: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  said: { fontSize: 16, color: colors.danger, textDecorationLine: "line-through" },
  correct: { fontSize: 17, color: colors.ok, fontWeight: "700" },
  body: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  doubtNote: { fontSize: 13, color: colors.warn },
  row: { flexDirection: "row", gap: 8, marginTop: 6 },
  ghost: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.accent, padding: 10, alignItems: "center" },
  ghostText: { color: colors.accent, fontWeight: "600" },
});
