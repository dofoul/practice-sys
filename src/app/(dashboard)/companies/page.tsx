"use client";

import { useEffect, useState, useCallback } from "react";
import {
  App, Card, Row, Col, Typography, Space, Button, Input,
  Tag, Empty, Alert, Modal, Form, Divider,
} from "antd";
import {
  BankOutlined, PhoneOutlined, EnvironmentOutlined,
  IdcardOutlined, UserOutlined, PlusOutlined, SearchOutlined, EditOutlined,
} from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const { Title, Text } = Typography;

interface Company {
  id: number;
  name: string;
  inn?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
}

export default function CompaniesPage() {
  const { data: session } = useSession();
  const { message } = App.useApp();
  const role = session?.user?.role ?? "student";
  const canCreate = role === "admin" || role === "curator";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [filtered, setFiltered] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  const [editOpen, setEditOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dictionaries/companies");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list: Company[] = Array.isArray(data) ? data : (data.items ?? []);
      setCompanies(list);
      setFiltered(list);
    } catch {
      setError("Не удалось загрузить список предприятий");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(companies);
    } else {
      const q = search.toLowerCase();
      setFiltered(companies.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.inn ?? "").includes(q) ||
        (c.address ?? "").toLowerCase().includes(q) ||
        (c.contactPerson ?? "").toLowerCase().includes(q)
      ));
    }
  }, [search, companies]);

  async function handleCreate(values: Omit<Company, "id">) {
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/dictionaries/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      message.success("Предприятие добавлено");
      setCreateOpen(false);
      form.resetFields();
      setCompanies((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(company: Company) {
    setEditingCompany(company);
    editForm.setFieldsValue(company);
    setEditOpen(true);
  }

  async function handleEdit(values: Omit<Company, "id">) {
    if (!editingCompany) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/dictionaries/companies/${editingCompany.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      message.success("Предприятие обновлено");
      setEditOpen(false);
      setEditingCompany(null);
      setCompanies((prev) => prev.map((c) => c.id === editingCompany.id ? { ...c, ...values } : c));
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setEditLoading(false);
    }
  }

  if (loading) return <PageSkeleton variant="cards" />;
  if (error) return <Alert type="error" message={error} showIcon />;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Предприятия</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Организации, предоставляющие места для практики
          </Text>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Добавить предприятие
          </Button>
        )}
      </div>

      <Input
        prefix={<SearchOutlined />}
        placeholder="Поиск по названию, ИНН, адресу, контакту..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        allowClear
        style={{ maxWidth: 480 }}
      />

      {filtered.length === 0 ? (
        <Card>
          <Empty description={search ? "Ничего не найдено" : "Предприятий нет"} />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((c) => (
            <Col key={c.id} xs={24} sm={12} lg={8} xl={6}>
              <Card
                style={{ borderRadius: 8, height: "100%", border: "1px solid #E2E8F0" }}
                styles={{ body: { padding: 20 } }}
                extra={canCreate ? (
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(c)} />
                ) : undefined}
              >
                <Space align="start" style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 8, background: "#EFF6FF",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <BankOutlined style={{ fontSize: 20, color: "#2563EB" }} />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 14, display: "block", lineHeight: 1.3 }}>
                      {c.name}
                    </Text>
                    {c.inn && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ИНН: {c.inn}
                      </Text>
                    )}
                  </div>
                </Space>

                {(c.address || c.contactPerson || c.contactPhone) && (
                  <Divider style={{ margin: "12px 0" }} />
                )}

                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  {c.address && (
                    <Space size={6}>
                      <EnvironmentOutlined style={{ color: "#64748B", fontSize: 13 }} />
                      <Text style={{ fontSize: 12, color: "#475569" }}>{c.address}</Text>
                    </Space>
                  )}
                  {c.contactPerson && (
                    <Space size={6}>
                      <UserOutlined style={{ color: "#64748B", fontSize: 13 }} />
                      <Text style={{ fontSize: 12, color: "#475569" }}>{c.contactPerson}</Text>
                    </Space>
                  )}
                  {c.contactPhone && (
                    <Space size={6}>
                      <PhoneOutlined style={{ color: "#64748B", fontSize: 13 }} />
                      <Text style={{ fontSize: 12, color: "#475569" }}>{c.contactPhone}</Text>
                    </Space>
                  )}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Модал редактирования */}
      <Modal
        title="Редактировать предприятие"
        open={editOpen}
        onCancel={() => { setEditOpen(false); setEditingCompany(null); editForm.resetFields(); }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item label="Название" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="ИНН" name="inn">
            <Input placeholder="1234567890" />
          </Form.Item>
          <Form.Item label="Адрес" name="address">
            <Input placeholder="г. Москва, ул. Примерная, д. 1" />
          </Form.Item>
          <Form.Item label="Контактное лицо" name="contactPerson">
            <Input placeholder="Иванов Иван Иванович" />
          </Form.Item>
          <Form.Item label="Телефон" name="contactPhone">
            <Input placeholder="+7 (999) 123-45-67" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setEditOpen(false); setEditingCompany(null); editForm.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={editLoading}>Сохранить</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {canCreate && (
        <Modal
          title="Добавить предприятие"
          open={createOpen}
          onCancel={() => { setCreateOpen(false); form.resetFields(); }}
          footer={null}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
            <Form.Item label="Название" name="name" rules={[{ required: true, message: "Введите название" }]}>
              <Input placeholder='ООО "Название компании"' />
            </Form.Item>
            <Form.Item label="ИНН" name="inn">
              <Input placeholder="1234567890" />
            </Form.Item>
            <Form.Item label="Адрес" name="address">
              <Input placeholder="г. Москва, ул. Примерная, д. 1" />
            </Form.Item>
            <Form.Item label="Контактное лицо" name="contactPerson">
              <Input placeholder="Иванов Иван Иванович" />
            </Form.Item>
            <Form.Item label="Телефон" name="contactPhone">
              <Input placeholder="+7 (999) 123-45-67" />
            </Form.Item>
            <div style={{ textAlign: "right" }}>
              <Space>
                <Button onClick={() => { setCreateOpen(false); form.resetFields(); }}>Отмена</Button>
                <Button type="primary" htmlType="submit" loading={createLoading}>Добавить</Button>
              </Space>
            </div>
          </Form>
        </Modal>
      )}
    </Space>
  );
}
