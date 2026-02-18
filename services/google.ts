import { GoogleGenAI } from "@google/genai";
import type { AIService, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const googleService: AIService = {
  name: "Google AI Studio",
  async chat(messages: ChatMessage[]) {
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === "system");

    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        temperature: 0.6,
        maxOutputTokens: 4096,
        topP: 0.95,
        ...(systemInstruction && {
          systemInstruction: systemInstruction.content,
        }),
      },
    });

    return (async function* () {
      for await (const chunk of response) {
        yield chunk.text ?? "";
      }
    })();
  },
};
