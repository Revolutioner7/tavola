import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getCharacter } from "../brain/characters";
import { characterUnlockedBy, getTappa } from "../brain/path";
import { findInterference } from "../brain/interferences";
import { debriefSystem, debriefUserMessage } from "../brain/prompts";
import { callClaude, parseJson } from "../api";
import { MODEL_DEBRIEF } from "../config";
import {
  addCharacterMemory,
  addError,
  addUsefulPhrases,
  addUserFacts,
  completeTappa,
  errorBookForPrompt,
  errorCountByCode,
  finishSession,
} from "../db";
import { syllablesPerMinute } from "../fluency";
import { colors, gap, radius } from "../theme";
import type { ConversationResult } from "./Conversation";

type DebriefError = { dijo: string; correcto: string; codigo: string; explicacion: string; seguridad: "alta" | "dudosa" };
type DebriefData = {
  errores: DebriefError[];
  bien: string;
  frases_utiles: string[];
  datos_nuevos_usuario: string[];
  resumen_personaje: string;
  mision?: { cumplida: boolean; comentario: string };
};

type Props = {
  result: ConversationResult;
  onRepeat: () => void;
  onHome: () => void;
  onNext: () => void;
};

export default function Debrief({ result, onRepeat, onHome, onNext }: Props) {
  const character = getCharacter(result.characterId);
  const tappa = getTappa(result.tappaId);
  const [data, setData] = useState<DebriefData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transcript = result.messages
    .map((m) => `${m.role === "user" ? "Rodrigo" : character.name}: ${m.content.replace("\n\n[QUEDA POCO]", "")}`)
    .join("\n");

  async function run() {
    setError(null);
    try {
      const text = await callClaude({
        model: MODEL_DEBRIEF,
        systemStatic: debriefSystem(tappa),
        messages: [{ role: "user", content: debriefUserMessage({ characterName: character.name, transcript, errorBook: errorBookForPrompt() }) }],
        maxTokens: 1200,
      });
      const parsed = parseJson<DebriefData>(text);
      parsed.errores = (parsed.errores || []).filter((e) => e.dijo && e.correcto).slice(0, 3);

      // Guardar: sesión, errores, frases, memoria
      finishSession(result.sessionId, { seconds: result.userSeconds, syllables: result.userSyllables, words: result.userWords, transcript });
      for (const e of parsed.errores) {
        addError(result.sessionId, { code: e.codigo, said: e.dijo, correct: e.correcto, explanation: e.explicacion, confidence: e.seguridad });
      }
      addUsefulPhrases(result.sessionId, parsed.frases_utiles || []);
      addUserFacts(parsed.datos_nuevos_usuario || []);
      addCharacterMemory(result.characterId, parsed.resumen_personaje || "");
      if (tappa && parsed.mision?.cumplida) completeTappa(tappa.id);
      setData(parsed);
    } catch (e: any) {
      setError(e?.message ?? "No se ha podido hacer el repaso.");
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minutes = (result.userSeconds / 60).toFixed(1);
  const rate = syllablesPerMinute(result.userSyllables, result.userSeconds);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Repaso</Text>
      <Text style={styles.subtitle}>Tu conversación con {character.name}</Text>

      <View style={styles.statsRow}>
        <Stat label="Minutos hablando tú" value={minutes} />
        <Stat label="Sílabas por minuto" value={rate ? String(rate) : "–"} />
        <Stat label="Palabras" value={String(result.userWords)} />
      </View>

      {!data && !error && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Revisando lo que has dicho…</Text>
        </View>
      )}

      {error && (
        <View style={styles.card}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.ghost} onPress={run}>
            <Text style={styles.ghostText}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {data && tappa && data.mision && (
        <View style={[styles.card, styles.missionCard, data.mision.cumplida ? styles.missionOk : styles.missionNo]}>
          <Text style={styles.missionTitle}>
            {data.mision.cumplida ? `🎉 Etapa superada: ${tappa.title}` : `🤏 Casi: ${tappa.title}`}
          </Text>
          {!!data.mision.comentario && <Text style={styles.body}>{data.mision.comentario}</Text>}
          {data.mision.cumplida && characterUnlockedBy(tappa.id) && (
            <Text style={styles.unlock}>Nuevo personaje en tu mesa: {getCharacter(characterUnlockedBy(tappa.id)!).name}</Text>
          )}
        </View>
      )}

      {data && (
        <>
          {data.bien ? (
            <View style={[styles.card, { borderLeftColor: colors.ok, borderLeftWidth: 4 }]}>
              <Text style={styles.label}>Lo que hiciste bien</Text>
              <Text style={styles.body}>{data.bien}</Text>
            </View>
          ) : null}

          {data.errores.length === 0 && (
            <View style={styles.card}>
              <Text style={styles.body}>Nada importante que corregir esta vez.</Text>
            </View>
          )}

          {data.errores.map((e, i) => {
            const repeated = errorCountByCode(e.codigo) >= 3;
            const card = repeated ? findInterference(e.codigo)?.card : undefined;
            return (
              <View key={i} style={styles.card}>
                <View style={styles.errorHead}>
                  <Text style={styles.label}>Para decirlo mejor</Text>
                  {e.seguridad === "dudosa" && <Text style={styles.doubt}>corrección dudosa</Text>}
                </View>
                <Text style={styles.said}>{e.dijo}</Text>
                <Text style={styles.correct}>{e.correcto}</Text>
                <Text style={styles.body}>{e.explicacion}</Text>
                {card && (
                  <View style={styles.contrast}>
                    <Text style={styles.contrastLabel}>Se repite: regla rápida</Text>
                    <Text style={styles.body}>{card}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {data.frases_utiles?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.label}>Frases para quedarte</Text>
              {data.frases_utiles.map((f, i) => (
                <Text key={i} style={styles.phrase}>
                  {f}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.note}>
            Las correcciones las hace una IA y pueden equivocarse. Si una te suena rara, márcala como dudosa en el libro de errores y pregúntaselo a Giulia.
          </Text>

          {tappa && data.mision?.cumplida ? (
            <Pressable style={styles.primary} onPress={onNext}>
              <Text style={styles.primaryText}>Ver mi recorrido</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primary} onPress={onRepeat}>
              <Text style={styles.primaryText}>{tappa ? "Intentar la etapa otra vez" : "Repetir la conversación"}</Text>
            </Pressable>
          )}
          <Pressable style={styles.ghost} onPress={onHome}>
            <Text style={styles.ghostText}>Volver al inicio</Text>
          </Pressable>
        </>
      )}
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
  content: { padding: gap, paddingTop: 72, paddingBottom: 48, gap: 12 },
  title: { fontSize: 32, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: -6 },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius, padding: 12, borderWidth: 1, borderColor: colors.line },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  loading: { alignItems: "center", gap: 8, padding: 24 },
  muted: { color: colors.muted },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 6, borderWidth: 1, borderColor: colors.line },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  body: { fontSize: 15, lineHeight: 21, color: colors.ink },
  errorHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  doubt: { fontSize: 12, color: colors.warn, fontWeight: "600" },
  said: { fontSize: 17, color: colors.danger, textDecorationLine: "line-through" },
  correct: { fontSize: 18, color: colors.ok, fontWeight: "700" },
  contrast: { marginTop: 6, backgroundColor: colors.accentSoft, borderRadius: 12, padding: 12, gap: 4 },
  contrastLabel: { fontSize: 12, fontWeight: "700", color: colors.accent },
  phrase: { fontSize: 17, color: colors.ink, paddingVertical: 2 },
  missionCard: { borderWidth: 2 },
  missionOk: { borderColor: colors.ok },
  missionNo: { borderColor: colors.warn },
  missionTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  unlock: { fontSize: 15, fontWeight: "700", color: colors.accent, marginTop: 4 },
  note: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  errorText: { color: colors.danger },
  primary: { backgroundColor: colors.accent, borderRadius: radius, padding: 16, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghost: { borderRadius: radius, borderWidth: 1, borderColor: colors.accent, padding: 14, alignItems: "center" },
  ghostText: { color: colors.accent, fontWeight: "600", fontSize: 16 },
});
