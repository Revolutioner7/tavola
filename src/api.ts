import { API_URL, APP_KEY } from "./config";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type SystemBlock = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };

async function request(body: object): Promise<any> {
  const res = await fetch(`${API_URL}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tavola-key": APP_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Error ${res.status} al hablar con la IA. ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Llama a Claude. El razonamiento interno ("thinking") va desactivado: los modelos actuales
 * lo activan por defecto y se comía el límite de respuesta, dejando respuestas vacías.
 * Si aun así llega una respuesta vacía, se reintenta una vez con más margen.
 */
export async function callClaude(opts: {
  model: string;
  systemStatic: string;
  systemDynamic?: string;
  messages: ChatMessage[];
  maxTokens: number;
}): Promise<string> {
  const system: SystemBlock[] = [{ type: "text", text: opts.systemStatic, cache_control: { type: "ephemeral" } }];
  if (opts.systemDynamic) system.push({ type: "text", text: opts.systemDynamic });

  const base = { model: opts.model, system, messages: opts.messages, thinking: { type: "disabled" } };
  for (const maxTokens of [opts.maxTokens, Math.min(opts.maxTokens * 3, 2000)]) {
    const data = await request({ ...base, max_tokens: maxTokens });
    const text = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();
    if (text) return text;
  }
  throw new Error("La IA no ha devuelto respuesta. Vuelve a intentarlo.");
}

/** Extrae el primer objeto JSON de una respuesta, por si el modelo añade texto o marcas alrededor. */
export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("La respuesta del repaso no tiene el formato esperado. Pulsa Reintentar.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
