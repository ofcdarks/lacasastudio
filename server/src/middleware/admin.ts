import { Response, NextFunction } from "express";
import prisma from "../db/prisma";

const ADMIN_EMAIL = "rudysilvaads@gmail.com";

export async function requireAdmin(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.isAdmin || user.email !== ADMIN_EMAIL) {
      res.status(403).json({ error: "Acesso negado — apenas o administrador autorizado" });
      return;
    }
    next();
  } catch (err) { next(err); }
}
