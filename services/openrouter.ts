import OpenAI from "openai";
import type { AIProvider, ChatConfig, ChatMessage } from "../types";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const openRouterProvider: AIProvider = {
  name: "OpenRouter",
  async chat(model: string, messages: ChatMessage[], config?: ChatConfig) {
    const stream = await openrouter.chat.completions.create({
      model,
      messages: messages as any,
      stream: true,
      temperature: config?.temperature ?? 0.6,
      max_tokens: config?.max_tokens ?? 4096,
      top_p: config?.top_p ?? 0.95,
    });

    return (async function* () {
      for await (const chunk of stream) {
        yield chunk.choices[0]?.delta?.content || "";
      }
    })();
  },
};
