import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(64),
  specialtyId: z.number().int().positive("Выберите специальность"),
  course: z.number().int().min(1).max(6).optional().nullable(),
  enrollmentYear: z.number().int().min(2000).max(2100).optional().nullable(),
});

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
    const body = await req.json();
    const parsed = createGroupSchema.safeParse({
      ...body,
      specialtyId: body.specialtyId ? Number(body.specialtyId) : undefined,
      course: body.course ? Number(body.course) : null,
      enrollmentYear: body.enrollmentYear ? Number(body.enrollmentYear) : null,
    });
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const { name, specialtyId, course, enrollmentYear } = parsed.data;

    const group = await prisma.group.create({
      data: { name, specialtyId, course: course ?? null, enrollmentYear: enrollmentYear ?? null },
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
