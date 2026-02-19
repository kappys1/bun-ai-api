/**
 * Formateo de respuestas SSE compatibles con la API de OpenAI.
 * Centraliza la construcción de chunks y respuestas completas.
 */

const encoder = new TextEncoder();

export function generateId(): string {
  return "chatcmpl-" + crypto.randomUUID().replaceAll("-", "").slice(0, 24);
}

export function timestamp(): number {
  return Math.floor(Date.now() / 1000);
}

// ── SSE Chunks ──

export function encodeSSE(data: string): Uint8Array {
  return encoder.encode(`data: ${data}\n\n`);
}

export function sseRoleChunk(id: string, model: string, created: number) {
  return encodeSSE(
    JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [
        {
          index: 0,
          delta: { role: "assistant", content: "" },
          finish_reason: null,
        },
      ],
    }),
  );
}

export function sseDeltaChunk(
  id: string,
  model: string,
  created: number,
  delta: Record<string, string>,
) {
  return encodeSSE(
    JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta, finish_reason: null }],
    }),
  );
}

export function sseDoneChunk(id: string, model: string, created: number) {
  return encodeSSE(
    JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    }),
  );
}

export function sseTerminator(): Uint8Array {
  return encoder.encode("data: [DONE]\n\n");
}

// ── Non-streaming response ──

export function buildChatCompletion(options: {
  id: string;
  model: string;
  created: number;
  content: string;
  reasoning?: string;
}) {
  return {
    id: options.id,
    object: "chat.completion",
    created: options.created,
    model: options.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: options.content,
          ...(options.reasoning && { reasoning: options.reasoning }),
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}
