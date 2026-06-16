"use client";

import { Tag } from "antd";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  uploaded: { label: "Загружен", color: "processing" },
  accepted: { label: "Принят", color: "success" },
  rejected: { label: "Отклонён", color: "error" },
};

interface DocumentStatusTagProps {
  status: string;
}

export function DocumentStatusTag({ status }: DocumentStatusTagProps) {
  const config = STATUS_MAP[status] ?? { label: status, color: "default" };
  return <Tag color={config.color}>{config.label}</Tag>;
}
