import { requireAuth, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: {
      id: true, email: true, fullName: true, role: true, phone: true, isActive: true,
      student: { select: { id: true, recordBookNo: true, group: { select: { id: true, name: true } } } },
      curator: { select: { id: true, position: true, department: true } },
    },
  });

  return ok(user);
}
