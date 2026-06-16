"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, Table, Typography, Space, Button, Modal, Form,
  Input, Switch, DatePicker, App, Tooltip, Alert, Empty, Badge, Tag,
} from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface Period {
  id: number;
  name: string;
  dateStart: string;
  dateEnd: string;
  isOpen: boolean;
}

export default function AdminPeriodsPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; item?: Period }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/periods");
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

  function openCreate() {
    form.resetFields();
    form.setFieldsValue({ isOpen: true });
    setModal({ open: true });
  }

  function openEdit(item: Period) {
    form.setFieldsValue({
      name: item.name,
      dateRange: [dayjs(item.dateStart), dayjs(item.dateEnd)],
      isOpen: item.isOpen,
    });
    setModal({ open: true, item });
  }

  async function handleSave(values: { name: string; dateRange: [dayjs.Dayjs, dayjs.Dayjs]; isOpen: boolean }) {
    setSaving(true);
    try {
      const body = {
        name: values.name,
        dateStart: values.dateRange[0].format("YYYY-MM-DD"),
        dateEnd: values.dateRange[1].format("YYYY-MM-DD"),
        isOpen: values.isOpen,
      };
      const url = modal.item ? `/api/admin/periods/${modal.item.id}` : "/api/admin/periods";
      const res = await fetch(url, {
        method: modal.item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success(modal.item ? "Период обновлён" : "Период создан");
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
      title: "Название",
      dataIndex: "name",
      key: "name",
      render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: "Даты",
      key: "dates",
      render: (p: Period) => (
        <Text style={{ fontSize: 13 }}>
          {dayjs(p.dateStart).format("DD.MM.YYYY")} — {dayjs(p.dateEnd).format("DD.MM.YYYY")}
        </Text>
      ),
    },
    {
      title: "Статус набора",
      key: "isOpen",
      render: (p: Period) => (
        <Badge
          status={p.isOpen ? "success" : "default"}
          text={p.isOpen ? "Открыт" : "Закрыт"}
        />
      ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: (p: Period) => (
        <Tooltip title="Редактировать">
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(p)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Периоды практик</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Кампании и сроки прохождения практик</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Создать период</Button>
      </div>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      <Card>
        <Table
          dataSource={items}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="Периоды не найдены" /> }}
        />
      </Card>

      <Modal
        title={modal.item ? "Редактировать период" : "Создать период"}
        open={modal.open}
        onCancel={() => setModal({ open: false })}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}
          initialValues={{ isOpen: true }}>
          <Form.Item label="Название" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="Производственная практика, лето 2026" />
          </Form.Item>
          <Form.Item label="Даты проведения" name="dateRange" rules={[{ required: true, message: "Выберите даты" }]}>
            <DatePicker.RangePicker
              format="DD.MM.YYYY"
              style={{ width: "100%" }}
              placeholder={["Начало", "Окончание"]}
            />
          </Form.Item>
          <Form.Item label="Набор открыт" name="isOpen" valuePropName="checked">
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
