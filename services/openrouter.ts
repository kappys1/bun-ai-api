import { createOpenAICompatibleProvider } from "./factory/openai-factory";

export const openRouterProvider = createOpenAICompatibleProvider({
  name: "OpenRouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
