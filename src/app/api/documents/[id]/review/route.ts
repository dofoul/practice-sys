import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { reviewDocumentSchema } from "@/lib/validations/practice";
import { notifyDocumentReviewed } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "curator", "admin");
  if (roleError) return roleError;

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id: Number(id) } });
  if (!document) return err("Документ не найден", 404);

  try {
    const body = await req.json();
    const parsed = reviewDocumentSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const updated = await prisma.document.update({
      where: { id: Number(id) },
      data: { status: parsed.data.status, reviewComment: parsed.data.comment },
      include: { documentType: { select: { name: true } }, practice: { include: { student: { include: { user: { select: { id: true } } } } } } },
    });

    await notifyDocumentReviewed(
      document.practiceId,
      updated.practice.student.user.id,
      updated.documentType.name,
      parsed.data.status as "accepted" | "rejected",
      parsed.data.comment
    ).catch(console.error);

    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Ошибка проверки документа", 500);
  }
}
