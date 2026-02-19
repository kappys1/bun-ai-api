import type { ModelEntry } from "./types";

/**
 * Matriz de modelos disponibles.
 *
 * Cada modelo virtual puede tener múltiples providers.
 * El sistema los rota automáticamente para distribuir el uso
 * y no agotar el free tier de ninguno.
 *
 * Para añadir un modelo nuevo, basta con añadir una entrada aquí
 * y asegurarse de que el provider correspondiente está registrado.
 */
export const modelMatrix: ModelEntry[] = [
  {
    id: "groq-compound",
    name: "groq compound",
    owned_by: "groq",
    reasoning: true,
    providers: [{ providerKey: "groq", model: "groq/compound" }],
  },

  // ── GLM-5 ──
  {
    id: "glm-5",
    name: "GLM-5 (ZhipuAI)",
    owned_by: "zhipuai",
    reasoning: true,
    providers: [{ providerKey: "huggingface", model: "zai-org/GLM-5" }],
  },

  // ── Gemini ──
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    owned_by: "google",
    providers: [
      { providerKey: "google", model: "gemini-2.0-flash" },
      { providerKey: "openrouter", model: "google/gemini-2.0-flash-001" },
      { providerKey: "vercel", model: "google/gemini-2.0-flash" },
    ],
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash Preview",
    owned_by: "google",
    reasoning: true,
    providers: [
      { providerKey: "google", model: "gemini-2.5-flash-preview-05-20" },
    ],
  },
  {
    id: "gemini-3-flash",
    reasoning: true,
    name: "Gemini 3 Flash Preview",
    owned_by: "google",
    providers: [{ providerKey: "google", model: "gemini-3-flash-preview" }],
  },

  // ── Kimi K2 ──
  {
    id: "kimi-k2",
    name: "Kimi K2 Instruct",
    owned_by: "moonshot",
    providers: [
      { providerKey: "groq", model: "moonshotai/kimi-k2-instruct-0905" },
    ],
  },

  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B",
    owned_by: "cerebras",
    providers: [
      { providerKey: "groq", model: "openai/gpt-oss-120b" },
      { providerKey: "cerebras", model: "gpt-oss-120b" },
      { providerKey: "openrouter", model: "gpt-oss-120b" },
    ],
  },
  {
    id: "llama3.1-8b",
    name: "LLaMA 3.1 8B",
    owned_by: "cerebras",
    providers: [
      { providerKey: "cerebras", model: "llama3.1-8b" },
      { providerKey: "groq", model: "llama-3.1-8b-instant" },
    ],
  },
  {
    id: "llama3.3-70B",
    name: "LLaMA 3.3 70B",
    owned_by: "groq",
    providers: [{ providerKey: "groq", model: "llama-3.3-70b-versatile" }],
  },

  // ── DeepSeek R1 ──
  {
    id: "deepseek-r1",
    name: "DeepSeek R1 Distill Llama 70B",
    owned_by: "deepseek",
    reasoning: true,
    providers: [
      { providerKey: "huggingface", model: "deepseek-ai/DeepSeek-R1-0528" },
      {
        providerKey: "openrouter",
        model: "deepseek/deepseek-r1-0528:free",
      },
    ],
  },

  // ── Qwen3-32B (hybrid thinking: /think y /no_think) ──
  {
    id: "qwen3-32b",
    name: "Qwen3-32B",
    owned_by: "qwen",
    reasoning: true,
    providers: [
      { providerKey: "groq", model: "qwen/qwen3-32b" },
      { providerKey: "cerebras", model: "qwen-3-32b" },
      { providerKey: "huggingface", model: "Qwen/QwQ-32B" },
    ],
  },
];

// ── Helpers ──

/** Mapa rápido por ID */
const modelMap = new Map(modelMatrix.map((m) => [m.id, m]));

/** Índice de round-robin por modelo para distribuir carga entre providers */
const providerIndex = new Map<string, number>();

export function getModelEntry(modelId: string): ModelEntry | undefined {
  return modelMap.get(modelId);
}

/**
 * Devuelve el siguiente provider para un modelo, haciendo round-robin.
 * Así distribuimos las peticiones entre providers y no quemamos un solo free tier.
 */
export function getNextProvider(entry: ModelEntry) {
  const idx = providerIndex.get(entry.id) ?? 0;
  const provider = entry.providers[idx % entry.providers.length];
  providerIndex.set(entry.id, idx + 1);
  return provider;
}

/**
 * Devuelve un iterador de providers ordenados por round-robin.
 * Si el primero falla, el handler puede llamar a next() para probar el siguiente.
 * Recorre todos los providers una vez antes de agotarse.
 */
export function* getProvidersWithFallback(entry: ModelEntry) {
  const startIdx = providerIndex.get(entry.id) ?? 0;
  const count = entry.providers.length;

  for (let i = 0; i < count; i++) {
    const provider = entry.providers[(startIdx + i) % count];
    yield provider;
  }

  // Avanzar el índice para la siguiente petición
  providerIndex.set(entry.id, startIdx + 1);
}
