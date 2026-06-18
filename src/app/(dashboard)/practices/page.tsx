"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, Table, Typography, Space, Button, Input, Select, Tag,
  Tooltip, Empty, Alert, Modal, Form, App,
} from "antd";
import {
  PlusOutlined, EyeOutlined, SearchOutlined,
  CheckCircleOutlined, CloseCircleOutlined, EditOutlined, TrophyOutlined,
  DownloadOutlined, TeamOutlined,
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
  const [periodFilter, setPeriodFilter] = useState<number | undefined>();
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [groupFilter, setGroupFilter] = useState<number | undefined>();

  // Bulk actions
  const [exportLoading, setExportLoading] = useState<"practices" | "students" | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkModal, setBulkModal] = useState<"approve" | "reject" | "needs_revision" | "grade" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkForm] = Form.useForm();

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
        ...(groupFilter ? { groupId: String(groupFilter) } : {}),
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
  }, [page, pageSize, search, statusFilter, periodFilter, groupFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/admin/periods").then((r) => r.json()).then((d) => setPeriods(d.items || []));
    fetch("/api/admin/groups").then((r) => r.json()).then((d) => setGroups(d.items || d || []));
  }, []);

  async function handleExport(type: "practices" | "students") {
    setExportLoading(type);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (periodFilter) params.set("periodId", String(periodFilter));
      if (groupFilter) params.set("groupId", String(groupFilter));
      const res = await fetch(`/api/export/${type}?${params}`);
      if (!res.ok) throw new Error("Ошибка экспорта");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? `${type}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error("Не удалось выгрузить файл");
    } finally {
      setExportLoading(null);
    }
  }

  async function handleBulkAction(values: { comment?: string; grade?: string }) {
    if (!bulkModal) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/practices/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action: bulkModal, ...values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      message.success(`Обновлено практик: ${data.updated}`);
      setSelectedIds([]);
      setBulkModal(null);
      bulkForm.resetFields();
      load();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBulkLoading(false);
    }
  }

  const canBulk = role === "curator" || role === "admin";

  const columns = [
    ...(role !== "student" ? [{
      title: "Студент",
      key: "student",
      render: (r: Practice) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.student?.user?.fullName ?? "—"}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.student?.group?.name}</Text>
        </div>
      ),
    }] : []),
    { title: "Тип практики", dataIndex: ["practiceType", "name"], key: "type" },
    { title: "Период", dataIndex: ["period", "name"], key: "period", ellipsis: true },
    {
      title: "Место", key: "place", ellipsis: true,
      render: (r: Practice) => r.offer?.company?.name ?? r.customPlace ?? "—",
    },
    {
      title: "Статус", key: "status",
      render: (r: Practice) => <PracticeStatusTag status={r.status} />,
    },
    {
      title: "Оценка", key: "grade",
      render: (r: Practice) => r.grade ? <Tag color="green">{r.grade}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Обновлено", key: "updated",
      render: (r: Practice) => dayjs(r.updatedAt).format("DD.MM.YYYY"),
    },
    {
      title: "", key: "action", fixed: "right" as const, width: 80,
      render: (r: Practice) => (
        <Tooltip title="Открыть">
          <Link href={`/practices/${r.id}`}>
            <Button type="text" icon={<EyeOutlined />} />
          </Link>
        </Tooltip>
      ),
    },
  ];

  const BULK_CONFIG = {
    approve:        { title: "Принять практики",             icon: <CheckCircleOutlined />, color: "#16A34A", needsComment: true,  needsGrade: false },
    reject:         { title: "Отклонить практики",           icon: <CloseCircleOutlined />, color: "#DC2626", needsComment: true,  needsGrade: false },
    needs_revision: { title: "Отправить на доработку",       icon: <EditOutlined />,        color: "#D97706", needsComment: true,  needsGrade: false },
    grade:          { title: "Выставить оценку",             icon: <TrophyOutlined />,      color: "#D97706", needsComment: false, needsGrade: true  },
  };

  const cfg = bulkModal ? BULK_CONFIG[bulkModal] : null;

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
        <Space wrap>
          {canBulk && (
            <>
              <Tooltip title="Выгрузить список практик в Excel">
                <Button
                  icon={<DownloadOutlined />}
                  loading={exportLoading === "practices"}
                  onClick={() => handleExport("practices")}
                >
                  Практики .xlsx
                </Button>
              </Tooltip>
              <Tooltip title="Выгрузить студентов с местами практики в Excel">
                <Button
                  icon={<TeamOutlined />}
                  loading={exportLoading === "students"}
                  onClick={() => handleExport("students")}
                >
                  Студенты .xlsx
                </Button>
              </Tooltip>
            </>
          )}
          {role === "student" && (
            <Link href="/catalog">
              <Button type="primary" icon={<PlusOutlined />}>Выбрать место практики</Button>
            </Link>
          )}
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      {/* Панель массовых действий */}
      {canBulk && selectedIds.length > 0 && (
        <Card
          style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8 }}
          styles={{ body: { padding: "12px 16px" } }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <Text strong style={{ color: "#1D4ED8" }}>
              Выбрано: {selectedIds.length} {selectedIds.length === 1 ? "практика" : selectedIds.length < 5 ? "практики" : "практик"}
            </Text>
            <Space size={8} wrap>
              <Button
                icon={<CheckCircleOutlined />}
                style={{ color: "#16A34A", borderColor: "#16A34A" }}
                onClick={() => setBulkModal("approve")}
              >
                Принять
              </Button>
              <Button
                icon={<EditOutlined />}
                style={{ color: "#D97706", borderColor: "#D97706" }}
                onClick={() => setBulkModal("needs_revision")}
              >
                На доработку
              </Button>
              <Button
                icon={<CloseCircleOutlined />}
                danger
                onClick={() => setBulkModal("reject")}
              >
                Отклонить
              </Button>
              <Button
                icon={<TrophyOutlined />}
                style={{ color: "#7C3AED", borderColor: "#7C3AED" }}
                onClick={() => setBulkModal("grade")}
              >
                Выставить оценку
              </Button>
              <Button type="text" onClick={() => setSelectedIds([])}>Снять выделение</Button>
            </Space>
          </div>
        </Card>
      )}

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
          {canBulk && (
            <Select
              placeholder="Группа"
              value={groupFilter}
              onChange={(v) => { setGroupFilter(v); setPage(1); }}
              allowClear
              style={{ width: 160 }}
              options={groups.map((g) => ({ label: g.name, value: g.id }))}
            />
          )}
        </Space>

        <Table
          dataSource={practices}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowSelection={canBulk ? {
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys as number[]),
            preserveSelectedRowKeys: true,
          } : undefined}
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

      {/* Модал массового действия */}
      <Modal
        title={cfg ? <Space>{cfg.icon}<span>{cfg.title}</span></Space> : ""}
        open={!!bulkModal}
        onCancel={() => { setBulkModal(null); bulkForm.resetFields(); }}
        footer={null}
        destroyOnHidden
      >
        {cfg && (
          <Form form={bulkForm} layout="vertical" onFinish={handleBulkAction} style={{ marginTop: 16 }}>
            <Alert
              type="info"
              message={`Действие будет применено к ${selectedIds.length} практикам. Статус изменится только у практик в подходящем статусе.`}
              style={{ marginBottom: 16 }}
            />
            {cfg.needsGrade && (
              <Form.Item label="Оценка" name="grade" rules={[{ required: true, message: "Введите оценку" }]}>
                <Select
                  placeholder="Выберите оценку"
                  options={[
                    { label: "Отлично (5)", value: "5" },
                    { label: "Хорошо (4)", value: "4" },
                    { label: "Удовлетворительно (3)", value: "3" },
                    { label: "Зачтено", value: "Зачтено" },
                    { label: "Не зачтено", value: "Не зачтено" },
                  ]}
                />
              </Form.Item>
            )}
            {cfg.needsComment && (
              <Form.Item label="Комментарий (необязательно)" name="comment">
                <Input.TextArea rows={3} placeholder="Общий комментарий для всех выбранных практик..." />
              </Form.Item>
            )}
            <div style={{ textAlign: "right" }}>
              <Space>
                <Button onClick={() => { setBulkModal(null); bulkForm.resetFields(); }}>Отмена</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={bulkLoading}
                  style={bulkModal === "reject" ? { background: "#DC2626" } : bulkModal === "approve" ? { background: "#16A34A" } : {}}
                >
                  Применить
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>
    </Space>
  );
}
