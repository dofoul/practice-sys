"use client";

import { useEffect, useState, useCallback } from "react";
import {
  App, Card, Table, Typography, Space, Button, Input, Select,
  Tag, Modal, Form, Switch, Tooltip, Alert, Empty, Badge,
} from "antd";
import {
  PlusOutlined, EditOutlined, SearchOutlined, UserOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface User {
  id: number;
  email: string;
  fullName: string;
  role: "student" | "curator" | "admin";
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  student: { label: "Студент", color: "blue" },
  curator: { label: "Куратор", color: "purple" },
  admin: { label: "Администратор", color: "red" },
};

export default function AdminUsersPage() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [modal, setModal] = useState<{ open: boolean; user?: User }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(search ? { search } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.items);
      setTotal(data.total);
    } catch {
      setError("Не удалось загрузить список пользователей");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    form.resetFields();
    setModal({ open: true });
  }

  function openEdit(user: User) {
    form.setFieldsValue({ ...user });
    setModal({ open: true, user });
  }

  async function handleSave(values: {
    email: string;
    fullName: string;
    role: string;
    phone?: string;
    password?: string;
    isActive: boolean;
  }) {
    setSaving(true);
    try {
      const isEdit = !!modal.user;
      const url = isEdit ? `/api/admin/users/${modal.user!.id}` : "/api/admin/users";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success(isEdit ? "Пользователь обновлён" : "Пользователь создан");
      setModal({ open: false });
      load();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      title: "ФИО / Email",
      key: "name",
      render: (u: User) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{u.fullName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{u.email}</Text>
        </div>
      ),
    },
    {
      title: "Роль",
      key: "role",
      render: (u: User) => {
        const r = ROLE_LABELS[u.role];
        return <Tag color={r?.color}>{r?.label ?? u.role}</Tag>;
      },
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone",
      render: (v?: string) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Статус",
      key: "status",
      render: (u: User) => (
        <Badge
          status={u.isActive ? "success" : "error"}
          text={u.isActive ? "Активен" : "Заблокирован"}
        />
      ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: (u: User) => (
        <Tooltip title="Редактировать">
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(u)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Пользователи</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Управление аккаунтами — {total}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Создать</Button>
      </div>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      <Card>
        <Space style={{ marginBottom: 16 }} size={8}>
          <Input
            placeholder="Поиск по ФИО, email..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="Роль"
            value={roleFilter}
            onChange={(v) => { setRoleFilter(v); setPage(1); }}
            allowClear
            style={{ width: 160 }}
            options={Object.entries(ROLE_LABELS).map(([v, { label }]) => ({ label, value: v }))}
          />
        </Space>

        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t) => `Всего: ${t}` }}
          locale={{ emptyText: <Empty description="Пользователи не найдены" /> }}
          scroll={{ x: 600 }}
        />
      </Card>

      <Modal
        title={modal.user ? "Редактировать пользователя" : "Создать пользователя"}
        open={modal.open}
        onCancel={() => setModal({ open: false })}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}
          initialValues={{ isActive: true, role: "student" }}>
          <Form.Item label="ФИО" name="fullName" rules={[{ required: true, message: "Введите ФИО" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Введите email" }]}>
            <Input />
          </Form.Item>
          {!modal.user && (
            <Form.Item label="Пароль" name="password" rules={[{ required: true, min: 8, message: "Минимум 8 символов" }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item label="Роль" name="role" rules={[{ required: true }]}>
            <Select options={Object.entries(ROLE_LABELS).map(([v, { label }]) => ({ label, value: v }))} />
          </Form.Item>
          <Form.Item label="Телефон" name="phone">
            <Input placeholder="+7 (999) 000-00-00" />
          </Form.Item>
          <Form.Item label="Активен" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setModal({ open: false })}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Сохранить</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
