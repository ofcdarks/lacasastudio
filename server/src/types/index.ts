import { Request } from "express";

export interface AuthRequest extends Request {
  userId: number;
}

export interface ValidatedRequest<T = any> extends AuthRequest {
  validated: T;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuditEntry {
  userId: number;
  action: string;
  resource: string;
  resourceId?: number | string;
  details?: string;
  ip?: string;
}
