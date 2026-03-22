import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../db/prisma";
import { getEnv } from "../services/env";

function getSecret(): string {
  return getEnv().JWT_SECRET;
}

export function authenticate(req: any, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], getSecret()) as { id: number; type?: string };
    if (decoded.type === "refresh") {
      res.status(401).json({ error: "Use access token, não refresh token" });
      return;
    }
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export function signAccessToken(payload: { id: number }): string {
  return jwt.sign({ ...payload, type: "access" }, getSecret(), { expiresIn: "7d" });
}

export function signRefreshToken(payload: { id: number }): string {
  return jwt.sign({ ...payload, type: "refresh" }, getSecret(), { expiresIn: "7d" });
}

// Legacy — keep for backward compat during migration
export function signToken(payload: { id: number }): string {
  return signAccessToken(payload);
}

export async function createRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

export async function rotateRefreshToken(oldToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  const record = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!record || record.revoked || record.expiresAt < new Date()) {
    if (record) {
      // Possible token reuse attack — revoke all user tokens
      await prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revoked: true } });
    }
    return null;
  }

  // Revoke old token and create new one
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  const newRefresh = await createRefreshToken(record.userId);
  const newAccess = signAccessToken({ id: record.userId });

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
}

export { getSecret as getJwtSecret };
