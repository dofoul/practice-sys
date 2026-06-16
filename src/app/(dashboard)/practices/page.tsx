"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  Table,
  Typography,
  Space,
  Button,
  Input,
  Select,
  Tag,
  Tooltip,
  Empty,
  Alert,
  Modal,
  Form,
  App,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PracticeStatusTag } from "@/components/ui/PracticeStatusTag";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface Practice {
  id: number;
  status: string;
  grade?: string;
  practiceType: { name: string };
  period: { name: string };
  student?: { user: { fullName: string }; group: { name: string } };
  offer?: { company: { name: string } };
  customPlace?: string;
  updatedAt: string;
}

interface Period { id: number; name: string }
interface PracticeType { id: number; name: string }

export default function PracticesPage() {
  const { message } = App.useApp();
  const { data: session } = useSession();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([]);
  const [periodFilter, setPeriodFilter] = useState<number | undefined>();

  const role = session?.user?.role;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(periodFilter ? { periodId: String(periodFilter) } : {}),
      });
      const res = await fetch(`/api/practices?${params}`);
      if (!res.ok) throw new Error("Ошибка загрузки");
      const data = await res.json();
      setPractices(data.items);
      setTotal(data.total);
    } catch {
      setError("Не удалось загрузить список практик");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, periodFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/admin/periods").then((r) => r.json()).then((d) => setPeriods(d.items || []));
    fetch("/api/admin/dictionaries/practice-types").then((r) => r.json()).then((d) => setPracticeTypes(d || []));
  }, []);

  const columns = [
    ...(role !== "student"
      ? [
          {
            title: "Студент",
            key: "student",
            render: (r: Practice) => (
              <div>
                <Text strong style={{ fontSize: 13 }}>{r.student?.user?.fullName ?? "—"}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{r.student?.group?.name}</Text>
              </div>
            ),
          },
        ]
      : []),
    {
      title: "Тип практики",
      dataIndex: ["practiceType", "name"],
      key: "type",
    },
    {
      title: "Период",
      dataIndex: ["period", "name"],
      key: "period",
      ellipsis: true,
    },
    {
      title: "Место",
      key: "place",
      render: (r: Practice) => r.offer?.company?.name ?? r.customPlace ?? "—",
      ellipsis: true,
    },
    {
      title: "Статус",
      key: "status",
      render: (r: Practice) => <PracticeStatusTag status={r.status} />,
    },
    {
      title: "Оценка",
      key: "grade",
      render: (r: Practice) =>
        r.grade ? <Tag color="green">{r.grade}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Обновлено",
      key: "updated",
      render: (r: Practice) => dayjs(r.updatedAt).format("DD.MM.YYYY"),
    },
    {
      title: "",
      key: "action",
      fixed: "right" as const,
      width: 80,
      render: (r: Practice) => (
        <Tooltip title="Открыть">
          <Link href={`/practices/${r.id}`}>
            <Button type="text" icon={<EyeOutlined />} />
          </Link>
        </Tooltip>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {role === "student" ? "Мои практики" : role === "curator" ? "Практики студентов" : "Все практики"}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {total > 0 ? `Найдено: ${total}` : "Нет записей"}
          </Text>
        </div>
        {role === "student" && (
          <Link href="/catalog">
            <Button type="primary" icon={<PlusOutlined />}>
              Выбрать место практики
            </Button>
          </Link>
        )}
      </div>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      <Card style={{ padding: 0 }}>
        <Space style={{ marginBottom: 16, flexWrap: "wrap" }} size={8}>
          <Input
            placeholder="Поиск по студенту, месту..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="Статус"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            allowClear
            style={{ width: 160 }}
            options={[
              { label: "Черновик", value: "draft" },
              { label: "На проверке", value: "submitted" },
              { label: "На доработке", value: "needs_revision" },
              { label: "Принято", value: "approved" },
              { label: "Отклонено", value: "rejected" },
              { label: "Завершено", value: "completed" },
            ]}
          />
          <Select
            placeholder="Период"
            value={periodFilter}
            onChange={(v) => { setPeriodFilter(v); setPage(1); }}
            allowClear
            style={{ width: 220 }}
            options={periods.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Space>

        <Table
          dataSource={practices}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: setPage,
            showTotal: (t) => `Всего: ${t}`,
            showSizeChanger: false,
          }}
          locale={{ emptyText: <Empty description="Практики не найдены" /> }}
          scroll={{ x: 800 }}
        />
      </Card>
    </Space>
  );
}
