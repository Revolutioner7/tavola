import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, gap, radius } from "../theme";

/** Primera vez que se abre la app: la prueba de nivel. */
export default function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>Tavola</Text>
      <Text style={styles.title}>🧭 Antes de empezar, una prueba de nivel</Text>
      <Text style={styles.text}>
        Cinco minutos de conversación con Chiara, la prima de Giulia. Empieza muy fácil y va subiendo mientras respondas bien. Cuando acabe el tiempo, se termina sola.
      </Text>
      <Text style={styles.text}>Con el resultado, la familia te hablará a tu nivel y sabrás en qué hito del recorrido empezar.</Text>
      <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.8 }]} onPress={onStart}>
        <Text style={styles.primaryText}>Empezar la prueba</Text>
      </Pressable>
      <Pressable onPress={onSkip} hitSlop={10}>
        <Text style={styles.skip}>Ahora no (podrás hacerla desde «Mi nivel»)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: gap * 1.5, justifyContent: "center", gap: 16 },
  brand: { fontSize: 40, fontWeight: "700", color: colors.accent, letterSpacing: -1 },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, lineHeight: 30 },
  text: { fontSize: 16, color: colors.muted, lineHeight: 23 },
  primary: { backgroundColor: colors.accent, borderRadius: radius, padding: 18, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  skip: { color: colors.muted, textAlign: "center", fontSize: 14 },
});
