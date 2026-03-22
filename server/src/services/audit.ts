import prisma from "../db/prisma";
import logger from "./logger";

const AuditService = {
  async log(userId: number, action: string, resource: string, resourceId?: number | string, details?: string, ip?: string): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId: resourceId ? String(resourceId) : "",
          details: details || "",
          ip: ip || "",
        },
      });
    } catch (err: unknown) {
      logger.error("Audit log failed", { action, resource, error: String(err) });
    }
  },

  async loginSuccess(userId: number, ip: string): Promise<void> {
    await this.log(userId, "login", "auth", undefined, "Login successful", ip);
  },

  async loginFailed(email: string, ip: string): Promise<void> {
    // userId 0 for failed logins
    await this.log(0, "login_failed", "auth", undefined, `Failed login attempt: ${email}`, ip);
  },

  async configChanged(userId: number, key: string, ip: string): Promise<void> {
    await this.log(userId, "config_change", "settings", key, `Setting "${key}" updated`, ip);
  },

  async dataDeleted(userId: number, resource: string, resourceId: number, ip: string): Promise<void> {
    await this.log(userId, "delete", resource, resourceId, undefined, ip);
  },

  async adminAction(userId: number, action: string, details: string, ip: string): Promise<void> {
    await this.log(userId, `admin_${action}`, "admin", undefined, details, ip);
  },
};

export default AuditService;
