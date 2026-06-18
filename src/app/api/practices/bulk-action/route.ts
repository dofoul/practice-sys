import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { z } from "zod";
import { notifyPracticeReviewed, notifyPracticeGraded } from "@/lib/notifications";

const schema = z.object({
  ids: z.array(z.number()).min(1, "Выберите хотя бы одну практику"),
  action: z.enum(["approve", "reject", "needs_revision", "grade"]),
  comment: z.string().optional(),
  grade: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "curator", "admin");
  if (roleError) return roleError;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0].message, 400);

  const { ids, action, comment, grade } = parsed.data;

  if (action === "grade" && !grade) return err("Укажите оценку", 400);

  const curator = session.user.role === "curator"
    ? await prisma.curator.findUnique({ where: { userId: Number(session.user.id) } })
    : null;

  // For curators — verify they have access to all selected practices
  if (curator) {
    const allowed = await prisma.practice.findMany({
      where: { id: { in: ids } },
      include: { student: true },
    });
    const groupIds = (await prisma.groupCurator.findMany({
      where: { curatorId: curator.id },
      select: { groupId: true },
    })).map((gc) => gc.groupId);

    const unauthorized = allowed.filter((p) => !groupIds.includes(p.student.groupId));
    if (unauthorized.length > 0) return err("Нет доступа к некоторым практикам", 403);
  }

  const statusMap: Record<string, string> = {
    approve: "approved",
    reject: "rejected",
    needs_revision: "needs_revision",
    grade: "completed",
  };
  const newStatus = statusMap[action];

  // Filter to practices in valid status for the action
  const validStatuses: Record<string, string[]> = {
    approve: ["submitted"],
    reject: ["submitted"],
    needs_revision: ["submitted"],
    grade: ["approved"],
  };

  const practices = await prisma.practice.findMany({
    where: { id: { in: ids }, status: { in: validStatuses[action] as never[] } },
    include: { student: { include: { user: { select: { id: true } } } } },
  });

  if (practices.length === 0) {
    return err("Нет практик в подходящем статусе для этого действия", 400);
  }

  const curatorId = curator?.id ?? 0;

  await prisma.$transaction(async (tx) => {
    const practiceIds = practices.map((p) => p.id);

    await tx.practice.updateMany({
      where: { id: { in: practiceIds } },
      data: {
        status: newStatus as never,
        ...(action === "grade" ? { grade } : {}),
      },
    });

    await tx.practiceReview.createMany({
      data: practices.map((p) => ({
        practiceId: p.id,
        curatorId,
        oldStatus: p.status,
        newStatus,
        comment: comment || (action === "grade" ? `Оценка: ${grade}` : undefined),
      })),
    });

    // Free slots for rejected or completed (graded) practices with offers
    if (action === "reject" || action === "grade") {
      const withOffers = practices.filter((p) => p.offerId);
      for (const p of withOffers) {
        await tx.practiceOffer.update({
          where: { id: p.offerId! },
          data: { slotsTaken: { decrement: 1 } },
        });
      }
    }
  });

  // Send notifications (fire-and-forget)
  for (const p of practices) {
    if (action === "grade") {
      notifyPracticeGraded(p.id, p.student.user.id, grade!).catch(console.error);
    } else {
      notifyPracticeReviewed(p.id, p.student.user.id, newStatus, comment).catch(console.error);
    }
  }

  return ok({ updated: practices.length });
}
