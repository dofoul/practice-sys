"use client";

import { useEffect, useState, useCallback } from "react";
import {
  App, Card, Table, Typography, Space, Button, Input, InputNumber, Select,
  Tag, Modal, Form, Tooltip, Alert, Empty, Badge, Divider,
} from "antd";
import { PlusOutlined, EditOutlined, SearchOutlined, TeamOutlined, WarningOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Institution { id: number; name: string }
interface Specialty { id: number; name: string; institution: Institution }
interface Group { id: number; name: string; specialty: { name: string } }

interface StudentUser {
  id: number;         // userId
  fullName: string;
  email: string;
  isActive: boolean;
  student: {
    id: number;
    recordBookNo?: string | null;
    group: { id: number; name: string; specialty: { name: string } } | null;
  } | null;
}

export default function AdminStudentsPage() {
  const { message } = App.useApp();
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<number | undefined>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [modal, setModal] = useState<{ open: boolean; student?: StudentUser }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // inline group creation
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupLoading, setNewGroupLoading] = useState(false);
  const [newGroupForm] = Form.useForm();

  // inline specialty creation (inside group modal)
  const [newSpOpen, setNewSpOpen] = useState(false);
  const [newSpLoading, setNewSpLoading] = useState(false);
  const [newSpForm] = Form.useForm();

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
    fetch("/api/admin/specialties").then((r) => r.json()).then((d) => setSpecialties(Array.isArray(d) ? d : (d.items || [])));
    fetch("/api/admin/institutions").then((r) => r.json()).then((d) => {
      setInstitutions(Array.isArray(d) ? d : (d.items || []));
    });
  }, []);

  async function handleCreateSpecialty(values: { name: string; code?: string; institutionId: number }) {
    setNewSpLoading(true);
    try {
      const res = await fetch("/api/admin/specialties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      const inst = institutions.find((i) => i.id === values.institutionId);
      setSpecialties((prev) => [...prev, { ...data, institution: inst ?? { id: values.institutionId, name: "" } }]);
      newGroupForm.setFieldValue("specialtyId", data.id);
      message.success("Специальность добавлена");
      setNewSpOpen(false);
      newSpForm.resetFields();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setNewSpLoading(false);
    }
  }

  async function handleCreateGroup(values: { name: string; specialtyId: number; course?: number; enrollmentYear?: number }) {
    setNewGroupLoading(true);
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      const sp = specialties.find((s) => s.id === values.specialtyId);
      const newGroup: Group = { id: data.id, name: data.name, specialty: { name: sp?.name ?? "" } };
      setGroups((prev) => [...prev, newGroup].sort((a, b) => a.name.localeCompare(b.name)));
      form.setFieldValue("groupId", data.id);
      message.success(`Группа "${data.name}" создана`);
      setNewGroupOpen(false);
      newGroupForm.resetFields();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setNewGroupLoading(false);
    }
  }

  function openCreate() {
    form.resetFields();
    setModal({ open: true });
  }

  function openEdit(s: StudentUser) {
    form.setFieldsValue({
      fullName: s.fullName,
      email: s.email,
      groupId: s.student?.group?.id,
      recordBookNo: s.student?.recordBookNo,
    });
    setModal({ open: true, student: s });
  }

  async function handleSave(values: {
    fullName: string;
    email: string;
    password?: string;
    groupId?: number;
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
      render: (s: StudentUser) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{s.fullName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{s.email}</Text>
        </div>
      ),
    },
    {
      title: "Группа",
      key: "group",
      render: (s: StudentUser) => {
        if (!s.student?.group) {
          return (
            <Tooltip title="Группа не назначена — нажмите редактировать">
              <Tag icon={<WarningOutlined />} color="warning">Не назначена</Tag>
            </Tooltip>
          );
        }
        return (
          <div>
            <Tag color="blue" icon={<TeamOutlined />}>{s.student.group.name}</Tag>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 2 }}>
              {s.student.group.specialty.name}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Зачётная книжка",
      key: "recordBook",
      render: (s: StudentUser) =>
        s.student?.recordBookNo ? <Tag>{s.student.recordBookNo}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Статус",
      key: "status",
      render: (s: StudentUser) => (
        <Badge
          status={s.isActive ? "success" : "error"}
          text={s.isActive ? "Активен" : "Заблокирован"}
        />
      ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: (s: StudentUser) => (
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
          <Text type="secondary" style={{ fontSize: 13 }}>Все пользователи с ролью «Студент» — {total}</Text>
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

      {/* Создание / редактирование студента */}
      <Modal
        title={modal.student ? "Редактировать студента" : "Добавить студента"}
        open={modal.open}
        onCancel={() => setModal({ open: false })}
        footer={null}
        width={520}
        destroyOnHidden={false}
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
          <Form.Item label="Группа" name="groupId">
            <Select
              placeholder="Выберите или создайте группу"
              showSearch
              optionFilterProp="label"
              allowClear
              options={groups.map((g) => ({
                label: `${g.name} — ${g.specialty.name}`,
                value: g.id,
              }))}
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "4px 0" }} />
                  <div style={{ padding: "4px 8px 8px" }}>
                    <Button type="link" icon={<PlusOutlined />} style={{ padding: 0 }} onClick={() => setNewGroupOpen(true)}>
                      Создать новую группу
                    </Button>
                  </div>
                </>
              )}
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

      {/* Создание группы */}
      <Modal
        title="Новая группа"
        open={newGroupOpen}
        onCancel={() => { setNewGroupOpen(false); newGroupForm.resetFields(); }}
        footer={null}
        destroyOnHidden={false}
        zIndex={1100}
      >
        <Form form={newGroupForm} layout="vertical" onFinish={handleCreateGroup} style={{ marginTop: 16 }}>
          <Form.Item label="Название группы" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="СИС-21" />
          </Form.Item>
          <Form.Item label="Специальность" name="specialtyId" rules={[{ required: true, message: "Выберите специальность" }]}>
            <Select
              options={specialties.map((s) => ({ label: `${s.name} — ${s.institution.name}`, value: s.id }))}
              showSearch
              filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
              placeholder="Выберите или создайте специальность"
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "4px 0" }} />
                  <div style={{ padding: "4px 8px 8px" }}>
                    <Button type="link" icon={<PlusOutlined />} style={{ padding: 0 }} onClick={() => setNewSpOpen(true)}>
                      Создать новую специальность
                    </Button>
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item label="Курс" name="course">
            <InputNumber min={1} max={6} style={{ width: "100%" }} placeholder="3" />
          </Form.Item>
          <Form.Item label="Год набора" name="enrollmentYear">
            <InputNumber min={2000} max={2100} style={{ width: "100%" }} placeholder="2022" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setNewGroupOpen(false); newGroupForm.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={newGroupLoading}>Создать</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Создание специальности */}
      <Modal
        title="Новая специальность"
        open={newSpOpen}
        onCancel={() => { setNewSpOpen(false); newSpForm.resetFields(); }}
        footer={null}
        destroyOnHidden={false}
        zIndex={1200}
      >
        <Form form={newSpForm} layout="vertical" onFinish={handleCreateSpecialty} style={{ marginTop: 16 }}>
          <Form.Item label="Учебное заведение" name="institutionId" rules={[{ required: true, message: "Выберите заведение" }]}>
            <Select
              options={institutions.map((i) => ({ label: i.name, value: i.id }))}
              showSearch
              filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
              placeholder="Выберите учебное заведение"
            />
          </Form.Item>
          <Form.Item label="Название специальности" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="Системное администрирование" />
          </Form.Item>
          <Form.Item label="Код специальности" name="code">
            <Input placeholder="09.02.06" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setNewSpOpen(false); newSpForm.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={newSpLoading}>Добавить</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
