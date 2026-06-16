"use client";

import { useEffect, useState, useCallback } from "react";
import {
  App, Card, Table, Typography, Space, Button, Input, Select,
  Tag, Modal, Form, Tooltip, Alert, Empty, Badge,
} from "antd";
import { PlusOutlined, EditOutlined, SearchOutlined, TeamOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Group { id: number; name: string; specialty: { name: string } }
interface Student {
  id: number;
  recordBookNo?: string;
  user: { id: number; fullName: string; email: string; isActive: boolean };
  group: { id: number; name: string; specialty: { name: string } };
}

export default function AdminStudentsPage() {
  const { message } = App.useApp();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<number | undefined>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [modal, setModal] = useState<{ open: boolean; student?: Student }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(search ? { search } : {}),
        ...(groupFilter ? { groupId: String(groupFilter) } : {}),
      });
      const res = await fetch(`/api/admin/students?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStudents(data.items);
      setTotal(data.total);
    } catch {
      setError("Не удалось загрузить список студентов");
    } finally {
      setLoading(false);
    }
  }, [page, search, groupFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/groups").then((r) => r.json()).then((d) => setGroups(Array.isArray(d) ? d : (d.items || [])));
  }, []);

  function openCreate() {
    form.resetFields();
    setModal({ open: true });
  }

  function openEdit(student: Student) {
    form.setFieldsValue({
      fullName: student.user.fullName,
      email: student.user.email,
      groupId: student.group.id,
      recordBookNo: student.recordBookNo,
    });
    setModal({ open: true, student });
  }

  async function handleSave(values: {
    fullName: string;
    email: string;
    password?: string;
    groupId: number;
    recordBookNo?: string;
  }) {
    setSaving(true);
    try {
      const isEdit = !!modal.student;

      if (isEdit) {
        const res = await fetch(`/api/admin/students/${modal.student!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        message.success("Студент обновлён");
      } else {
        const res = await fetch("/api/admin/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        message.success("Студент добавлен");
      }

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
      render: (s: Student) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{s.user.fullName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{s.user.email}</Text>
        </div>
      ),
    },
    {
      title: "Группа",
      key: "group",
      render: (s: Student) => (
        <div>
          <Tag color="blue" icon={<TeamOutlined />}>{s.group.name}</Tag>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 2 }}>
            {s.group.specialty.name}
          </Text>
        </div>
      ),
    },
    {
      title: "Зачётная книжка",
      key: "recordBook",
      render: (s: Student) => s.recordBookNo ? <Tag>{s.recordBookNo}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Статус",
      key: "status",
      render: (s: Student) => (
        <Badge
          status={s.user.isActive ? "success" : "error"}
          text={s.user.isActive ? "Активен" : "Заблокирован"}
        />
      ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: (s: Student) => (
        <Tooltip title="Редактировать">
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(s)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Студенты</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Управление студентами и группами — {total}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить студента
        </Button>
      </div>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      <Card>
        <Space style={{ marginBottom: 16 }} size={8}>
          <Input
            placeholder="Поиск по ФИО, email, зачётке..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder="Группа"
            value={groupFilter}
            onChange={(v) => { setGroupFilter(v); setPage(1); }}
            allowClear
            style={{ width: 160 }}
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
          />
        </Space>

        <Table
          dataSource={students}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: setPage,
            showTotal: (t) => `Всего: ${t}`,
          }}
          locale={{ emptyText: <Empty description="Студенты не найдены" /> }}
          scroll={{ x: 600 }}
        />
      </Card>

      <Modal
        title={modal.student ? "Редактировать студента" : "Добавить студента"}
        open={modal.open}
        onCancel={() => setModal({ open: false })}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item label="ФИО" name="fullName" rules={[{ required: true, message: "Введите ФИО" }]}>
            <Input placeholder="Иванов Иван Иванович" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Введите email" },
              { type: "email", message: "Неверный формат" },
            ]}
          >
            <Input placeholder="student@example.ru" disabled={!!modal.student} />
          </Form.Item>
          {!modal.student && (
            <Form.Item
              label="Пароль"
              name="password"
              rules={[{ required: true, min: 8, message: "Минимум 8 символов" }]}
            >
              <Input.Password placeholder="Минимум 8 символов" />
            </Form.Item>
          )}
          <Form.Item label="Группа" name="groupId" rules={[{ required: true, message: "Выберите группу" }]}>
            <Select
              placeholder="Выберите группу"
              showSearch
              optionFilterProp="label"
              options={groups.map((g) => ({
                label: `${g.name} — ${g.specialty.name}`,
                value: g.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="Номер зачётной книжки" name="recordBookNo">
            <Input placeholder="2024-001" />
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
