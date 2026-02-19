import { Groq } from "groq-sdk";
import type { AIProvider, ChatConfig, ChatMessage } from "../types";

const groq = new Groq();

export const groqProvider: AIProvider = {
  name: "Groq",
  async chat(model: string, messages: ChatMessage[], config?: ChatConfig) {
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model,
      temperature: config?.temperature ?? 0.6,
      max_completion_tokens: config?.max_tokens ?? 4096,
      top_p: config?.top_p ?? 1,
      stream: true,
      stop: null,
    });

    return (async function* () {
      for await (const chunk of chatCompletion) {
        yield chunk.choices[0]?.delta?.content || "";
      }
    })();
  },
};
