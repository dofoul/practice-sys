"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, Table, Typography, Space, Button, Input, Modal, Form,
  App, Tooltip, Alert, Empty, Collapse, Tag,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Specialty { id: number; code?: string; name: string }
interface Institution { id: number; name: string; shortName?: string; specialties: Specialty[] }

export default function AdminInstitutionsPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; type: "institution" | "specialty"; item?: Partial<Institution & Specialty>; parentId?: number }>({ open: false, type: "institution" });
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/institutions");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreateInst() {
    form.resetFields();
    setModal({ open: true, type: "institution" });
  }

  function openEditInst(inst: Institution) {
    form.setFieldsValue({ name: inst.name, shortName: inst.shortName });
    setModal({ open: true, type: "institution", item: inst });
  }

  function openCreateSpec(institutionId: number) {
    form.resetFields();
    setModal({ open: true, type: "specialty", parentId: institutionId });
  }

  async function handleSave(values: { name: string; shortName?: string; code?: string }) {
    setSaving(true);
    try {
      const { type, item, parentId } = modal;
      let url = "";
      let method = "POST";
      let body: object = {};

      if (type === "institution") {
        url = item ? `/api/admin/institutions/${item.id}` : "/api/admin/institutions";
        method = item ? "PUT" : "POST";
        body = { name: values.name, shortName: values.shortName };
      } else {
        url = "/api/admin/specialties";
        body = { institutionId: parentId, name: values.name, code: values.code };
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Сохранено");
      setModal({ open: false, type: "institution" });
      load();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const specColumns = [
    { title: "Шифр", dataIndex: "code", key: "code", render: (v?: string) => v ?? "—" },
    { title: "Название специальности", dataIndex: "name", key: "name" },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Учебные заведения</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Заведения, специальности, группы</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateInst}>Добавить заведение</Button>
      </div>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      {loading ? null : items.length === 0 ? (
        <Card><Empty description="Нет заведений" /></Card>
      ) : (
        <Collapse
          defaultActiveKey={items.map((i) => String(i.id))}
          style={{ background: "transparent", border: "none" }}
          items={items.map((inst) => ({
            key: String(inst.id),
            label: (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Text strong style={{ fontSize: 15 }}>{inst.name}</Text>
                {inst.shortName && <Tag>{inst.shortName}</Tag>}
                <Tag color="blue">{inst.specialties.length} спец.</Tag>
              </div>
            ),
            extra: (
              <Space size={4} onClick={(e) => e.stopPropagation()}>
                <Tooltip title="Добавить специальность">
                  <Button size="small" icon={<PlusOutlined />} onClick={() => openCreateSpec(inst.id)} />
                </Tooltip>
                <Tooltip title="Редактировать">
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditInst(inst)} />
                </Tooltip>
              </Space>
            ),
            children: (
              <Table
                dataSource={inst.specialties}
                columns={specColumns}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: <Empty description="Нет специальностей" /> }}
              />
            ),
            style: { background: "#FFFFFF", borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 12 },
          }))}
        />
      )}

      <Modal
        title={modal.type === "institution"
          ? (modal.item ? "Редактировать заведение" : "Добавить заведение")
          : "Добавить специальность"}
        open={modal.open}
        onCancel={() => setModal({ open: false, type: "institution" })}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          {modal.type === "specialty" && (
            <Form.Item label="Шифр специальности" name="code">
              <Input placeholder="09.02.07" />
            </Form.Item>
          )}
          <Form.Item label="Название" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder={modal.type === "institution" ? "Технический колледж" : "Информационные системы"} />
          </Form.Item>
          {modal.type === "institution" && (
            <Form.Item label="Аббревиатура" name="shortName">
              <Input placeholder="ТК" style={{ maxWidth: 120 }} />
            </Form.Item>
          )}
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setModal({ open: false, type: "institution" })}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Сохранить</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
