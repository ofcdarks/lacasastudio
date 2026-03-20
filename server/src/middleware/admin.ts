import { Response, NextFunction } from "express";
import prisma from "../db/prisma";

export async function requireAdmin(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.isAdmin) {
      res.status(403).json({ error: "Acesso negado — apenas administradores" });
      return;
    }
    next();
  } catch (err) { next(err); }
}
