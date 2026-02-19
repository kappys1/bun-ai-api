/**
 * Parsing unificado de bloques <think>...</think>.
 * Una sola implementación para streaming y non-streaming.
 */

export interface ThinkChunk {
  type: "reasoning" | "content";
  text: string;
}

/**
 * Parsea un AsyncIterable de texto y separa bloques <think>...</think>
 * emitiendo chunks tipados. Soporta múltiples bloques de pensamiento.
 */
export async function* parseThinkStream(
  source: AsyncIterable<string>,
): AsyncGenerator<ThinkChunk> {
  let insideThink = false;
  let buffer = "";

  const OPEN_TAG = "<think>";
  const CLOSE_TAG = "</think>";

  for await (const text of source) {
    if (!text) continue;
    buffer += text;

    while (buffer.length > 0) {
      if (insideThink) {
        const closeIdx = buffer.indexOf(CLOSE_TAG);
        if (closeIdx === -1) {
          // Retener posible tag parcial al final
          if (buffer.length >= CLOSE_TAG.length) {
            const safe = buffer.slice(0, -(CLOSE_TAG.length - 1));
            buffer = buffer.slice(safe.length);
            if (safe) yield { type: "reasoning", text: safe };
          }
          break;
        } else {
          const reasoning = buffer.slice(0, closeIdx);
          buffer = buffer.slice(closeIdx + CLOSE_TAG.length);
          insideThink = false;
          if (reasoning) yield { type: "reasoning", text: reasoning };
        }
      } else {
        const openIdx = buffer.indexOf(OPEN_TAG);
        if (openIdx === -1) {
          // Retener posible tag parcial al final
          if (buffer.length >= OPEN_TAG.length) {
            const safe = buffer.slice(0, -(OPEN_TAG.length - 1));
            buffer = buffer.slice(safe.length);
            if (safe) yield { type: "content", text: safe };
          }
          break;
        } else {
          const content = buffer.slice(0, openIdx);
          buffer = buffer.slice(openIdx + OPEN_TAG.length);
          insideThink = true;
          if (content) yield { type: "content", text: content };
        }
      }
    }
  }

  // Vaciar lo que quede en el buffer
  if (buffer) {
    yield {
      type: insideThink ? "reasoning" : "content",
      text: buffer,
    };
  }
}

/**
 * Parsea texto completo y extrae todos los bloques <think>...</think>.
 * Soporta múltiples bloques (a diferencia del regex original).
 */
export function parseThinkComplete(fullText: string): {
  reasoning: string;
  content: string;
} {
  let reasoning = "";
  let content = "";
  let remaining = fullText;

  while (remaining.length > 0) {
    const openIdx = remaining.indexOf("<think>");
    if (openIdx === -1) {
      content += remaining;
      break;
    }

    content += remaining.slice(0, openIdx);
    remaining = remaining.slice(openIdx + "<think>".length);

    const closeIdx = remaining.indexOf("</think>");
    if (closeIdx === -1) {
      // Tag sin cerrar — tratar el resto como reasoning
      reasoning += remaining;
      remaining = "";
    } else {
      reasoning += remaining.slice(0, closeIdx);
      remaining = remaining.slice(closeIdx + "</think>".length);
    }
  }

  return {
    reasoning: reasoning.trim(),
    content: content.trim(),
  };
}
