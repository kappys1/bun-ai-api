import OpenAI from "openai";
import type { AIProvider, ChatConfig, ChatMessage } from "../types";

const huggingFace = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

export const huggingFaceProvider: AIProvider = {
  name: "Hugging Face",
  async chat(model: string, messages: ChatMessage[], config?: ChatConfig) {
    const stream = await huggingFace.chat.completions.create({
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
