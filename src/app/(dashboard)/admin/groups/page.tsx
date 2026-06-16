"use client";

import { useEffect, useState, useCallback } from "react";
import {
  App, Card, Table, Typography, Space, Button, Select,
  Tag, Modal, Form, Input, InputNumber, Alert, Empty, Divider,
} from "antd";
import { PlusOutlined, TeamOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Institution { id: number; name: string }
interface Specialty {
  id: number;
  name: string;
  code?: string;
  institution: Institution;
}

interface Group {
  id: number;
  name: string;
  course?: number;
  enrollmentYear?: number;
  specialty: { name: string; institution: { name: string } };
  _count: { students: number };
}

export default function AdminGroupsPage() {
  const { message } = App.useApp();
  const [groups, setGroups] = useState<Group[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modal: create group
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  // modal: create specialty (nested)
  const [spOpen, setSpOpen] = useState(false);
  const [spLoading, setSpLoading] = useState(false);
  const [spForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gr, sp, inst] = await Promise.all([
        fetch("/api/admin/groups").then((r) => r.json()),
        fetch("/api/admin/specialties").then((r) => r.json()),
        fetch("/api/admin/institutions").then((r) => r.json()),
      ]);
      setGroups(Array.isArray(gr) ? gr : (gr.items ?? []));
      setSpecialties(Array.isArray(sp) ? sp : (sp.items ?? []));
      const instList = Array.isArray(inst) ? inst : (inst.items ?? []);
      setInstitutions(instList);
    } catch {
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(values: { name: string; specialtyId: number; course?: number; enrollmentYear?: number }) {
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      message.success("Группа создана");
      setCreateOpen(false);
      form.resetFields();
      setGroups((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка создания группы");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleCreateSpecialty(values: { name: string; code?: string; institutionId: number }) {
    setSpLoading(true);
    try {
      const res = await fetch("/api/admin/specialties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");

      const inst = institutions.find((i) => i.id === values.institutionId);
      const newSp: Specialty = { ...data, institution: inst ?? { id: values.institutionId, name: "" } };
      setSpecialties((prev) => [...prev, newSp].sort((a, b) => a.name.localeCompare(b.name)));
      form.setFieldValue("specialtyId", data.id);

      message.success("Специальность добавлена");
      setSpOpen(false);
      spForm.resetFields();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка создания специальности");
    } finally {
      setSpLoading(false);
    }
  }

  const specialtyOptions = specialties.map((s) => ({
    label: `${s.name} — ${s.institution.name}`,
    value: s.id,
  }));

  const columns = [
    {
      title: "Название",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <Space>
          <TeamOutlined style={{ color: "#2563EB" }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Специальность / Заведение",
      key: "specialty",
      render: (g: Group) => (
        <div>
          <Text style={{ fontSize: 13 }}>{g.specialty?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{g.specialty?.institution?.name}</Text>
        </div>
      ),
    },
    {
      title: "Курс",
      dataIndex: "course",
      key: "course",
      width: 80,
      render: (v?: number) => v ? <Tag>{v} курс</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Год набора",
      dataIndex: "enrollmentYear",
      key: "enrollmentYear",
      width: 110,
      render: (v?: number) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Студентов",
      key: "students",
      width: 100,
      render: (g: Group) => <Tag color="blue">{g._count?.students ?? 0}</Tag>,
    },
  ];

  if (error) return <Alert type="error" message={error} showIcon />;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Группы студентов</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Управление учебными группами</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Создать группу
        </Button>
      </div>

      <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={groups}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t) => `Всего: ${t}` }}
          locale={{ emptyText: <Empty description="Групп нет" /> }}
          scroll={{ x: 700 }}
        />
      </Card>

      {/* Модал создания группы */}
      <Modal
        title="Создать группу"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item label="Название группы" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="СИС-21" />
          </Form.Item>

          <Form.Item label="Специальность" name="specialtyId" rules={[{ required: true, message: "Выберите специальность" }]}>
            <Select
              options={specialtyOptions}
              showSearch
              filterOption={(input, opt) =>
                String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              placeholder="Выберите или создайте новую"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "4px 0" }} />
                  <div style={{ padding: "4px 8px 8px" }}>
                    <Button
                      type="link"
                      icon={<PlusOutlined />}
                      style={{ padding: 0 }}
                      onClick={() => setSpOpen(true)}
                    >
                      Создать новую специальность
                    </Button>
                  </div>
                </>
              )}
            />
          </Form.Item>

          <Form.Item label="Курс" name="course">
            <InputNumber min={1} max={6} placeholder="3" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Год набора" name="enrollmentYear">
            <InputNumber min={2000} max={2100} placeholder="2022" style={{ width: "100%" }} />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setCreateOpen(false); form.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>Создать</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Модал создания специальности */}
      <Modal
        title="Новая специальность"
        open={spOpen}
        onCancel={() => { setSpOpen(false); spForm.resetFields(); }}
        footer={null}
        destroyOnClose
        zIndex={1100}
      >
        <Form form={spForm} layout="vertical" onFinish={handleCreateSpecialty} style={{ marginTop: 16 }}>
          <Form.Item label="Учебное заведение" name="institutionId" rules={[{ required: true, message: "Выберите заведение" }]}>
            <Select
              options={institutions.map((i) => ({ label: i.name, value: i.id }))}
              showSearch
              filterOption={(input, opt) =>
                String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              placeholder="Выберите учебное заведение"
            />
          </Form.Item>
          <Form.Item label="Название специальности" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="Системное администрирование" />
          </Form.Item>
          <Form.Item label="Код специальности" name="code">
            <Input placeholder="09.02.07" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setSpOpen(false); spForm.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={spLoading}>Добавить</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
