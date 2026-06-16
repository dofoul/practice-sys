"use client";

import { useEffect, useState } from "react";
import {
  Card, Tabs, Table, Typography, Space, Button, Modal, Form,
  Input, Switch, App, Tooltip, Alert, Empty, Tag,
} from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface PracticeType { id: number; code: string; name: string }
interface DocumentType { id: number; code: string; name: string; isRequired: boolean }
interface Company {
  id: number; name: string; inn?: string; address?: string;
  contactPerson?: string; contactPhone?: string;
}

function CrudTable<T extends { id: number }>({
  items,
  columns,
  loading,
  onEdit,
}: {
  items: T[];
  columns: object[];
  loading: boolean;
  onEdit: (item: T) => void;
}) {
  const cols = [
    ...columns,
    {
      title: "",
      key: "action",
      width: 60,
      render: (item: T) => (
        <Tooltip title="Редактировать">
          <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(item)} />
        </Tooltip>
      ),
    },
  ];
  return (
    <Table
      dataSource={items}
      columns={cols as object[]}
      rowKey="id"
      loading={loading}
      pagination={false}
      locale={{ emptyText: <Empty description="Нет данных" /> }}
      size="small"
    />
  );
}

export default function AdminDictionariesPage() {
  const { message } = App.useApp();
  const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    open: boolean;
    type: "practiceType" | "documentType" | "company";
    item?: object;
  }>({ open: false, type: "practiceType" });
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const [pt, dt, co] = await Promise.all([
        fetch("/api/admin/dictionaries/practice-types").then((r) => r.json()),
        fetch("/api/admin/dictionaries/document-types").then((r) => r.json()),
        fetch("/api/admin/dictionaries/companies").then((r) => r.json()),
      ]);
      setPracticeTypes(pt ?? []);
      setDocumentTypes(dt ?? []);
      setCompanies(co ?? []);
    } catch {
      setError("Не удалось загрузить справочники");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate(type: typeof modal.type) {
    form.resetFields();
    if (type === "documentType") form.setFieldsValue({ isRequired: true });
    setModal({ open: true, type });
  }

  function openEdit(type: typeof modal.type, item: object) {
    form.setFieldsValue(item);
    setModal({ open: true, type, item });
  }

  async function handleSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const { type, item } = modal;
      const urls: Record<string, string> = {
        practiceType: "/api/admin/dictionaries/practice-types",
        documentType: "/api/admin/dictionaries/document-types",
        company: "/api/admin/dictionaries/companies",
      };
      const base = urls[type];
      const id = (item as { id?: number })?.id;
      const url = id ? `${base}/${id}` : base;
      const res = await fetch(url, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Сохранено");
      setModal({ open: false, type: "practiceType" });
      load();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const practiceTypeColumns = [
    { title: "Код", dataIndex: "code", key: "code", render: (v: string) => <Tag>{v}</Tag> },
    { title: "Название", dataIndex: "name", key: "name" },
  ];

  const documentTypeColumns = [
    { title: "Код", dataIndex: "code", key: "code", render: (v: string) => <Tag>{v}</Tag> },
    { title: "Название", dataIndex: "name", key: "name" },
    {
      title: "Обязателен",
      dataIndex: "isRequired",
      key: "req",
      render: (v: boolean) => <Tag color={v ? "red" : "default"}>{v ? "Да" : "Нет"}</Tag>,
    },
  ];

  const companyColumns = [
    { title: "Название", dataIndex: "name", key: "name" },
    { title: "ИНН", dataIndex: "inn", key: "inn", render: (v?: string) => v ?? "—" },
    { title: "Контактное лицо", dataIndex: "contactPerson", key: "cp", render: (v?: string) => v ?? "—" },
    { title: "Телефон", dataIndex: "contactPhone", key: "phone", render: (v?: string) => v ?? "—" },
  ];

  const modalTitle: Record<string, string> = {
    practiceType: "Тип практики",
    documentType: "Тип документа",
    company: "Предприятие",
  };

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>Справочники</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Типы практик, типы документов, предприятия</Text>
      </div>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      <Card>
        <Tabs
          items={[
            {
              key: "practiceTypes",
              label: "Типы практик",
              children: (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  <div style={{ textAlign: "right" }}>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openCreate("practiceType")}>
                      Добавить
                    </Button>
                  </div>
                  <CrudTable
                    items={practiceTypes}
                    columns={practiceTypeColumns}
                    loading={loading}
                    onEdit={(item) => openEdit("practiceType", item)}
                  />
                </Space>
              ),
            },
            {
              key: "documentTypes",
              label: "Типы документов",
              children: (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  <div style={{ textAlign: "right" }}>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openCreate("documentType")}>
                      Добавить
                    </Button>
                  </div>
                  <CrudTable
                    items={documentTypes}
                    columns={documentTypeColumns}
                    loading={loading}
                    onEdit={(item) => openEdit("documentType", item)}
                  />
                </Space>
              ),
            },
            {
              key: "companies",
              label: "Предприятия",
              children: (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  <div style={{ textAlign: "right" }}>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openCreate("company")}>
                      Добавить
                    </Button>
                  </div>
                  <CrudTable
                    items={companies}
                    columns={companyColumns}
                    loading={loading}
                    onEdit={(item) => openEdit("company", item)}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={modal.item ? `Редактировать: ${modalTitle[modal.type]}` : `Добавить: ${modalTitle[modal.type]}`}
        open={modal.open}
        onCancel={() => setModal({ open: false, type: "practiceType" })}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          {(modal.type === "practiceType" || modal.type === "documentType") && (
            <Form.Item label="Код" name="code" rules={[{ required: true, message: "Введите код" }]}>
              <Input placeholder="contract, diary, ..." style={{ maxWidth: 200 }} />
            </Form.Item>
          )}
          <Form.Item label="Название" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input />
          </Form.Item>
          {modal.type === "documentType" && (
            <Form.Item label="Обязателен" name="isRequired" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
          {modal.type === "company" && (
            <>
              <Form.Item label="ИНН" name="inn"><Input placeholder="7712345678" /></Form.Item>
              <Form.Item label="Адрес" name="address"><Input /></Form.Item>
              <Form.Item label="Контактное лицо" name="contactPerson"><Input /></Form.Item>
              <Form.Item label="Телефон" name="contactPhone"><Input /></Form.Item>
            </>
          )}
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setModal({ open: false, type: "practiceType" })}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Сохранить</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
