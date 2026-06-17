import { requireAuth, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;

  await prisma.notification.updateMany({
    where: { userId: Number(session.user.id), isRead: false },
    data: { isRead: true },
  });

  return ok({ success: true });
}
