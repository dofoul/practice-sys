import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, err } from "@/lib/api";
import { PracticeStatus } from "@prisma/client";
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
  const status = searchParams.get("status");
  const groupId = searchParams.get("groupId");

  let whereClause: object = {};

  if (session.user.role === "curator") {
    const curator = await prisma.curator.findUnique({
      where: { userId: Number(session.user.id) },
      include: { groupCurators: { include: { group: { include: { students: true } } } } },
    });
    const studentIds = curator?.groupCurators.flatMap((gc) => gc.group.students.map((s) => s.id)) ?? [];
    whereClause = { studentId: { in: studentIds } };
  }

  const practices = await prisma.practice.findMany({
    where: {
      ...whereClause,
      ...(status ? { status: status as PracticeStatus } : {}),
      ...(periodId ? { periodId: Number(periodId) } : {}),
      ...(groupId ? { student: { groupId: Number(groupId) } } : {}),
    },
    include: {
      student: { include: { user: { select: { fullName: true, email: true } }, group: { select: { name: true } } } },
      practiceType: { select: { name: true } },
      period: { select: { name: true } },
      offer: { include: { company: { select: { name: true } } } },
    },
    orderBy: [{ period: { name: "asc" } }, { student: { user: { fullName: "asc" } } }],
  });

  const rows = practices.map((p) => ({
    "ФИО студента": p.student.user.fullName,
    "Email": p.student.user.email,
    "Группа": p.student.group.name,
    "Тип практики": p.practiceType.name,
    "Период": p.period.name,
    "Место практики": p.offer?.company.name ?? p.customPlace ?? "—",
    "Статус": STATUS_LABELS[p.status] ?? p.status,
    "Оценка": p.grade ?? "—",
    "Дата начала": p.dateStart ? dayjs(p.dateStart).format("DD.MM.YYYY") : "—",
    "Дата окончания": p.dateEnd ? dayjs(p.dateEnd).format("DD.MM.YYYY") : "—",
    "Последнее обновление": dayjs(p.updatedAt).format("DD.MM.YYYY"),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 30 }, { wch: 28 }, { wch: 12 }, { wch: 24 }, { wch: 30 },
    { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Практики");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `practices_${dayjs().format("YYYY-MM-DD")}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
