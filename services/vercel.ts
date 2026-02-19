import OpenAI from "openai";
import type { AIProvider, ChatConfig, ChatMessage } from "../types";

const vercel = new OpenAI({
  baseURL: "https://ai-gateway.vercel.sh/v1",
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export const vercelProvider: AIProvider = {
  name: "Vercel AI Gateway",
  async chat(model: string, messages: ChatMessage[], config?: ChatConfig) {
    const stream = await vercel.chat.completions.create({
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
