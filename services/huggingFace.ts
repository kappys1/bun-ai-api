import OpenAI from "openai";
import type { AIService, ChatMessage } from "../types";

const huggingFace = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

export const huggingFaceService: AIService = {
  name: "Hugging Face",
  async chat(messages: ChatMessage[]) {
    const stream = await huggingFace.chat.completions.create({
      model: "zai-org/GLM-5",
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
