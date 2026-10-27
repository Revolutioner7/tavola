import React from "react";
import { registerRootComponent } from "expo";
import { ScrollView, Text } from "react-native";

// Si algo falla al arrancar o durante el uso, en vez de cerrarse la app
// muestra el error en pantalla, para poder enviárselo a Claude y arreglarlo.

let lastError: string | null = null;
const listeners = new Set<() => void>();
function report(error: unknown) {
  const e = error as any;
  lastError = `${e?.name ?? "Error"}: ${e?.message ?? String(error)}\n\n${e?.stack ?? ""}`;
  listeners.forEach((l) => l());
}

const g = globalThis as any;
if (g.ErrorUtils?.setGlobalHandler) {
  g.ErrorUtils.setGlobalHandler((error: unknown) => report(error));
}

function ErrorScreen({ message }: { message: string }) {
  return React.createElement(
    ScrollView,
    { style: { flex: 1, backgroundColor: "#FBF6EE" }, contentContainerStyle: { padding: 20, paddingTop: 80 } },
    React.createElement(Text, { style: { fontSize: 22, fontWeight: "700", color: "#A33A3A", marginBottom: 12 } }, "Tavola ha tenido un error"),
    React.createElement(Text, { style: { fontSize: 14, color: "#2B2420", marginBottom: 16 } }, "Haz una captura de esta pantalla y envíasela a Claude."),
    React.createElement(Text, { selectable: true, style: { fontSize: 12, color: "#2B2420", fontFamily: "Menlo" } }, message)
  );
}

let AppComponent: React.ComponentType | null = null;
try {
  AppComponent = require("./App").default;
} catch (e) {
  report(e);
}

class Root extends React.Component<{}, { error: string | null }> {
  state = { error: lastError };
  private unsub = () => {};
  componentDidMount() {
    const l = () => this.setState({ error: lastError });
    listeners.add(l);
    this.unsub = () => listeners.delete(l);
  }
  componentWillUnmount() {
    this.unsub();
  }
  componentDidCatch(error: unknown) {
    report(error);
  }
  static getDerivedStateFromError(error: unknown) {
    const e = error as any;
    return { error: `${e?.name ?? "Error"}: ${e?.message ?? String(error)}\n\n${e?.stack ?? ""}` };
  }
  render() {
    if (this.state.error || !AppComponent) return React.createElement(ErrorScreen, { message: this.state.error ?? "No se ha podido cargar la app." });
    return React.createElement(AppComponent);
  }
}

registerRootComponent(Root);
