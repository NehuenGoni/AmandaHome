import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

type RequestSource = "body" | "query" | "params";

/** Valida y reemplaza `req[source]` por los datos parseados (con defaults/coerciones aplicados). */
export function validateRequest(schema: ZodSchema, source: RequestSource = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    req[source] = result.data as never;
    next();
  };
}
