import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  const { id } = await params;
  const body = await req.json();
  const { groupId, recordBookNo, fullName, isActive } = body;

  const student = await prisma.student.findUnique({ where: { id: Number(id) } });
  if (!student) return err("Студент не найден", 404);

  try {
    const [updatedStudent] = await prisma.$transaction([
      prisma.student.update({
        where: { id: Number(id) },
        data: {
          ...(groupId ? { groupId: Number(groupId) } : {}),
          ...(recordBookNo !== undefined ? { recordBookNo } : {}),
        },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          group: { select: { id: true, name: true } },
        },
      }),
      ...(fullName !== undefined || isActive !== undefined
        ? [prisma.user.update({
            where: { id: student.userId },
            data: {
              ...(fullName ? { fullName } : {}),
              ...(isActive !== undefined ? { isActive } : {}),
            },
          })]
        : []),
    ]);

    return ok(updatedStudent);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления", 500);
  }
}
