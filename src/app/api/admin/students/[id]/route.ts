import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

// id = userId (not student record id)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  const { id } = await params;
  const userId = Number(id);
  const body = await req.json();
  const { groupId, recordBookNo, fullName, isActive } = body;

  const user = await prisma.user.findUnique({ where: { id: userId, role: "student" } });
  if (!user) return err("Студент не найден", 404);

  try {
    await prisma.$transaction(async (tx) => {
      if (fullName !== undefined || isActive !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(fullName ? { fullName } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
          },
        });
      }

      if (groupId !== undefined || recordBookNo !== undefined) {
        const existing = await tx.student.findUnique({ where: { userId } });
        if (existing) {
          await tx.student.update({
            where: { userId },
            data: {
              ...(groupId ? { groupId: Number(groupId) } : {}),
              ...(recordBookNo !== undefined ? { recordBookNo: recordBookNo || null } : {}),
            },
          });
        } else if (groupId) {
          // First time assigning a group — create the student profile
          await tx.student.create({
            data: {
              userId,
              groupId: Number(groupId),
              recordBookNo: recordBookNo || null,
            },
          });
        }
      }
    });

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        student: {
          select: {
            id: true,
            recordBookNo: true,
            group: { select: { id: true, name: true, specialty: { select: { name: true } } } },
          },
        },
      },
    });

    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления", 500);
  }
}
