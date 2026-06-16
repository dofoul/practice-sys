import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "curator", "admin");
  if (roleError) return roleError;

  try {
    const userId = Number(session.user.id);
    const role = session.user.role;

    if (role === "admin") {
      const groups = await prisma.group.findMany({
        include: {
          specialty: { include: { institution: { select: { name: true } } } },
          students: {
            include: {
              user: { select: { fullName: true, email: true } },
              practices: { include: { practiceType: { select: { name: true } } } },
            },
          },
        },
        orderBy: { name: "asc" },
      });
      return ok(groups);
    }

    const curator = await prisma.curator.findUnique({
      where: { userId },
      include: {
        groupCurators: {
          include: {
            group: {
              include: {
                specialty: { include: { institution: { select: { name: true } } } },
                students: {
                  include: {
                    user: { select: { fullName: true, email: true } },
                    practices: { include: { practiceType: { select: { name: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const groups = curator?.groupCurators.map((gc) => gc.group) ?? [];
    return ok(groups);
  } catch (e) {
    console.error(e);
    return err("Ошибка загрузки групп", 500);
  }
}
