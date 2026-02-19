import type { Context } from "hono";
import type { ValidatedChatRequest } from "../middleware/validation";
import { getModelEntry, getProvidersWithFallback } from "../models";
import { providerRegistry } from "../services/registry";
import {
  buildChatCompletion,
  generateId,
  sseDeltaChunk,
  sseDoneChunk,
  sseRoleChunk,
  sseTerminator,
  timestamp,
} from "../utils/sse-formatter";
import { parseThinkComplete, parseThinkStream } from "../utils/think-parser";

/**
 * POST /v1/chat/completions
 * Handler modular con retry/fallback entre providers.
 */
export async function completionsHandler(c: Context) {
  const body = c.get("validatedBody") as ValidatedChatRequest;
  const { model: modelId, messages, stream: isStream } = body;

  // Buscar modelo en la matriz
  const entry = getModelEntry(modelId);
  if (!entry) {
    return c.json(
      {
        error: {
          message: `Model '${modelId}' not found. Use GET /v1/models to list available models.`,
          type: "invalid_request_error",
          code: "model_not_found",
        },
      },
      404,
    );
  }

  const config = {
    temperature: body.temperature,
    max_tokens: body.max_tokens,
    top_p: body.top_p,
    reasoning: entry.reasoning,
    reasoning_effort: body.reasoning_effort,
  };

  // Intentar cada provider con fallback
  const providers = getProvidersWithFallback(entry);
  let lastError: Error | null = null;

  for (const mapping of providers) {
    if (!mapping) continue;
    const provider = providerRegistry[mapping.providerKey];
    if (!provider) continue;

    console.log(
      `[${entry.id}] → ${provider.name} (${mapping.model})${entry.reasoning ? " 🧠" : ""}`,
    );

    try {
      const chunks = await provider.chat(mapping.model, messages, config);

      if (isStream) {
        return handleStream(c, entry.id, chunks);
      } else {
        return handleNonStream(c, entry.id, chunks);
      }
    } catch (error: any) {
      lastError = error;
      console.warn(
        `[${entry.id}] Provider ${provider.name} failed: ${error.message ?? error}. Trying next...`,
      );
      continue;
    }
  }

  // Todos los providers fallaron
  console.error(`[${entry.id}] All providers failed.`);
  return c.json(
    {
      error: {
        message: lastError?.message ?? "All providers failed",
        type: "server_error",
        code: "provider_error",
      },
    },
    500,
  );
}

// ── Streaming (SSE) ──

function handleStream(
  c: Context,
  modelId: string,
  chunks: AsyncIterable<string>,
) {
  const chatId = generateId();
  const created = timestamp();

  const sseStream = new ReadableStream({
    async start(controller) {
      // Primer chunk con role
      controller.enqueue(sseRoleChunk(chatId, modelId, created));

      // Parsear think tags y emitir chunks
      for await (const chunk of parseThinkStream(chunks)) {
        if (chunk.type === "reasoning") {
          controller.enqueue(
            sseDeltaChunk(chatId, modelId, created, {
              content: "",
              reasoning: chunk.text,
            }),
          );
        } else {
          controller.enqueue(
            sseDeltaChunk(chatId, modelId, created, {
              content: chunk.text,
            }),
          );
        }
      }

      // Chunks finales
      controller.enqueue(sseDoneChunk(chatId, modelId, created));
      controller.enqueue(sseTerminator());
      controller.close();
    },
  });

  return new Response(sseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ── Non-streaming ──

async function handleNonStream(
  c: Context,
  modelId: string,
  chunks: AsyncIterable<string>,
) {
  let fullContent = "";
  for await (const text of chunks) {
    fullContent += text;
  }

  const { reasoning, content } = parseThinkComplete(fullContent);

  return c.json(
    buildChatCompletion({
      id: generateId(),
      model: modelId,
      created: timestamp(),
      content,
      ...(reasoning && { reasoning }),
    }),
  );
}
