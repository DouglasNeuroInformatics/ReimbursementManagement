import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { ErrorCode } from "../lib/errorCodes.ts";
import { mapZodIssue, parseAcceptLanguage, translateError } from "../lib/i18n.ts";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = "AppError";
  }
}

export function errorHandler(err: Error, c: Context): Response {
  const locale = parseAcceptLanguage(c.req.header("Accept-Language"));

  if (err instanceof AppError) {
    return c.json(
      {
        error: translateError(err.code, locale, err.details),
        code: err.code,
        ...(err.details ? { details: err.details } : {}),
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
    );
  }
  if (err instanceof HTTPException) {
    return c.json({ error: err.message, code: "INTERNAL_ERROR" }, err.status);
  }
  if (err instanceof ZodError) {
    const issues = err.issues.map((iss) =>
      mapZodIssue(iss as unknown as Parameters<typeof mapZodIssue>[0])
    );
    return c.json(
      {
        error: translateError("VALIDATION_ERROR", locale),
        code: "VALIDATION_ERROR",
        details: { issues },
      },
      422,
    );
  }
  console.error("Unhandled error:", err);
  return c.json(
    { error: translateError("INTERNAL_ERROR", locale), code: "INTERNAL_ERROR" },
    500,
  );
}
