import type { Context, Next } from "hono";

/**
 * Middleware de autenticación Bearer token.
 * Compara el token del header Authorization contra API_TOKEN del .env.
 * Si API_TOKEN no está definido, la autenticación se desactiva (open access).
 */
export async function authMiddleware(c: Context, next: Next) {
  const apiToken = process.env.API_TOKEN;

  // Si no hay token configurado, permitir acceso libre
  if (!apiToken) {
    await next();
    return;
  }

  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    return c.json(
      {
        error: {
          message:
            "Missing Authorization header. Use: Authorization: Bearer <token>",
          type: "authentication_error",
          code: "missing_token",
        },
      },
      401,
    );
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (token !== apiToken) {
    return c.json(
      {
        error: {
          message: "Invalid API token.",
          type: "authentication_error",
          code: "invalid_token",
        },
      },
      401,
    );
  }

  await next();
}
