import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

// id = userId
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  const { id } = await params;
  const userId = Number(id);
  const body = await req.json();
  const { fullName, isActive, position, department, groupIds } = body;

  const user = await prisma.user.findUnique({ where: { id: userId, role: "curator" } });
  if (!user) return err("Куратор не найден", 404);

  try {
    await prisma.$transaction(async (tx) => {
      // Update user fields
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(fullName ? { fullName } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });

      // Upsert curator profile
      const curator = await tx.curator.upsert({
        where: { userId },
        create: { userId, position: position ?? null, department: department ?? null },
        update: { position: position ?? null, department: department ?? null },
      });

      // Replace group assignments if provided
      if (Array.isArray(groupIds)) {
        await tx.groupCurator.deleteMany({ where: { curatorId: curator.id } });
        if (groupIds.length > 0) {
          await tx.groupCurator.createMany({
            data: groupIds.map((gid: number) => ({ groupId: gid, curatorId: curator.id })),
            skipDuplicates: true,
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
        curator: {
          select: {
            id: true,
            position: true,
            department: true,
            groupCurators: {
              select: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    specialty: { select: { name: true } },
                    _count: { select: { students: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Ошибка обновления куратора", 500);
  }
}
