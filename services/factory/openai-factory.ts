import OpenAI from "openai";
import type { AIProvider, ChatConfig, ChatMessage } from "../../types";

/**
 * Factory para crear providers compatibles con la API de OpenAI.
 * Elimina la duplicación entre HuggingFace, OpenRouter, Vercel y Groq.
 */
export function createOpenAICompatibleProvider(options: {
  name: string;
  baseURL: string;
  apiKey?: string;
  /** Nombre del param para max tokens (openai SDK usa max_tokens, groq usa max_completion_tokens) */
  maxTokensParam?: "max_tokens" | "max_completion_tokens";
  defaults?: Partial<{ temperature: number; maxTokens: number; topP: number }>;
}): AIProvider {
  const {
    name,
    baseURL,
    apiKey,
    maxTokensParam = "max_tokens",
    defaults = {},
  } = options;

  const client = new OpenAI({ baseURL, apiKey });

  return {
    name,
    async chat(model: string, messages: ChatMessage[], config?: ChatConfig) {
      const temperature = config?.temperature ?? defaults.temperature ?? 0.6;
      const maxTokens = config?.max_tokens ?? defaults.maxTokens ?? 4096;
      const topP = config?.top_p ?? defaults.topP ?? 0.95;

      const stream = await client.chat.completions.create({
        model,
        messages: messages as any,
        stream: true,
        temperature,
        top_p: topP,
        ...(maxTokensParam === "max_completion_tokens"
          ? { max_completion_tokens: maxTokens }
          : { max_tokens: maxTokens }),
      });

      return (async function* () {
        for await (const chunk of stream) {
          yield chunk.choices[0]?.delta?.content || "";
        }
      })();
    },
  };
}
