import { requireAuth, ok, err } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = Number(session.user.id);
  const role = session.user.role;

  try {
    let whereClause = {};

    if (role === "student") {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (!student) return ok({ stats: { total: 0, submitted: 0, approved: 0, needsRevision: 0 }, recent: [] });
      whereClause = { studentId: student.id };
    } else if (role === "curator") {
      const curator = await prisma.curator.findUnique({
        where: { userId },
        include: { groupCurators: { include: { group: { include: { students: true } } } } },
      });
      const studentIds = curator?.groupCurators.flatMap((gc) => gc.group.students.map((s) => s.id)) ?? [];
      whereClause = { studentId: { in: studentIds } };
    }

    const [total, submitted, approved, needsRevision] = await Promise.all([
      prisma.practice.count({ where: whereClause }),
      prisma.practice.count({ where: { ...whereClause, status: "submitted" } }),
      prisma.practice.count({ where: { ...whereClause, status: { in: ["approved", "completed"] } } }),
      prisma.practice.count({ where: { ...whereClause, status: "needs_revision" } }),
    ]);

    const recent = await prisma.practice.findMany({
      where: role === "student" ? whereClause : { ...whereClause, status: { in: ["submitted", "needs_revision"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        practiceType: { select: { name: true } },
        period: { select: { name: true } },
        student: { include: { user: { select: { fullName: true } } } },
      },
    });

    return ok({ stats: { total, submitted, approved, needsRevision }, recent });
  } catch (e) {
    console.error(e);
    return err("Ошибка сервера", 500);
  }
}
