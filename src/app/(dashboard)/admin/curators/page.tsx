"use client";

import { useEffect, useState, useCallback } from "react";
import {
  App, Card, Table, Typography, Space, Button, Input, Select,
  Tag, Modal, Form, Tooltip, Alert, Empty, Badge, Divider, Avatar,
} from "antd";
import {
  PlusOutlined, EditOutlined, SearchOutlined,
  TeamOutlined, UserOutlined, BookOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Group {
  id: number;
  name: string;
  specialty: { name: string };
  _count: { students: number };
}

interface CuratorUser {
  id: number;         // userId
  fullName: string;
  email: string;
  isActive: boolean;
  curator: {
    id: number;
    position?: string | null;
    department?: string | null;
    groupCurators: { group: Group }[];
  } | null;
}

export default function AdminCuratorsPage() {
  const { message } = App.useApp();
  const [curators, setCurators] = useState<CuratorUser[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // main modal (create or edit)
  const [modal, setModal] = useState<{ open: boolean; curator?: CuratorUser }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(search ? { search } : {});
      const [cu, gr] = await Promise.all([
        fetch(`/api/admin/curators?${params}`).then((r) => r.json()),
        fetch("/api/admin/groups").then((r) => r.json()),
      ]);
      setCurators(Array.isArray(cu) ? cu : (cu.items ?? []));
      setAllGroups(Array.isArray(gr) ? gr : (gr.items ?? []));
    } catch {
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    form.resetFields();
    setModal({ open: true });
  }

  function openEdit(c: CuratorUser) {
    form.setFieldsValue({
      fullName: c.fullName,
      position: c.curator?.position,
      department: c.curator?.department,
      isActive: c.isActive,
      groupIds: c.curator?.groupCurators.map((gc) => gc.group.id) ?? [],
    });
    setModal({ open: true, curator: c });
  }

  async function handleSave(values: {
    fullName: string;
    email?: string;
    password?: string;
    position?: string;
    department?: string;
    isActive?: boolean;
    groupIds?: number[];
  }) {
    setSaving(true);
    try {
      const isEdit = !!modal.curator;

      if (isEdit) {
        const res = await fetch(`/api/admin/curators/${modal.curator!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Ошибка");
        setCurators((prev) => prev.map((c) => (c.id === modal.curator!.id ? data : c)));
        message.success("Куратор обновлён");
      } else {
        const res = await fetch("/api/admin/curators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Ошибка");
        setCurators((prev) => [...prev, data].sort((a, b) => a.fullName.localeCompare(b.fullName)));
        // assign groups if selected
        if (values.groupIds?.length) {
          await fetch(`/api/admin/curators/${data.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupIds: values.groupIds }),
          });
          load();
        }
        message.success("Куратор добавлен");
      }

      setModal({ open: false });
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const totalStudents = (c: CuratorUser) =>
    c.curator?.groupCurators.reduce((sum, gc) => sum + (gc.group._count?.students ?? 0), 0) ?? 0;

  const columns = [
    {
      title: "Куратор",
      key: "curator",
      render: (c: CuratorUser) => (
        <Space>
          <Avatar size={36} style={{ background: "#2563EB", flexShrink: 0 }} icon={<UserOutlined />} />
          <div>
            <Text strong style={{ fontSize: 13 }}>{c.fullName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{c.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Должность / Кафедра",
      key: "position",
      render: (c: CuratorUser) => (
        <div>
          {c.curator?.position
            ? <Text style={{ fontSize: 13 }}>{c.curator.position}</Text>
            : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
          {c.curator?.department && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{c.curator.department}</Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: "Закреплённые группы",
      key: "groups",
      render: (c: CuratorUser) => {
        const groups = c.curator?.groupCurators.map((gc) => gc.group) ?? [];
        if (groups.length === 0) return <Text type="secondary" style={{ fontSize: 12 }}>Не назначены</Text>;
        return (
          <Space size={4} wrap>
            {groups.map((g) => (
              <Tooltip key={g.id} title={g.specialty.name}>
                <Tag icon={<TeamOutlined />} color="blue">{g.name}</Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Студентов",
      key: "students",
      width: 100,
      render: (c: CuratorUser) => {
        const count = totalStudents(c);
        return (
          <Space>
            <BookOutlined style={{ color: "#64748B" }} />
            <Text style={{ fontSize: 13 }}>{count}</Text>
          </Space>
        );
      },
    },
    {
      title: "Статус",
      key: "status",
      width: 110,
      render: (c: CuratorUser) => (
        <Badge status={c.isActive ? "success" : "error"} text={c.isActive ? "Активен" : "Заблокирован"} />
      ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: (c: CuratorUser) => (
        <Tooltip title="Редактировать">
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(c)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Кураторы</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Управление кураторами и закреплёнными группами — {curators.length}
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить куратора
        </Button>
      </div>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      {/* Сводные карточки */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { label: "Всего кураторов", value: curators.length, color: "#2563EB" },
          { label: "Активных", value: curators.filter((c) => c.isActive).length, color: "#16A34A" },
          {
            label: "Групп закреплено",
            value: curators.reduce((s, c) => s + (c.curator?.groupCurators.length ?? 0), 0),
            color: "#D97706",
          },
          {
            label: "Студентов под наблюдением",
            value: curators.reduce((s, c) => s + totalStudents(c), 0),
            color: "#7C3AED",
          },
        ].map((stat) => (
          <Card key={stat.label} style={{ flex: 1, minWidth: 160, borderRadius: 8 }} styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{stat.label}</Text>
          </Card>
        ))}
      </div>

      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 8 }}>
        <div style={{ padding: "16px 16px 0" }}>
          <Input
            placeholder="Поиск по ФИО или email..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 320 }}
          />
        </div>
        <Table
          dataSource={curators}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="Кураторы не найдены" /> }}
          scroll={{ x: 800 }}
          style={{ marginTop: 8 }}
        />
      </Card>

      {/* Модал создания / редактирования */}
      <Modal
        title={modal.curator ? "Редактировать куратора" : "Добавить куратора"}
        open={modal.open}
        onCancel={() => { setModal({ open: false }); form.resetFields(); }}
        footer={null}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item label="ФИО" name="fullName" rules={[{ required: true, message: "Введите ФИО" }]}>
            <Input placeholder="Петрова Анна Сергеевна" />
          </Form.Item>

          {!modal.curator && (
            <>
              <Form.Item
                label="Email"
                name="email"
                rules={[{ required: true, message: "Введите email" }, { type: "email", message: "Неверный формат" }]}
              >
                <Input placeholder="curator@college.ru" />
              </Form.Item>
              <Form.Item
                label="Пароль"
                name="password"
                rules={[{ required: true, min: 8, message: "Минимум 8 символов" }]}
              >
                <Input.Password placeholder="Минимум 8 символов" />
              </Form.Item>
            </>
          )}

          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, color: "#64748B" }}>
            Профиль
          </Divider>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Form.Item label="Должность" name="position" style={{ marginBottom: 0 }}>
              <Input placeholder="Преподаватель" />
            </Form.Item>
            <Form.Item label="Кафедра / Отдел" name="department" style={{ marginBottom: 0 }}>
              <Input placeholder="Кафедра ИТ" />
            </Form.Item>
          </div>

          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, color: "#64748B", marginTop: 20 }}>
            Закреплённые группы
          </Divider>

          <Form.Item name="groupIds">
            <Select
              mode="multiple"
              placeholder="Выберите группы (можно несколько)"
              allowClear
              showSearch
              filterOption={(input, opt) =>
                String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={allGroups.map((g) => ({
                label: `${g.name} — ${g.specialty.name} (${g._count?.students ?? 0} студ.)`,
                value: g.id,
              }))}
              style={{ width: "100%" }}
            />
          </Form.Item>

          {modal.curator && (
            <Form.Item label="Статус" name="isActive" style={{ marginBottom: 12 }}>
              <Select
                options={[
                  { label: "Активен", value: true },
                  { label: "Заблокирован", value: false },
                ]}
              />
            </Form.Item>
          )}

          <div style={{ textAlign: "right", marginTop: 8 }}>
            <Space>
              <Button onClick={() => { setModal({ open: false }); form.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                {modal.curator ? "Сохранить" : "Создать"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
