import Cerebras from "@cerebras/cerebras_cloud_sdk";
import type { AIProvider, ChatConfig, ChatMessage } from "../types";

const cerebras = new Cerebras();

export const cerebrasProvider: AIProvider = {
  name: "Cerebras",
  async chat(model: string, messages: ChatMessage[], config?: ChatConfig) {
    const stream = await cerebras.chat.completions.create({
      messages: messages as any,
      model,
      stream: true,
      max_completion_tokens: config?.max_tokens ?? 40960,
      temperature: config?.temperature ?? 0.6,
      top_p: config?.top_p ?? 0.95,
    });

    return (async function* () {
      for await (const chunk of stream) {
        yield (chunk as any).choices[0]?.delta?.content || "";
      }
    })();
  },
};
