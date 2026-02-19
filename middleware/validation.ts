import type { Context, Next } from "hono";
import { z } from "zod/v4";

/**
 * Schema de validación para POST /v1/chat/completions.
 * Valida el body del request según el formato OpenAI-compatible.
 */
export const chatCompletionSchema = z.object({
  model: z.string().min(1, "model is required"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      }),
    )
    .min(1, "messages must contain at least one message"),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  reasoning_effort: z.enum(["low", "medium", "high"]).optional(),
});

export type ValidatedChatRequest = z.infer<typeof chatCompletionSchema>;

/**
 * Middleware Hono que valida el body contra el schema de chat completions.
 * Si la validación falla, responde con un error 400 en formato OpenAI.
 */
export async function validateChatCompletion(c: Context, next: Next) {
  const body = await c.req.json();
  const result = chatCompletionSchema.safeParse(body);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");

    return c.json(
      {
        error: {
          message: `Invalid request: ${issues}`,
          type: "invalid_request_error",
          code: "validation_error",
        },
      },
      400,
    );
  }

  // Guardar el body validado en el contexto para que el handler lo use
  c.set("validatedBody", result.data);
  await next();
}
