import { createOpenAICompatibleProvider } from "./openai-factory";

export const vercelProvider = createOpenAICompatibleProvider({
  name: "Vercel AI Gateway",
  baseURL: "https://ai-gateway.vercel.sh/v1",
  apiKey: process.env.AI_GATEWAY_API_KEY,
});
