import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import bcrypt from "bcryptjs";

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
    const { fullName, email, password, groupId, recordBookNo } = body;

    if (!fullName || !email || !password) {
      return err("Обязательные поля: ФИО, email, пароль", 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return err("Пользователь с таким email уже существует", 409);

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, fullName, passwordHash, role: "student" },
      });

      const student = groupId
        ? await tx.student.create({
            data: { userId: user.id, groupId: Number(groupId), recordBookNo: recordBookNo || null },
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
