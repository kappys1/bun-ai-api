import { getModelEntry, getNextProvider, modelMatrix } from "./models";
import { providerRegistry } from "./services/registry";
import type { OpenAIChatRequest } from "./types";

// ── Helpers ──

function generateId() {
  return "chatcmpl-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

// ── Server ──

const server = Bun.serve({
  port: process.env.PORT ?? 3000,
  async fetch(req) {
    const { pathname } = new URL(req.url);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ── GET /v1/models ──
    if (req.method === "GET" && pathname === "/v1/models") {
      const models = modelMatrix.map((m) => ({
        id: m.id,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: m.owned_by ?? "bun-ai-api",
        permission: [],
        root: m.id,
        parent: null,
      }));

      return jsonResponse({ object: "list", data: models });
    }

    // ── POST /v1/chat/completions ──
    if (req.method === "POST" && pathname === "/v1/chat/completions") {
      const body = (await req.json()) as OpenAIChatRequest;
      const { model: modelId, messages, stream = false } = body;

      // Buscar el modelo en la matriz
      const entry = getModelEntry(modelId);
      if (!entry) {
        return jsonResponse(
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

      // Elegir provider (round-robin)
      const providerMapping = getNextProvider(entry);
      const provider = providerRegistry[providerMapping.providerKey];
      if (!provider) {
        return jsonResponse(
          {
            error: {
              message: `Provider '${providerMapping.providerKey}' is not configured.`,
              type: "server_error",
              code: "provider_unavailable",
            },
          },
          503,
        );
      }

      console.log(
        `[${entry.id}] → ${provider.name} (${providerMapping.model})${entry.reasoning ? " 🧠" : ""}`,
      );

      const config = {
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        top_p: body.top_p,
        reasoning: entry.reasoning,
        reasoning_effort: body.reasoning_effort,
      };

      try {
        const chunks = await provider.chat(
          providerMapping.model,
          messages,
          config,
        );

        // ── Streaming (SSE) ──
        if (stream) {
          const chatId = generateId();
          const created = Math.floor(Date.now() / 1000);

          const sseStream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();

              // Primer chunk con role
              const firstChunk = {
                id: chatId,
                object: "chat.completion.chunk",
                created,
                model: entry.id,
                choices: [
                  {
                    index: 0,
                    delta: { role: "assistant", content: "" },
                    finish_reason: null,
                  },
                ],
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(firstChunk)}\n\n`),
              );

              // Estado para parsear bloques <think>...</think> en streaming
              let insideThink = false;
              let buffer = "";

              const enqueueChunk = (delta: Record<string, string>) => {
                const chunk = {
                  id: chatId,
                  object: "chat.completion.chunk",
                  created,
                  model: entry.id,
                  choices: [{ index: 0, delta, finish_reason: null }],
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
                );
              };

              /**
               * Procesa el buffer acumulado buscando tags <think> y </think>.
               * Emite chunks con { reasoning, content: "" } dentro de bloques
               * de pensamiento, y { content } fuera. Estilo Ollama.
               */
              const flushBuffer = () => {
                while (buffer.length > 0) {
                  if (insideThink) {
                    const closeIdx = buffer.indexOf("</think>");
                    if (closeIdx === -1) {
                      // Podría haber un </think> parcial al final, retener
                      if (buffer.length >= 8) {
                        const safe = buffer.slice(0, -7);
                        buffer = buffer.slice(safe.length);
                        if (safe)
                          enqueueChunk({ content: "", reasoning: safe });
                      }
                      break;
                    } else {
                      const reasoning = buffer.slice(0, closeIdx);
                      buffer = buffer.slice(closeIdx + "</think>".length);
                      insideThink = false;
                      if (reasoning) enqueueChunk({ content: "", reasoning });
                    }
                  } else {
                    const openIdx = buffer.indexOf("<think>");
                    if (openIdx === -1) {
                      // Podría haber un <think> parcial al final, retener
                      if (buffer.length >= 7) {
                        const safe = buffer.slice(0, -6);
                        buffer = buffer.slice(safe.length);
                        if (safe) enqueueChunk({ content: safe });
                      }
                      break;
                    } else {
                      const content = buffer.slice(0, openIdx);
                      buffer = buffer.slice(openIdx + "<think>".length);
                      insideThink = true;
                      if (content) enqueueChunk({ content });
                    }
                  }
                }
              };

              for await (const text of chunks) {
                if (!text) continue;
                buffer += text;
                flushBuffer();
              }

              // Vaciar lo que quede en el buffer
              if (buffer) {
                if (insideThink) {
                  enqueueChunk({ content: "", reasoning: buffer });
                } else {
                  enqueueChunk({ content: buffer });
                }
              }

              // Chunk final
              const doneChunk = {
                id: chatId,
                object: "chat.completion.chunk",
                created,
                model: entry.id,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`),
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });

          return new Response(sseStream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              ...corsHeaders(),
            },
          });
        }

        // ── Non-streaming ──
        let fullContent = "";
        for await (const text of chunks) {
          fullContent += text;
        }

        // Separar reasoning de content para respuesta non-streaming
        const thinkRegex = /^([\s\S]*?)<think>([\s\S]*?)<\/think>([\s\S]*)$/;
        const thinkMatch = thinkRegex.exec(fullContent);
        let responseContent = fullContent;
        let responseReasoning: string | undefined;
        if (thinkMatch) {
          responseReasoning = thinkMatch[2]!.trim();
          responseContent = (thinkMatch[1]! + thinkMatch[3]!).trim();
        }

        return jsonResponse({
          id: generateId(),
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: entry.id,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: responseContent,
                ...(responseReasoning && { reasoning: responseReasoning }),
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        });
      } catch (error: any) {
        console.error(`[${entry.id}] Error:`, error.message ?? error);
        return jsonResponse(
          {
            error: {
              message: error.message ?? "Internal server error",
              type: "server_error",
              code: "provider_error",
            },
          },
          500,
        );
      }
    }

    // ── Fallback ──
    return jsonResponse(
      {
        error: {
          message:
            "Not found. Available endpoints: GET /v1/models, POST /v1/chat/completions",
          type: "invalid_request_error",
          code: "not_found",
        },
      },
      404,
    );
  },
});

console.log(`🚀 OpenAI-compatible API running on ${server.url}`);
console.log(`📋 Models available: ${modelMatrix.map((m) => m.id).join(", ")}`);
