"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, Table, Typography, Input, Select, Space, Tag, Empty, Button,
} from "antd";
import { SearchOutlined, TeamOutlined, TrophyOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PracticeStatusTag } from "@/components/ui/PracticeStatusTag";

const { Title, Text } = Typography;

interface Practice {
  id: number;
  status: string;
  grade: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    user: { fullName: string; email: string; phone?: string };
    group: { name: string };
  };
  offer: { id: number; title: string };
  period: { name: string };
}

const STATUS_OPTIONS = [
  { value: "", label: "Все статусы" },
  { value: "draft", label: "Черновик" },
  { value: "submitted", label: "На проверке" },
  { value: "approved", label: "Принято" },
  { value: "rejected", label: "Отклонено" },
  { value: "completed", label: "Завершено" },
];

export default function CompanyStudentsPage() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const res = await fetch(`/api/company/students?${params}`);
      if (res.ok) setPractices(await res.json());
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      title: "Студент",
      key: "student",
      render: (r: Practice) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 13 }}>{r.student.user.fullName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.student.group.name} · {r.student.user.email}
          </Text>
          {r.student.user.phone && (
            <Text type="secondary" style={{ fontSize: 12 }}>{r.student.user.phone}</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Вакансия",
      key: "offer",
      render: (r: Practice) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 13 }}>{r.offer.title}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.period.name}</Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      key: "status",
      width: 140,
      render: (r: Practice) => (
        <Space direction="vertical" size={4}>
          <PracticeStatusTag status={r.status} />
          {r.grade && (
            <Tag color="gold" style={{ fontSize: 11 }}>
              <TrophyOutlined /> {r.grade}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Дата записи",
      key: "date",
      width: 120,
      render: (r: Practice) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(r.createdAt).format("DD.MM.YYYY")}
        </Text>
      ),
    },
    {
      title: "Обновлено",
      key: "updated",
      width: 120,
      render: (r: Practice) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(r.updatedAt).format("DD.MM.YYYY")}
        </Text>
      ),
    },
  ];

  const stats = {
    total: practices.length,
    approved: practices.filter((p) => p.status === "approved").length,
    completed: practices.filter((p) => p.status === "completed").length,
    pending: practices.filter((p) => ["draft", "submitted"].includes(p.status)).length,
  };

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>Мои студенты</Title>
        <Text type="secondary">Все студенты, записавшиеся на ваши вакансии</Text>
      </div>

      {/* Быстрая статистика */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Всего", value: stats.total, color: "#2563eb" },
          { label: "Ожидают решения", value: stats.pending, color: "#d97706" },
          { label: "Принято", value: stats.approved, color: "#16a34a" },
          { label: "Завершено", value: stats.completed, color: "#7c3aed" },
        ].map((s) => (
          <Card
            key={s.label}
            size="small"
            style={{ minWidth: 130, borderRadius: 8, textAlign: "center" }}
          >
            <Text style={{ fontSize: 24, fontWeight: 700, color: s.color, display: "block" }}>
              {s.value}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>
          </Card>
        ))}
      </div>

      <Card>
        {/* Фильтры */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Поиск по ФИО студента"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
            style={{ width: 180 }}
          />
          <Button icon={<TeamOutlined />} onClick={load}>
            Обновить
          </Button>
        </div>

        <Table
          dataSource={practices}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (total) => `Всего: ${total}` }}
          locale={{ emptyText: <Empty description="Студентов пока нет" /> }}
          scroll={{ x: 700 }}
        />
      </Card>
    </Space>
  );
}
