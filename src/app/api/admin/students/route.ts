import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createStudentSchema = z.object({
  fullName: z.string().min(2, "ФИО обязательно").max(255),
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
  groupId: z.number().int().positive().optional().nullable(),
  recordBookNo: z.string().max(64).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin", "curator");
  if (roleError) return roleError;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 20));
  const search = searchParams.get("search") ?? "";
  const groupId = searchParams.get("groupId");

  const where = {
    role: "student" as const,
    ...(search ? {
      OR: [
        { fullName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { student: { recordBookNo: { contains: search, mode: "insensitive" as const } } },
      ],
    } : {}),
    ...(groupId ? { student: { groupId: Number(groupId) } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { fullName: "asc" },
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
    }),
    prisma.user.count({ where }),
  ]);

  return ok({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  try {
    const body = await req.json();
    const parsed = createStudentSchema.safeParse({
      ...body,
      groupId: body.groupId ? Number(body.groupId) : null,
    });
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const { fullName, email, password, groupId, recordBookNo } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return err("Пользователь с таким email уже существует", 409);

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, fullName, passwordHash, role: "student" },
      });

      const student = groupId
        ? await tx.student.create({
            data: { userId: user.id, groupId: groupId!, recordBookNo: recordBookNo || null },
          })
        : null;

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isActive: user.isActive,
        student: student ? { id: student.id, recordBookNo: student.recordBookNo, group: null } : null,
      };
    });

    return ok(result, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания студента", 500);
  }
}
