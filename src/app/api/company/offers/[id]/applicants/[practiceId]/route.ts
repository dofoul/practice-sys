import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { z } from "zod";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), comment: z.string().max(500).optional() }),
  z.object({ action: z.literal("grade"), grade: z.string().min(1).max(16) }),
]);

type Params = { params: Promise<{ id: string; practiceId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const roleErr = requireRole(session, "company");
  if (roleErr) return roleErr;

  const { id, practiceId } = await params;

  const company = await prisma.company.findUnique({
    where: { ownerUserId: Number(session.user.id) },
  });
  if (!company) return err("Компания не найдена", 404);

  const offer = await prisma.practiceOffer.findUnique({ where: { id: Number(id) } });
  if (!offer || offer.companyId !== company.id) return err("Вакансия не найдена", 404);

  const practice = await prisma.practice.findUnique({
    where: { id: Number(practiceId) },
    include: {
      student: { include: { user: { select: { id: true, fullName: true } } } },
    },
  });
  if (!practice || practice.offerId !== offer.id) return err("Заявка не найдена", 404);

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0].message, 400);

  const { action } = parsed.data;

  if (action === "approve") {
    if (practice.status === "approved" || practice.status === "completed") {
      return err("Заявка уже принята", 400);
    }
    if (practice.status === "rejected") {
      return err("Нельзя принять отклонённую заявку", 400);
    }

    await prisma.$transaction([
      prisma.practice.update({
        where: { id: practice.id },
        data: { status: "approved" },
      }),
      prisma.notification.create({
        data: {
          userId: practice.student.user.id,
          type: "practice_approved_by_company",
          title: "Заявка принята предприятием",
          body: `${company.name} приняли вашу заявку на практику «${offer.title}».`,
          link: `/practices/${practice.id}`,
        },
      }),
    ]);
  } else if (action === "reject") {
    if (practice.status === "rejected") return err("Заявка уже отклонена", 400);
    if (practice.status === "completed") return err("Нельзя отклонить завершённую практику", 400);

    const comment = "comment" in parsed.data ? parsed.data.comment : undefined;

    await prisma.$transaction([
      prisma.practice.update({
        where: { id: practice.id },
        data: { status: "rejected" },
      }),
      prisma.notification.create({
        data: {
          userId: practice.student.user.id,
          type: "practice_rejected_by_company",
          title: "Заявка отклонена предприятием",
          body: comment
            ? `${company.name} отклонили вашу заявку на «${offer.title}»: ${comment}`
            : `${company.name} отклонили вашу заявку на практику «${offer.title}».`,
          link: `/practices/${practice.id}`,
        },
      }),
    ]);
  } else if (action === "grade") {
    if (practice.status !== "approved" && practice.status !== "completed") {
      return err("Оценку можно выставить только принятой или завершённой практике", 400);
    }

    const grade = "grade" in parsed.data ? parsed.data.grade : "";

    await prisma.$transaction([
      prisma.practice.update({
        where: { id: practice.id },
        data: { grade, status: "completed" },
      }),
      prisma.notification.create({
        data: {
          userId: practice.student.user.id,
          type: "practice_graded",
          title: "Практика завершена",
          body: `${company.name} выставили оценку «${grade}» за практику «${offer.title}».`,
          link: `/practices/${practice.id}`,
        },
      }),
    ]);
  }

  const updated = await prisma.practice.findUnique({
    where: { id: practice.id },
    include: {
      student: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          group: { select: { name: true } },
        },
      },
      period: { select: { name: true } },
    },
  });

  return ok(updated);
}
