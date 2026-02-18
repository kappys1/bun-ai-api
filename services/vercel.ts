import OpenAI from "openai";
import type { AIService, ChatMessage } from "../types";

const vercel = new OpenAI({
  baseURL: "https://ai-gateway.vercel.sh/v1",
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export const vercelService: AIService = {
  name: "Vercel AI Gateway",
  async chat(messages: ChatMessage[]) {
    const stream = await vercel.chat.completions.create({
      model: "google/gemini-2.0-flash",
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
