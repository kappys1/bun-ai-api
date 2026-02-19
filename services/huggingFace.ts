import { createOpenAICompatibleProvider } from "./openai-factory";

export const huggingFaceProvider = createOpenAICompatibleProvider({
  name: "Hugging Face",
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});
