import type { Context } from "hono";
import { modelMatrix } from "../models";

/**
 * GET /v1/models
 * Lista todos los modelos disponibles en formato OpenAI-compatible.
 */
export function modelsHandler(c: Context) {
  const models = modelMatrix.map((m) => ({
    id: m.id,
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: m.owned_by ?? "bun-ai-api",
    permission: [],
    root: m.id,
    parent: null,
  }));

  return c.json({ object: "list", data: models });
}
