import { Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: any, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`);
      res.status(400).json({ error: "Dados inválidos", details: errors });
      return;
    }
    req.validated = result.data;
    next();
  };
}
