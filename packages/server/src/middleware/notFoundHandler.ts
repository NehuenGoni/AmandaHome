import type { Request, Response } from "express";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: "Recurso no encontrado", code: "NOT_FOUND" });
}
