import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { reviewPracticeSchema } from "@/lib/validations/practice";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "curator", "admin");
  if (roleError) return roleError;

  const { id } = await params;
  const practice = await prisma.practice.findUnique({ where: { id: Number(id) } });
  if (!practice) return err("Практика не найдена", 404);

  if (practice.status !== "submitted") {
    return err("Проверять можно только практику в статусе «На проверке»", 400);
  }

  if (session.user.role === "curator") {
    const curator = await prisma.curator.findUnique({
      where: { userId: Number(session.user.id) },
      include: { groupCurators: { include: { group: { include: { students: true } } } } },
    });
    const studentIds = curator?.groupCurators.flatMap((gc) => gc.group.students.map((s) => s.id)) ?? [];
    if (!studentIds.includes(practice.studentId)) return err("Нет доступа к данной практике", 403);
  }

  try {
    const body = await req.json();
    const parsed = reviewPracticeSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const curator = await prisma.curator.findUnique({ where: { userId: Number(session.user.id) } });

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.practice.update({
        where: { id: Number(id) },
        data: { status: parsed.data.status },
      });

      await tx.practiceReview.create({
        data: {
          practiceId: Number(id),
          curatorId: curator?.id ?? 0,
          oldStatus: practice.status,
          newStatus: parsed.data.status,
          comment: parsed.data.comment,
        },
      });

      // Free the reserved slot when a practice with an offer is rejected
      if (parsed.data.status === "rejected" && practice.offerId) {
        await tx.practiceOffer.update({
          where: { id: practice.offerId },
          data: { slotsTaken: { decrement: 1 } },
        });
      }

      return p;
    });

    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Ошибка при проверке практики", 500);
  }
}
