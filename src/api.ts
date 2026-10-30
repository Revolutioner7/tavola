import { API_URL, APP_KEY } from "./config";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type SystemBlock = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };

class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(`Error ${status} al hablar con la IA. ${detail.slice(0, 200)}`);
  }
}

async function request(body: object): Promise<any> {
  const res = await fetch(`${API_URL}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tavola-key": APP_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text);
  }
  return res.json();
}

/**
 * Cómo se apaga el razonamiento interno ("thinking") en cada modelo. Los modelos actuales lo
 * activan por defecto y se comía el límite de respuesta, dejando respuestas vacías.
 * Cada modelo lo pide de una forma distinta (comprobado el 30/10/2026):
 * Haiku 5.5 acepta "disabled"; Sonnet 5.5 rechaza "disabled" y pide "between_tools".
 */
const THINKING_OFF: Record<string, object> = {
  "claude-haiku-5-5": { type: "disabled" },
  "claude-sonnet-5-5": { type: "between_tools" },
};

/**
 * Llama a Claude con el razonamiento apagado. Si el modelo rechaza la forma de apagarlo,
 * reintenta sin indicarlo y con más margen de respuesta. Si llega vacía, reintenta una vez.
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

  const thinking = THINKING_OFF[opts.model];
  const base: Record<string, unknown> = { model: opts.model, system, messages: opts.messages };
  if (thinking) base.thinking = thinking;
  for (const maxTokens of [opts.maxTokens, Math.min(opts.maxTokens * 3, 2000)]) {
    let data: any;
    try {
      data = await request({ ...base, max_tokens: maxTokens });
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && /thinking/i.test(e.detail) && base.thinking) {
        delete base.thinking; // el modelo no acepta esa forma: se deja su valor por defecto
        data = await request({ ...base, max_tokens: Math.min(Math.max(maxTokens * 3, 1500), 2000) });
      } else {
        throw e;
      }
    }
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
