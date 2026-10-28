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
import { pickVoice } from "../voice";
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

type Phase = "thinking" | "speaking" | "listening" | "waiting" | "typing";

const START_TOKEN = "[La conversación empieza ahora. Saluda y abre tú, retomando algo de la última vez si la hubo.]";
const SILENCE_TO_SEND_MS = 2200; // pausa tras la que se da tu turno por terminado
const NO_SPEECH_MS = 15000; // si no dices nada en este tiempo, se deja de escuchar
const NOTE_SIMPLER =
  "[Nota de la app: Rodrigo ha necesitado traducir o escuchar más despacio tu último mensaje. Habla más sencillo y más corto: frases de pocas palabras y vocabulario muy frecuente.]";

export default function Conversation({ characterId, onFinish, onCancel }: Props) {
  const character = getCharacter(characterId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<Phase>("thinking");
  const [draft, setDraft] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState<number | null>(null);
  const [helper, setHelper] = useState<{ es: string; it: string } | null>(null);
  const [helperBusy, setHelperBusy] = useState(false);

  const sessionId = useRef(0);
  const startedAt = useRef(Date.now());
  const listenStartedAt = useRef(0);
  const lastResultAt = useRef(0);
  const transcript = useRef("");
  const lastSegments = useRef<ExpoSpeechRecognitionResultSegment[] | undefined>(undefined);
  const stats = useRef({ seconds: 0, syllables: 0, words: 0 });
  const messagesRef = useRef<ChatMessage[]>([]);
  const neededHelp = useRef(false);
  const endAction = useRef<"send" | "aiuto" | "idle">("idle");
  const listenLang = useRef<"it" | "es">("it");
  const recognizing = useRef(false); // solo se procesan los finales de una escucha activa

  function abortRecognition() {
    recognizing.current = false;
    ExpoSpeechRecognitionModule.abort();
  }
  const silenceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceId = useRef<string | undefined>(undefined);
  const alive = useRef(true);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const task: TaskType = "fluidez";
  const systemStatic = conversationSystemStatic(character);
  const systemDynamic = conversationSystemDynamic({
    userFacts: getUserFacts(),
    characterMemory: getCharacterMemory(characterId),
    levelListening: getSetting("level_listening", "A1 (estimado)"),
    levelSpeaking: getSetting("level_speaking", "A1 (estimado)"),
    task,
  });

  useEffect(() => {
    alive.current = true;
    sessionId.current = startSession(characterId);
    startedAt.current = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);

    (async () => {
      voiceId.current = await pickVoice(character.voiceGender);
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Micrófono", "Tavola necesita permiso de micrófono y de reconocimiento de voz. Actívalo en Ajustes del iPhone.");
      }
      await characterTurn([]);
    })();

    return () => {
      alive.current = false;
      clearInterval(timer);
      stopSilenceTimer();
      Speech.stop();
      abortRecognition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconocimiento de voz
  useSpeechRecognitionEvent("result", (event) => {
    const result = event.results[0];
    if (!result) return;
    transcript.current = result.transcript;
    lastResultAt.current = Date.now();
    setDraft(result.transcript);
    if (result.segments?.length) lastSegments.current = result.segments;
  });

  useSpeechRecognitionEvent("end", () => {
    if (!recognizing.current) return;
    recognizing.current = false;
    stopSilenceTimer();
    const action = endAction.current;
    endAction.current = "idle";
    if (!alive.current) return;
    if (listenLang.current === "es") {
      listenLang.current = "it";
      const es = transcript.current.trim();
      if (es) howToSay(es);
      else setPhase("waiting");
      return;
    }
    if (action === "aiuto") {
      sendText("aiuto", false);
      return;
    }
    const text = transcript.current.trim();
    if (action === "send" && text) {
      const fallback = (lastResultAt.current - listenStartedAt.current) / 1000;
      stats.current.seconds += turnSeconds(lastSegments.current, fallback);
      stats.current.syllables += countSyllables(text);
      stats.current.words += countWords(text);
      sendText(text, true);
      return;
    }
    setPhase("waiting");
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted" || event.error === "no-speech" || !recognizing.current) return;
    recognizing.current = false;
    stopSilenceTimer();
    setError(`El reconocimiento de voz ha fallado (${event.error}). Puedes escribir tu respuesta.`);
    setPhase("typing");
  });

  function stopSilenceTimer() {
    if (silenceTimer.current) clearInterval(silenceTimer.current);
    silenceTimer.current = null;
  }

  async function characterTurn(history: ChatMessage[]) {
    setPhase("thinking");
    setError(null);
    try {
      const apiMessages: ChatMessage[] = [{ role: "user", content: START_TOKEN }, ...history];
      const reply = await callClaude({ model: MODEL_CONVERSATION, systemStatic, systemDynamic, messages: apiMessages, maxTokens: 250 });
      if (!alive.current) return;
      const next = [...history, { role: "assistant" as const, content: reply }];
      messagesRef.current = next;
      setMessages(next);
      speak(reply, 1, true);
    } catch (e: any) {
      setError(e?.message ?? "No se ha podido contactar con la IA.");
      setPhase("waiting");
    }
  }

  /** Lee en voz alta. Si listenAfter es true, al terminar empieza a escucharte solo. */
  function speak(text: string, speed = 1, listenAfter = true) {
    abortRecognition();
    stopSilenceTimer();
    Speech.stop();
    setPhase("speaking");
    Speech.speak(text, {
      language: "it-IT",
      voice: voiceId.current,
      rate: character.speechRate * 0.95 * speed,
      onDone: () => {
        if (!alive.current) return;
        if (listenAfter) setTimeout(() => alive.current && startListening(), 250);
        else setPhase("waiting");
      },
      onStopped: () => {
        if (alive.current) setPhase((p) => (p === "speaking" ? "waiting" : p));
      },
      onError: () => {
        if (alive.current) setPhase("waiting");
      },
    });
  }

  function startListening(lang: "it" | "es" = "it") {
    listenLang.current = lang;
    Speech.stop();
    setDraft("");
    setError(null);
    transcript.current = "";
    lastSegments.current = undefined;
    listenStartedAt.current = Date.now();
    lastResultAt.current = 0;
    endAction.current = "idle";
    setPhase("listening");
    recognizing.current = true;
    ExpoSpeechRecognitionModule.start({
      lang: lang === "es" ? "es-ES" : "it-IT",
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      requiresOnDeviceRecognition: false,
    });

    stopSilenceTimer();
    silenceTimer.current = setInterval(() => {
      const now = Date.now();
      if (transcript.current.trim() && lastResultAt.current && now - lastResultAt.current > SILENCE_TO_SEND_MS) {
        endAction.current = "send";
        stopSilenceTimer();
        ExpoSpeechRecognitionModule.stop();
      } else if (!transcript.current.trim() && now - listenStartedAt.current > NO_SPEECH_MS) {
        endAction.current = "idle";
        stopSilenceTimer();
        ExpoSpeechRecognitionModule.stop();
      }
    }, 250);
  }

  /** "¿Cómo se dice?": escucha en castellano, propone la frase en italiano y te deja repetirla. */
  function startHowToSay() {
    abortRecognition();
    stopSilenceTimer();
    setHelper(null);
    setTimeout(() => alive.current && startListening("es"), 200);
  }

  async function howToSay(es: string) {
    neededHelp.current = true;
    setHelperBusy(true);
    setPhase("waiting");
    try {
      const context = [...messagesRef.current].reverse().find((m) => m.role === "assistant")?.content ?? "";
      const it = await callClaude({
        model: MODEL_CONVERSATION,
        systemStatic:
          "Rodrigo aprende italiano (nivel inicial) y no sabe decir algo. Te da la frase en castellano. Devuelve solo cómo lo diría un italiano de forma natural y sencilla, con palabras frecuentes y frases cortas, sin comillas ni explicaciones.",
        messages: [{ role: "user", content: `Contexto, lo último que le dijeron: ${context}\n\nLo que quiere decir: ${es}` }],
        maxTokens: 200,
      });
      if (!alive.current) return;
      setHelper({ es, it });
      speakHelper(it);
    } catch (e: any) {
      setError(e?.message ?? "No se ha podido preparar la frase.");
    }
    setHelperBusy(false);
  }

  function speakHelper(it: string) {
    setPhase("speaking");
    Speech.stop();
    Speech.speak(it, {
      language: "it-IT",
      voice: voiceId.current,
      rate: character.speechRate * 0.8,
      onDone: () => {
        if (alive.current) setTimeout(() => alive.current && startListening("it"), 250);
      },
      onStopped: () => {
        if (alive.current) setPhase((p) => (p === "speaking" ? "waiting" : p));
      },
    });
  }

  /** Terminar tu turno a mano (si no quieres esperar la pausa). */
  function finishTurnNow() {
    endAction.current = "send";
    stopSilenceTimer();
    ExpoSpeechRecognitionModule.stop();
  }

  function askAiuto() {
    if (phase === "listening") {
      endAction.current = "aiuto";
      stopSilenceTimer();
      ExpoSpeechRecognitionModule.stop();
    } else {
      sendText("aiuto", false);
    }
  }

  async function sendText(text: string, fromVoice: boolean) {
    let content = text;
    if (neededHelp.current) {
      content = `${content}\n\n${NOTE_SIMPLER}`;
      neededHelp.current = false;
    }
    const minutes = (Date.now() - startedAt.current) / 60000;
    if (minutes >= WRAP_UP_MINUTES) content = `${content}\n\n[QUEDA POCO]`;
    const history = [...messagesRef.current, { role: "user" as const, content }];
    messagesRef.current = history;
    setMessages(history);
    setDraft("");
    setHelper(null);
    void fromVoice;
    await characterTurn(history);
  }

  async function translate(index: number, text: string) {
    neededHelp.current = true;
    if (translations[index]) return;
    setTranslating(index);
    try {
      const t = await callClaude({
        model: MODEL_CONVERSATION,
        systemStatic: "Traduce al castellano de España el texto italiano que te den. Devuelve solo la traducción, natural y fiel, sin comentarios.",
        messages: [{ role: "user", content: text }],
        maxTokens: 300,
      });
      setTranslations((prev) => ({ ...prev, [index]: t }));
    } catch {
      setTranslations((prev) => ({ ...prev, [index]: "No se ha podido traducir ahora." }));
    }
    setTranslating(null);
  }

  function finish() {
    alive.current = false;
    stopSilenceTimer();
    Speech.stop();
    abortRecognition();
    if (!messagesRef.current.some((m) => m.role === "user")) {
      onCancel();
      return;
    }
    onFinish({
      sessionId: sessionId.current,
      characterId,
      messages: messagesRef.current,
      userSeconds: stats.current.seconds,
      userSyllables: stats.current.syllables,
      userWords: stats.current.words,
    });
  }

  const clean = (s: string) => s.replace(/\n\n\[(QUEDA POCO|Nota de la app:[^\]]*)\]/g, "").replace(/\n\n\[QUEDA POCO\]/g, "");
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

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
        {messages.map((m, i) =>
          m.role === "user" ? (
            <View key={i} style={[styles.bubble, styles.userBubble]}>
              <Text style={[styles.bubbleText, { color: "#fff" }]}>{clean(m.content)}</Text>
            </View>
          ) : (
            <View key={i} style={[styles.bubble, styles.charBubble, { borderLeftColor: character.color }]}>
              <Text style={styles.bubbleText}>{m.content}</Text>
              {translations[i] ? <Text style={styles.translation}>{translations[i]}</Text> : null}
              <View style={styles.tools}>
                <Pressable onPress={() => speak(m.content, 1, true)} hitSlop={8}>
                  <Text style={styles.tool}>↻ Repetir</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    neededHelp.current = true;
                    speak(m.content, 0.7, true);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.tool}>🐢 Más despacio</Text>
                </Pressable>
                <Pressable onPress={() => translate(i, m.content)} hitSlop={8}>
                  <Text style={styles.tool}>{translating === i ? "Traduciendo…" : "Traducir"}</Text>
                </Pressable>
              </View>
            </View>
          )
        )}
        {phase === "thinking" && <ActivityIndicator color={character.color} style={{ marginTop: 8 }} />}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.bottom}>
        {phase === "typing" ? (
          <>
            <TextInput style={styles.input} value={draft} onChangeText={setDraft} multiline autoCorrect={false} placeholder="Escribe en italiano…" />
            <View style={styles.row}>
              <Pressable style={styles.ghost} onPress={() => startListening()}>
                <Text style={styles.ghostText}>Hablar</Text>
              </Pressable>
              <Pressable style={[styles.primary, !draft.trim() && { opacity: 0.4 }]} disabled={!draft.trim()} onPress={() => sendText(draft.trim(), false)}>
                <Text style={styles.primaryText}>Enviar</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {helper && (
              <View style={styles.helper}>
                <Text style={styles.helperEs}>Querías decir: {helper.es}</Text>
                <Text style={styles.helperIt}>{helper.it}</Text>
                <View style={styles.tools}>
                  <Pressable onPress={() => speakHelper(helper.it)} hitSlop={8}>
                    <Text style={styles.tool}>↻ Oír otra vez</Text>
                  </Pressable>
                  <Text style={styles.helperHint}>Ahora dilo tú en italiano</Text>
                </View>
              </View>
            )}
            <Text style={styles.status}>
              {phase === "thinking" && `${character.name.replace("Nonna ", "").replace("Zio ", "")} está pensando…`}
              {phase === "speaking" && `Habla ${character.name}`}
              {phase === "listening" && (draft || (listenLang.current === "es" ? "Dilo en castellano…" : "Te escucho… habla cuando quieras"))}
              {phase === "waiting" && helperBusy && "Preparando cómo se dice…"}
              {phase === "waiting" && !helperBusy && "Toca el micrófono cuando quieras responder"}
            </Text>
            <View style={styles.row}>
              <Pressable style={styles.ghost} disabled={phase === "thinking" || helperBusy} onPress={startHowToSay}>
                <Text style={styles.ghostText}>¿Cómo se dice?</Text>
              </Pressable>
              {phase === "listening" ? (
                <Pressable style={[styles.mic, styles.micOn]} onPress={finishTurnNow}>
                  <Text style={styles.micText}>He terminado</Text>
                </Pressable>
              ) : phase === "speaking" ? (
                <Pressable style={styles.mic} onPress={() => startListening()}>
                  <Text style={styles.micText}>Contestar ya</Text>
                </Pressable>
              ) : (
                <Pressable style={[styles.mic, phase === "thinking" && { opacity: 0.4 }]} disabled={phase === "thinking"} onPress={() => startListening()}>
                  <Text style={styles.micText}>🎙 Hablar</Text>
                </Pressable>
              )}
            </View>
            {(phase === "waiting" || phase === "listening") && lastAssistant && (
              <View style={styles.links}>
                <Pressable onPress={askAiuto} hitSlop={8}>
                  <Text style={styles.link}>Aiuto: pista en castellano</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    abortRecognition();
                    stopSilenceTimer();
                    setPhase("typing");
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.link}>Escribir</Text>
                </Pressable>
              </View>
            )}
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
  translation: { marginTop: 8, fontSize: 15, lineHeight: 21, color: colors.muted, fontStyle: "italic" },
  tools: { flexDirection: "row", gap: 16, marginTop: 10 },
  tool: { color: colors.accent, fontSize: 13, fontWeight: "600" },
  error: { color: colors.danger, marginTop: 8 },
  bottom: { padding: gap, paddingBottom: 36, gap: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
  status: { fontSize: 16, color: colors.ink, minHeight: 24 },
  input: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 12, fontSize: 17, minHeight: 60 },
  row: { flexDirection: "row", gap: 10 },
  primary: { flex: 2, backgroundColor: colors.accent, borderRadius: radius, padding: 16, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghost: { flex: 1, borderRadius: radius, borderWidth: 1, borderColor: colors.accent, padding: 16, alignItems: "center" },
  ghostText: { color: colors.accent, fontWeight: "600", fontSize: 16 },
  mic: { flex: 2, backgroundColor: colors.accent, borderRadius: radius, padding: 18, alignItems: "center" },
  micOn: { backgroundColor: colors.danger },
  micText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  link: { color: colors.muted, textAlign: "center", fontSize: 14 },
  links: { flexDirection: "row", justifyContent: "space-around" },
  helper: { backgroundColor: colors.accentSoft, borderRadius: radius, padding: 14, gap: 4 },
  helperEs: { fontSize: 13, color: colors.muted },
  helperIt: { fontSize: 19, fontWeight: "700", color: colors.ink, lineHeight: 26 },
  helperHint: { fontSize: 13, color: colors.muted },
});
