import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { createPracticeSchema } from "@/lib/validations/practice";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 15));
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");
  const periodId = searchParams.get("periodId");

  const userId = Number(session.user.id);
  const role = session.user.role;

  let whereClause: object = {};

  if (role === "student") {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return ok({ items: [], total: 0 });
    whereClause = { studentId: student.id };
  } else if (role === "curator") {
    const curator = await prisma.curator.findUnique({
      where: { userId },
      include: { groupCurators: { include: { group: { include: { students: true } } } } },
    });
    const studentIds = curator?.groupCurators.flatMap((gc) => gc.group.students.map((s) => s.id)) ?? [];
    whereClause = { studentId: { in: studentIds } };
  }

  const filters = {
    ...whereClause,
    ...(status ? { status } : {}),
    ...(periodId ? { periodId: Number(periodId) } : {}),
    ...(search ? {
      OR: [
        { student: { user: { fullName: { contains: search, mode: "insensitive" as const } } } },
        { customPlace: { contains: search, mode: "insensitive" as const } },
        { offer: { company: { name: { contains: search, mode: "insensitive" as const } } } },
      ],
    } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.practice.findMany({
      where: filters,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      include: {
        practiceType: { select: { name: true } },
        period: { select: { name: true } },
        student: { include: { user: { select: { fullName: true } }, group: { select: { name: true } } } },
        offer: { include: { company: { select: { name: true } } } },
      },
    }),
    prisma.practice.count({ where: filters }),
  ]);

  return ok({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== "student") return err("Только студент может создавать практику", 403);

  const userId = Number(session.user.id);

  try {
    const body = await req.json();
    const parsed = createPracticeSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return err("Профиль студента не найден. Обратитесь к администратору.", 404);

    const { offerId, practiceTypeId, periodId, customPlace, dateStart, dateEnd } = parsed.data;

    const period = await prisma.practicePeriod.findUnique({ where: { id: periodId } });
    if (!period) return err("Период практики не найден", 404);
    if (!period.isOpen) return err("Период практики закрыт для записи", 400);

    if (offerId) {
      const offer = await prisma.practiceOffer.findUnique({ where: { id: offerId } });
      if (!offer || !offer.isPublished) return err("Предложение не найдено или не опубликовано", 404);
      if (offer.slotsTaken >= offer.slotsTotal) return err("Свободных мест нет", 409);

      const practice = await prisma.$transaction(async (tx) => {
        await tx.practiceOffer.update({
          where: { id: offerId, slotsTaken: { lt: offer.slotsTotal } },
          data: { slotsTaken: { increment: 1 } },
        });

        const p = await tx.practice.create({
          data: {
            studentId: student.id,
            practiceTypeId,
            periodId,
            offerId,
            companyId: offer.companyId,
            status: "draft",
            dateStart: dateStart ? new Date(dateStart) : null,
            dateEnd: dateEnd ? new Date(dateEnd) : null,
          },
        });

        const templates = await tx.offerTemplate.findMany({ where: { offerId } });
        if (templates.length > 0) {
          await tx.document.createMany({
            data: templates.map((t) => ({
              practiceId: p.id,
              documentTypeId: t.documentTypeId,
              fileKey: t.fileKey,
              status: "uploaded",
              uploadedBy: userId,
            })),
          });
        }

        return p;
      });

      return ok(practice, 201);
    }

    const practice = await prisma.practice.create({
      data: {
        studentId: student.id,
        practiceTypeId,
        periodId,
        customPlace,
        status: "draft",
        dateStart: dateStart ? new Date(dateStart) : null,
        dateEnd: dateEnd ? new Date(dateEnd) : null,
      },
    });

    return ok(practice, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания практики", 500);
  }
}
