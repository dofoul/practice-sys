import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin", "curator");
  if (roleError) return roleError;

  const groups = await prisma.group.findMany({
    include: {
      specialty: { include: { institution: { select: { name: true } } } },
      _count: { select: { students: true } },
    },
    orderBy: { name: "asc" },
  });

  return ok(groups);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  try {
    const { name, specialtyId, course, enrollmentYear } = await req.json();
    if (!name || !specialtyId) return err("Название и специальность обязательны", 400);

    const group = await prisma.group.create({
      data: {
        name,
        specialtyId: Number(specialtyId),
        course: course ? Number(course) : null,
        enrollmentYear: enrollmentYear ? Number(enrollmentYear) : null,
      },
      include: {
        specialty: { include: { institution: { select: { name: true } } } },
        _count: { select: { students: true } },
      },
    });

    return ok(group, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания группы", 500);
  }
}
