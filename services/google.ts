import { GoogleGenAI } from "@google/genai";
import type { AIProvider, ChatConfig, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const googleProvider: AIProvider = {
  name: "Google AI Studio",
  async chat(model: string, messages: ChatMessage[], config?: ChatConfig) {
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === "system");

    // Mapear reasoning_effort a thinkingBudget para Gemini 2.5
    const thinkingBudgetMap: Record<string, number> = {
      low: 1024,
      medium: 8192,
      high: 24576,
    };

    const response = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        temperature: config?.temperature ?? 0.6,
        maxOutputTokens: config?.max_tokens ?? 4096,
        topP: config?.top_p ?? 0.95,
        ...(systemInstruction && {
          systemInstruction: systemInstruction.content,
        }),
        // Habilitar thinking para modelos de razonamiento (Gemini 2.5+)
        ...(config?.reasoning && {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: config.reasoning_effort
              ? thinkingBudgetMap[config.reasoning_effort]
              : -1, // -1 = dinámico
          },
        }),
      },
    });

    return (async function* () {
      let inThought = false;
      for await (const chunk of response) {
        // Si el modelo devuelve partes con pensamiento, envolverlas en <think>
        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (!part.text) continue;
            if ((part as any).thought) {
              // Emitir como bloque <think> para que los clientes lo detecten
              if (!inThought) {
                yield "<think>\n";
                inThought = true;
              }
              yield part.text;
            } else {
              if (inThought) {
                yield "\n</think>\n";
                inThought = false;
              }
              yield part.text;
            }
          }
        } else {
          yield chunk.text ?? "";
        }
      }
      // Cerrar bloque de pensamiento si quedó abierto
      if (inThought) {
        yield "\n</think>\n";
      }
    })();
  },
};
