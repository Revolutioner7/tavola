import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionResultSegment,
} from "expo-speech-recognition";
import { CharacterId, getCharacter } from "../brain/characters";
import { conversationSystemDynamic, conversationSystemStatic, TaskType } from "../brain/prompts";
import { callClaude, ChatMessage } from "../api";
import { MODEL_CONVERSATION, WRAP_UP_MINUTES } from "../config";
import { getCharacterMemory, getSetting, getUserFacts, startSession } from "../db";
import { countSyllables, countWords, turnSeconds } from "../fluency";
import { colors, gap, radius } from "../theme";

export type ConversationResult = {
  sessionId: number;
  characterId: CharacterId;
  messages: ChatMessage[];
  userSeconds: number;
  userSyllables: number;
  userWords: number;
};

type Props = {
  characterId: CharacterId;
  onFinish: (result: ConversationResult) => void;
  onCancel: () => void;
};

type Phase = "thinking" | "speaking" | "idle" | "listening" | "review";

const START_TOKEN = "[La conversación empieza ahora. Saluda y abre tú, retomando algo de la última vez si la hubo.]";

export default function Conversation({ characterId, onFinish, onCancel }: Props) {
  const character = getCharacter(characterId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<Phase>("thinking");
  const [draft, setDraft] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sessionId = useRef<number>(0);
  const startedAt = useRef<number>(Date.now());
  const listenStartedAt = useRef<number>(0);
  const lastSegments = useRef<ExpoSpeechRecognitionResultSegment[] | undefined>(undefined);
  const stats = useRef({ seconds: 0, syllables: 0, words: 0 });
  const pendingTurnSeconds = useRef(0);
  const voiceId = useRef<string | undefined>(undefined);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const task: TaskType = "fluidez";
  const systemStatic = conversationSystemStatic(character);
  const systemDynamic = conversationSystemDynamic({
    userFacts: getUserFacts(),
    characterMemory: getCharacterMemory(characterId),
    levelListening: getSetting("level_listening", "A2 (estimado)"),
    levelSpeaking: getSetting("level_speaking", "A2 (estimado)"),
    task,
  });

  // Arranque: sesión, voz italiana y primera frase del personaje
  useEffect(() => {
    sessionId.current = startSession(characterId);
    startedAt.current = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);

    (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const italian = voices.filter((v) => v.language?.toLowerCase().startsWith("it"));
        const best = italian.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ?? italian[0];
        voiceId.current = best?.identifier;
      } catch {}
      await characterTurn([]);
    })();

    return () => {
      clearInterval(timer);
      Speech.stop();
      ExpoSpeechRecognitionModule.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconocimiento de voz
  useSpeechRecognitionEvent("result", (event) => {
    const result = event.results[0];
    if (!result) return;
    setDraft(result.transcript);
    if (event.isFinal) lastSegments.current = result.segments;
  });
  useSpeechRecognitionEvent("end", () => {
    const fallback = (Date.now() - listenStartedAt.current) / 1000;
    pendingTurnSeconds.current = turnSeconds(lastSegments.current, fallback);
    setPhase((p) => (p === "listening" ? "review" : p));
  });
  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted") return;
    if (event.error === "no-speech") {
      setPhase("idle");
      return;
    }
    setError(`El reconocimiento de voz ha fallado (${event.error}). Puedes escribir tu respuesta.`);
    setPhase("review");
  });

  async function characterTurn(history: ChatMessage[]) {
    setPhase("thinking");
    setError(null);
    try {
      // La conversación visible empieza con el personaje; para la IA siempre va
      // precedida del aviso de inicio, así los turnos quedan alternos.
      const apiMessages: ChatMessage[] = [{ role: "user", content: START_TOKEN }, ...history];
      const reply = await callClaude({
        model: MODEL_CONVERSATION,
        systemStatic,
        systemDynamic,
        messages: apiMessages,
        maxTokens: 250,
      });
      const next = [...history, { role: "assistant" as const, content: reply }];
      setMessages(next);
      speak(reply);
    } catch (e: any) {
      setError(e?.message ?? "No se ha podido contactar con la IA.");
      setPhase("idle");
    }
  }

  function speak(text: string) {
    setPhase("speaking");
    Speech.speak(text, {
      language: "it-IT",
      voice: voiceId.current,
      rate: character.speechRate * 0.95,
      onDone: () => setPhase("idle"),
      onStopped: () => setPhase("idle"),
      onError: () => setPhase("idle"),
    });
  }

  async function startListening() {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Micrófono", "Tavola necesita permiso de micrófono y de reconocimiento de voz. Actívalo en Ajustes del iPhone.");
      return;
    }
    Speech.stop();
    setDraft("");
    lastSegments.current = undefined;
    listenStartedAt.current = Date.now();
    setPhase("listening");
    ExpoSpeechRecognitionModule.start({
      lang: "it-IT",
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      requiresOnDeviceRecognition: false,
    });
  }

  function stopListening() {
    ExpoSpeechRecognitionModule.stop();
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? draft).trim();
    if (!text) return;
    if (!textOverride) {
      stats.current.seconds += pendingTurnSeconds.current;
      stats.current.syllables += countSyllables(text);
      stats.current.words += countWords(text);
    }
    pendingTurnSeconds.current = 0;
    const minutes = (Date.now() - startedAt.current) / 60000;
    const content = minutes >= WRAP_UP_MINUTES ? `${text}\n\n[QUEDA POCO]` : text;
    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setDraft("");
    await characterTurn(history);
  }

  function finish() {
    Speech.stop();
    ExpoSpeechRecognitionModule.abort();
    if (!messages.some((m) => m.role === "user")) {
      onCancel();
      return;
    }
    onFinish({
      sessionId: sessionId.current,
      characterId,
      messages,
      userSeconds: stats.current.seconds,
      userSyllables: stats.current.syllables,
      userWords: stats.current.words,
    });
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.headerAction}>Terminar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{character.name}</Text>
        <Text style={styles.timer}>
          {mm}:{ss}
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chat} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === "user" ? styles.userBubble : [styles.charBubble, { borderLeftColor: character.color }]]}>
            <Text style={[styles.bubbleText, m.role === "user" && { color: "#fff" }]}>{m.content.replace("\n\n[QUEDA POCO]", "")}</Text>
            {m.role === "assistant" && (
              <Pressable onPress={() => speak(m.content)} hitSlop={8}>
                <Text style={styles.replay}>↻ Volver a oír</Text>
              </Pressable>
            )}
          </View>
        ))}
        {phase === "thinking" && <ActivityIndicator color={character.color} style={{ marginTop: 8 }} />}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.bottom}>
        {phase === "review" ? (
          <>
            <Text style={styles.hint}>Esto es lo que ha entendido el iPhone. Corrígelo si no es lo que dijiste.</Text>
            <TextInput style={styles.input} value={draft} onChangeText={setDraft} multiline autoCorrect={false} autoCapitalize="sentences" />
            <View style={styles.row}>
              <Pressable style={styles.ghost} onPress={startListening}>
                <Text style={styles.ghostText}>Repetir</Text>
              </Pressable>
              <Pressable style={[styles.primary, !draft.trim() && { opacity: 0.4 }]} disabled={!draft.trim()} onPress={() => send()}>
                <Text style={styles.primaryText}>Enviar</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {phase === "listening" && <Text style={styles.live}>{draft || "Te escucho…"}</Text>}
            <View style={styles.row}>
              <Pressable style={styles.ghost} disabled={phase === "thinking"} onPress={() => send("aiuto")}>
                <Text style={styles.ghostText}>Aiuto</Text>
              </Pressable>
              <Pressable
                style={[styles.mic, phase === "listening" && styles.micOn, phase === "thinking" && { opacity: 0.4 }]}
                disabled={phase === "thinking"}
                onPress={phase === "listening" ? stopListening : startListening}
              >
                <Text style={styles.micText}>{phase === "listening" ? "■ Parar" : "● Hablar"}</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 60, paddingHorizontal: gap, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.line },
  headerAction: { color: colors.accent, fontWeight: "600", fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  timer: { fontVariant: ["tabular-nums"], color: colors.muted, fontSize: 16 },
  chat: { padding: gap, gap: 10 },
  bubble: { padding: 14, borderRadius: radius, maxWidth: "88%" },
  charBubble: { backgroundColor: colors.card, alignSelf: "flex-start", borderLeftWidth: 4 },
  userBubble: { backgroundColor: colors.accent, alignSelf: "flex-end" },
  bubbleText: { fontSize: 17, lineHeight: 24, color: colors.ink },
  replay: { marginTop: 8, color: colors.muted, fontSize: 13 },
  error: { color: colors.danger, marginTop: 8 },
  bottom: { padding: gap, paddingBottom: 36, gap: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
  hint: { color: colors.muted, fontSize: 13 },
  live: { fontSize: 17, color: colors.ink, minHeight: 24 },
  input: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 12, fontSize: 17, minHeight: 60 },
  row: { flexDirection: "row", gap: 10 },
  primary: { flex: 2, backgroundColor: colors.accent, borderRadius: radius, padding: 16, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghost: { flex: 1, borderRadius: radius, borderWidth: 1, borderColor: colors.accent, padding: 16, alignItems: "center" },
  ghostText: { color: colors.accent, fontWeight: "600", fontSize: 16 },
  mic: { flex: 2, backgroundColor: colors.accent, borderRadius: radius, padding: 18, alignItems: "center" },
  micOn: { backgroundColor: colors.danger },
  micText: { color: "#fff", fontWeight: "700", fontSize: 18 },
});
