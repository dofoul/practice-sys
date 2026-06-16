"use client";

import { Tag } from "antd";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "default" },
  submitted: { label: "На проверке", color: "processing" },
  needs_revision: { label: "На доработке", color: "warning" },
  approved: { label: "Принято", color: "success" },
  rejected: { label: "Отклонено", color: "error" },
  completed: { label: "Завершено", color: "green" },
};

interface PracticeStatusTagProps {
  status: string;
}

export function PracticeStatusTag({ status }: PracticeStatusTagProps) {
  const config = STATUS_MAP[status] ?? { label: status, color: "default" };
  return <Tag color={config.color}>{config.label}</Tag>;
}
