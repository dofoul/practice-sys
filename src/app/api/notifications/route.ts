import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = Number(session.user.id);
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? 20));
  const skip = (page - 1) * pageSize;

  const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return ok({ items, total, page, pageSize, unreadCount });
}
