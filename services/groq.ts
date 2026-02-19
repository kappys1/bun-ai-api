import { createOpenAICompatibleProvider } from "./factory/openai-factory";

export const groqProvider = createOpenAICompatibleProvider({
  name: "Groq",
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
  maxTokensParam: "max_completion_tokens",
});
