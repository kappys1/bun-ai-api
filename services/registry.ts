import type { AIProvider } from "../types";
import { cerebrasProvider } from "./cerebras";
import { googleProvider } from "./google";
import { groqProvider } from "./groq";
import { huggingFaceProvider } from "./huggingFace";
import { openRouterProvider } from "./openrouter";
import { vercelProvider } from "./vercel";

/**
 * Registry de providers disponibles.
 * La clave es el providerKey usado en la matriz de modelos.
 */

export type ProviderServicesNames =
  | "huggingface"
  | "groq"
  | "cerebras"
  | "openrouter"
  | "google"
  | "vercel";

export const providerRegistry: Record<ProviderServicesNames, AIProvider> = {
  huggingface: huggingFaceProvider,
  groq: groqProvider,
  cerebras: cerebrasProvider,
  openrouter: openRouterProvider,
  google: googleProvider,
  vercel: vercelProvider,
};
