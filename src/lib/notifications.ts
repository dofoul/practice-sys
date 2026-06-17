import { prisma } from "@/lib/db";

export type NotificationType =
  | "practice_submitted"
  | "practice_reviewed"
  | "practice_graded"
  | "practice_needs_revision"
  | "practice_approved"
  | "practice_completed"
  | "document_reviewed"
  | "diary_exported"
  | "practice_comment";

interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: input });
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return;
  return prisma.notification.createMany({ data: inputs });
}

// Helpers for each event

export async function notifyPracticeSubmitted(practiceId: number, studentName: string, curatorUserIds: number[]) {
  await createNotifications(
    curatorUserIds.map((uid) => ({
      userId: uid,
      type: "practice_submitted" as NotificationType,
      title: "Новая практика на проверке",
      body: `Студент ${studentName} подал практику на проверку.`,
      link: `/practices/${practiceId}`,
    }))
  );
}

export async function notifyPracticeReviewed(
  practiceId: number,
  studentUserId: number,
  newStatus: string,
  comment?: string
) {
  const statusLabels: Record<string, { title: string; body: string; type: NotificationType }> = {
    approved: {
      type: "practice_approved",
      title: "Практика принята",
      body: "Куратор принял вашу практику. Ожидайте оценку.",
    },
    rejected: {
      type: "practice_reviewed",
      title: "Практика отклонена",
      body: comment ? `Причина: ${comment}` : "Куратор отклонил вашу практику.",
    },
    needs_revision: {
      type: "practice_needs_revision",
      title: "Практика отправлена на доработку",
      body: comment ? `Комментарий куратора: ${comment}` : "Исправьте замечания и подайте снова.",
    },
    completed: {
      type: "practice_completed",
      title: "Практика завершена",
      body: "Поздравляем! Ваша практика успешно завершена.",
    },
  };

  const info = statusLabels[newStatus];
  if (!info) return;

  await createNotification({
    userId: studentUserId,
    type: info.type,
    title: info.title,
    body: info.body,
    link: `/practices/${practiceId}`,
  });
}

export async function notifyPracticeGraded(practiceId: number, studentUserId: number, grade: string) {
  await createNotification({
    userId: studentUserId,
    type: "practice_graded",
    title: "Выставлена оценка",
    body: `За вашу практику выставлена оценка: ${grade}.`,
    link: `/practices/${practiceId}`,
  });
}

export async function notifyDocumentReviewed(
  practiceId: number,
  studentUserId: number,
  docTypeName: string,
  status: "accepted" | "rejected",
  comment?: string
) {
  const accepted = status === "accepted";
  await createNotification({
    userId: studentUserId,
    type: "document_reviewed",
    title: accepted ? "Документ принят" : "Документ отклонён",
    body: accepted
      ? `Документ «${docTypeName}» принят куратором.`
      : `Документ «${docTypeName}» отклонён.${comment ? ` Причина: ${comment}` : ""}`,
    link: `/practices/${practiceId}`,
  });
}
