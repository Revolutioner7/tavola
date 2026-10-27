/**
 * Intermediario de Tavola en Cloudflare Workers.
 *
 * Guarda la clave de Claude (ANTHROPIC_API_KEY) fuera de la app y solo acepta
 * peticiones que lleven la clave propia de la app (TAVOLA_APP_KEY).
 * Solo permite los dos modelos que usa Tavola y limita la longitud de respuesta.
 */

export interface Env {
  ANTHROPIC_API_KEY: string;
  TAVOLA_APP_KEY: string;
}

const ALLOWED_MODELS = new Set(["claude-haiku-5-5", "claude-sonnet-5-5"]);
const MAX_TOKENS_LIMIT = 2000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }

    if (request.method !== "POST" || url.pathname !== "/v1/messages") {
      return json({ error: "not_found" }, 404);
    }

    if (request.headers.get("x-tavola-key") !== env.TAVOLA_APP_KEY) {
      return json({ error: "unauthorized" }, 401);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    if (!ALLOWED_MODELS.has(body?.model)) {
      return json({ error: "model_not_allowed" }, 400);
    }
    body.max_tokens = Math.min(Number(body.max_tokens) || 400, MAX_TOKENS_LIMIT);
    delete body.stream;

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
