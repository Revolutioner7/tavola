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

type Route =
  | { name: "home" }
  | { name: "conversation"; characterId: CharacterId; key: number }
  | { name: "debrief"; result: ConversationResult }
  | { name: "errors" }
  | { name: "settings" }
  | { name: "monologue"; key: number };

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
  const startConversation = (characterId: CharacterId) => setRoute({ name: "conversation", characterId, key: Date.now() });

  let screen: React.ReactNode;
  switch (route.name) {
    case "home":
      screen = (
        <Home key={homeKey} onStart={startConversation} onMonologue={() => setRoute({ name: "monologue", key: Date.now() })} onErrors={() => setRoute({ name: "errors" })} onSettings={() => setRoute({ name: "settings" })} />
      );
      break;
    case "conversation":
      screen = (
        <Conversation
          key={route.key}
          characterId={route.characterId}
          onFinish={(result) => setRoute({ name: "debrief", result })}
          onCancel={goHome}
        />
      );
      break;
    case "debrief":
      screen = <Debrief result={route.result} onRepeat={() => startConversation(route.result.characterId)} onHome={goHome} />;
      break;
    case "errors":
      screen = <ErrorBook onBack={goHome} />;
      break;
    case "settings":
      screen = <Settings onBack={goHome} />;
      break;
    case "monologue":
      screen = <Monologue key={route.key} onBack={goHome} />;
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
