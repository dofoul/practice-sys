import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/api";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  submitted: "На проверке",
  needs_revision: "На доработке",
  approved: "Принято",
  rejected: "Отклонено",
  completed: "Завершено",
};

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "curator", "admin");
  if (roleError) return roleError;

  const { searchParams } = req.nextUrl;
  const periodId = searchParams.get("periodId");

  let groupIds: number[] | undefined;

  if (session.user.role === "curator") {
    const curator = await prisma.curator.findUnique({
      where: { userId: Number(session.user.id) },
      include: { groupCurators: { select: { groupId: true } } },
    });
    groupIds = curator?.groupCurators.map((gc) => gc.groupId) ?? [];
  }

  const students = await prisma.student.findMany({
    where: groupIds ? { groupId: { in: groupIds } } : {},
    include: {
      user: { select: { fullName: true, email: true } },
      group: { select: { name: true } },
      practices: {
        where: periodId ? { periodId: Number(periodId) } : {},
        include: {
          practiceType: { select: { name: true } },
          period: { select: { name: true } },
          offer: { include: { company: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ group: { name: "asc" } }, { user: { fullName: "asc" } }],
  });

  const rows: object[] = [];

  for (const student of students) {
    if (student.practices.length === 0) {
      rows.push({
        "ФИО студента": student.user.fullName,
        "Email": student.user.email,
        "Группа": student.group.name,
        "Тип практики": "—",
        "Период": "—",
        "Место практики": "—",
        "Статус": "Нет практики",
        "Оценка": "—",
      });
    } else {
      for (const p of student.practices) {
        rows.push({
          "ФИО студента": student.user.fullName,
          "Email": student.user.email,
          "Группа": student.group.name,
          "Тип практики": p.practiceType.name,
          "Период": p.period.name,
          "Место практики": p.offer?.company.name ?? p.customPlace ?? "—",
          "Статус": STATUS_LABELS[p.status] ?? p.status,
          "Оценка": p.grade ?? "—",
        });
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 30 }, { wch: 28 }, { wch: 12 }, { wch: 24 },
    { wch: 30 }, { wch: 28 }, { wch: 16 }, { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Студенты");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `students_practices_${dayjs().format("YYYY-MM-DD")}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
