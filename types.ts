import type { ProviderServicesNames } from "./services/registry";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Cada provider expone un método genérico que acepta el modelo real
export interface AIProvider {
  name: string;
  chat: (
    model: string,
    messages: ChatMessage[],
    config?: ChatConfig,
  ) => Promise<AsyncIterable<string>>;
}

export interface ChatConfig {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  reasoning?: boolean;
  reasoning_effort?: "low" | "medium" | "high";
}

// Un modelo virtual que exponemos, mapeado a uno o más providers reales
export interface ModelEntry {
  id: string; // ID que exponemos en /v1/models (ej: "glm-5")
  name: string; // Nombre para mostrar
  providers: ModelProvider[]; // Backends que pueden servir este modelo
  owned_by?: string;
  reasoning?: boolean; // true si el modelo soporta cadena de pensamiento
}

export interface ModelProvider {
  providerKey: ProviderServicesNames; // clave del provider en el registry
  model: string; // nombre real del modelo en ese provider
}

// Formato OpenAI-compatible para /v1/chat/completions
export interface OpenAIChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  reasoning_effort?: "low" | "medium" | "high";
}
