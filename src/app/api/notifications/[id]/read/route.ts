import { requireAuth, ok, err } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const notification = await prisma.notification.findUnique({ where: { id: Number(id) } });

  if (!notification || notification.userId !== Number(session.user.id)) {
    return err("Не найдено", 404);
  }

  await prisma.notification.update({ where: { id: Number(id) }, data: { isRead: true } });
  return ok({ success: true });
}
