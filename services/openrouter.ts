import OpenAI from "openai";
import type { AIService, ChatMessage } from "../types";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const openRouterService: AIService = {
  name: "OpenRouter",
  async chat(messages: ChatMessage[]) {
    const stream = await openrouter.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: messages as any,
      stream: true,
      temperature: 0.6,
      max_tokens: 4096,
      top_p: 0.95,
    });

    return (async function* () {
      for await (const chunk of stream) {
        yield chunk.choices[0]?.delta?.content || "";
      }
    })();
  },
};
