import { Hono } from "hono";
import { cors } from "hono/cors";
import { completionsHandler } from "./handlers/completions";
import { modelsHandler } from "./handlers/models";
import { validateChatCompletion } from "./middleware/validation";

const app = new Hono();

// ── Middleware global ──
app.use("*", cors());

// ── Routes ──
app.get("/v1/models", modelsHandler);
app.post("/v1/chat/completions", validateChatCompletion, completionsHandler);

// ── Fallback ──
app.all("*", (c) =>
  c.json(
    {
      error: {
        message:
          "Not found. Available endpoints: GET /v1/models, POST /v1/chat/completions",
        type: "invalid_request_error",
        code: "not_found",
      },
    },
    404,
  ),
);

// ── Server ──
const port = process.env.PORT ?? 3000;

export default {
  port,
  fetch: app.fetch,
};

console.log(`🚀 bun-ai-api listening on http://localhost:${port}`);
