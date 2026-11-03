import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { applyUpdateIfAvailable } from "./src/updates";
import { colors } from "./src/theme";
import { StatusBar } from "expo-status-bar";
import { CharacterId } from "./src/brain/characters";
import Home from "./src/screens/Home";
import Conversation, { ConversationResult } from "./src/screens/Conversation";
import Debrief from "./src/screens/Debrief";
import ErrorBook from "./src/screens/ErrorBook";
import Settings from "./src/screens/Settings";
import Monologue from "./src/screens/Monologue";
import WordGame from "./src/screens/WordGame";
import ClozeGame from "./src/screens/ClozeGame";
import Journey from "./src/screens/Journey";

type Route =
  | { name: "home" }
  | { name: "conversation"; characterId: CharacterId; stepId?: string; key: number }
  | { name: "journey" }
  | { name: "debrief"; result: ConversationResult }
  | { name: "errors" }
  | { name: "settings" }
  | { name: "monologue"; key: number }
  | { name: "game"; key: number }
  | { name: "cloze"; key: number };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [homeKey, setHomeKey] = useState(0);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    applyUpdateIfAvailable(() => setUpdating(true));
  }, []);

  const goHome = () => {
    setHomeKey((k) => k + 1); // refresca las estadísticas del inicio
    setRoute({ name: "home" });
  };
  const startConversation = (characterId: CharacterId, stepId?: string) => setRoute({ name: "conversation", characterId, stepId, key: Date.now() });

  let screen: React.ReactNode;
  switch (route.name) {
    case "home":
      screen = (
        <Home key={homeKey} onStart={startConversation} onMonologue={() => setRoute({ name: "monologue", key: Date.now() })} onGame={() => setRoute({ name: "game", key: Date.now() })} onCloze={() => setRoute({ name: "cloze", key: Date.now() })} onErrors={() => setRoute({ name: "errors" })} onSettings={() => setRoute({ name: "settings" })} onJourney={() => setRoute({ name: "journey" })} />
      );
      break;
    case "conversation":
      screen = (
        <Conversation
          key={route.key}
          characterId={route.characterId}
          stepId={route.stepId}
          onFinish={(result) => setRoute({ name: "debrief", result })}
          onCancel={goHome}
        />
      );
      break;
    case "debrief":
      screen = <Debrief result={route.result} onRepeat={() => startConversation(route.result.characterId, route.result.stepId)} onHome={goHome} onNext={goHome} />;
      break;
    case "errors":
      screen = <ErrorBook onBack={goHome} />;
      break;
    case "settings":
      screen = <Settings onBack={goHome} onPlacement={() => startConversation("chiara", "placement")} />;
      break;
    case "monologue":
      screen = <Monologue key={route.key} onBack={goHome} />;
      break;
    case "game":
      screen = <WordGame key={route.key} onBack={goHome} />;
      break;
    case "journey":
      screen = <Journey onBack={goHome} onStart={startConversation} />;
      break;
    case "cloze":
      screen = <ClozeGame key={route.key} onBack={goHome} />;
      break;
  }

  if (updating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: 12 }}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.accent} />
        <Text style={{ color: colors.muted, fontSize: 16 }}>Actualizando Tavola…</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {screen}
    </>
  );
}
