import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ok, err } from "@/lib/api";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";

const commentSchema = z.object({
  content: z.string().min(1, "Сообщение не может быть пустым").max(2000, "Сообщение слишком длинное"),
});

async function canAccess(practiceId: number, userId: number, role: string) {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: { student: true },
  });
  if (!practice) return null;
  if (role === "student" && practice.student.userId !== userId) return null;
  if (role === "curator") {
    const curator = await prisma.curator.findUnique({
      where: { userId },
      include: { groupCurators: { select: { groupId: true } } },
    });
    const groupIds = curator?.groupCurators.map((g) => g.groupId) ?? [];
    if (!groupIds.includes(practice.student.groupId)) return null;
  }
  return practice;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const practice = await canAccess(Number(id), Number(session.user.id), session.user.role);
  if (!practice) return err("Практика не найдена или нет доступа", 404);

  const comments = await prisma.practiceComment.findMany({
    where: { practiceId: Number(id) },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, fullName: true, role: true } } },
  });

  return ok(comments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!["student", "curator", "admin"].includes(session.user.role)) {
    return err("Нет доступа", 403);
  }

  const { id } = await params;
  const practiceId = Number(id);
  const userId = Number(session.user.id);

  const practice = await canAccess(practiceId, userId, session.user.role);
  if (!practice) return err("Практика не найдена или нет доступа", 404);

  const body = await req.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0].message, 400);

  const comment = await prisma.practiceComment.create({
    data: { practiceId, userId, content: parsed.data.content },
    include: { author: { select: { id: true, fullName: true, role: true } } },
  });

  // Notify the other party
  const authorName = comment.author.fullName;
  const link = `/practices/${practiceId}`;

  if (session.user.role === "student") {
    // Notify curators of this student's group
    const curators = await prisma.groupCurator.findMany({
      where: { groupId: practice.student.groupId },
      include: { curator: true },
    });
    await Promise.all(
      curators.map((gc) =>
        createNotification({
          userId: gc.curator.userId,
          type: "practice_comment",
          title: "Новое сообщение от студента",
          body: `${authorName}: ${parsed.data.content.slice(0, 100)}${parsed.data.content.length > 100 ? "…" : ""}`,
          link,
        })
      )
    );
  } else {
    // Notify the student
    const student = await prisma.student.findUnique({
      where: { id: practice.studentId },
      include: { user: { select: { id: true } } },
    });
    if (student) {
      await createNotification({
        userId: student.user.id,
        type: "practice_comment",
        title: "Новое сообщение от куратора",
        body: `${authorName}: ${parsed.data.content.slice(0, 100)}${parsed.data.content.length > 100 ? "…" : ""}`,
        link,
      });
    }
  }

  return ok(comment, 201);
}
