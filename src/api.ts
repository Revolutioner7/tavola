import { API_URL, APP_KEY } from "./config";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type SystemBlock = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };

export async function callClaude(opts: {
  model: string;
  systemStatic: string;
  systemDynamic?: string;
  messages: ChatMessage[];
  maxTokens: number;
}): Promise<string> {
  const system: SystemBlock[] = [{ type: "text", text: opts.systemStatic, cache_control: { type: "ephemeral" } }];
  if (opts.systemDynamic) system.push({ type: "text", text: opts.systemDynamic });

  const res = await fetch(`${API_URL}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tavola-key": APP_KEY },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system,
      messages: opts.messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Error ${res.status} al hablar con la IA. ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const block = (data.content || []).find((b: any) => b.type === "text");
  return (block?.text || "").trim();
}

/** Extrae el primer objeto JSON de una respuesta, por si el modelo añade texto alrededor. */
export function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("La respuesta del repaso no tiene el formato esperado.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}
