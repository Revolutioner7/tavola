// Datos de conexión con el intermediario de Cloudflare.
// Rellenar tras publicar el Worker: su dirección y la clave propia de la app
// (la misma que se guarda en Cloudflare como secreto TAVOLA_APP_KEY).
export const API_URL = "https://tavola-api.rodrigoharmat.workers.dev";
export const APP_KEY = "f50deb2218b0ef321acd60f73ca37f9cd79bb28a34a5d144";

export const MODEL_CONVERSATION = "claude-haiku-5-5";
export const MODEL_DEBRIEF = "claude-sonnet-5-5";

export const CONVERSATION_MINUTES = 12; // duración objetivo de una conversación
export const WRAP_UP_MINUTES = 10; // a partir de aquí se avisa al personaje de que cierre
