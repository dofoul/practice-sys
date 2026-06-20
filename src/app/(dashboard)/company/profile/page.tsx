"use client";

import { useEffect, useState } from "react";
import { Card, Form, Input, Button, Typography, Space, Tag, Alert, Spin, App } from "antd";
import { BankOutlined, GlobalOutlined, PhoneOutlined, UserOutlined, SafetyCertificateOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Company {
  id: number;
  name: string;
  inn?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  description?: string;
  website?: string;
  isVerified: boolean;
  createdAt: string;
}

export default function CompanyProfilePage() {
  const { message } = App.useApp();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetch("/api/company/profile")
      .then((r) => r.json())
      .then((data) => {
        setCompany(data);
        form.setFieldsValue({
          name: data.name,
          inn: data.inn,
          address: data.address,
          contactPerson: data.contactPerson,
          contactPhone: data.contactPhone,
          website: data.website,
          description: data.description,
        });
      })
      .finally(() => setLoading(false));
  }, [form]);

  async function handleSave(values: Record<string, string>) {
    setSaving(true);
    try {
      const res = await fetch("/api/company/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) { message.error(data.error); return; }
      setCompany(data);
      message.success("Профиль обновлён");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spin size="large" /></div>;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex", maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Профиль компании</Title>
          <Text type="secondary">Данные, которые видят студенты при просмотре вакансий</Text>
        </div>
        {company?.isVerified ? (
          <Tag color="green" icon={<SafetyCertificateOutlined />}>Верифицировано</Tag>
        ) : (
          <Tag color="orange">Ожидает верификации</Tag>
        )}
      </div>

      {!company?.isVerified && (
        <Alert
          type="warning"
          showIcon
          message="Аккаунт ожидает верификации"
          description="После проверки данных администратором ваши вакансии появятся в каталоге для студентов. Статус обновится в течение 1-2 рабочих дней."
        />
      )}

      <Card title={<><BankOutlined /> Данные предприятия</>}>
        <Form layout="vertical" form={form} onFinish={handleSave}>
          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item label="Название предприятия" name="name" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Input prefix={<BankOutlined style={{ color: "#94A3B8" }} />} placeholder='ООО "Пример"' />
            </Form.Item>
            <Form.Item label="ИНН" name="inn" style={{ flex: 1 }}>
              <Input placeholder="1234567890" maxLength={16} />
            </Form.Item>
          </div>
          <Form.Item label="Адрес" name="address">
            <Input placeholder="г. Москва, ул. Примерная, д. 1" />
          </Form.Item>
          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item label="Контактное лицо" name="contactPerson" style={{ flex: 1 }}>
              <Input prefix={<UserOutlined style={{ color: "#94A3B8" }} />} placeholder="Иванов Иван Иванович" />
            </Form.Item>
            <Form.Item label="Телефон" name="contactPhone" style={{ flex: 1 }}>
              <Input prefix={<PhoneOutlined style={{ color: "#94A3B8" }} />} placeholder="+7 (495) 000-00-00" />
            </Form.Item>
          </div>
          <Form.Item label="Сайт компании" name="website">
            <Input prefix={<GlobalOutlined style={{ color: "#94A3B8" }} />} placeholder="https://example.ru" />
          </Form.Item>
          <Form.Item label="Описание деятельности" name="description">
            <Input.TextArea
              rows={4}
              placeholder="Расскажите о компании, сфере деятельности, условиях прохождения практики..."
              maxLength={2000}
              showCount
            />
          </Form.Item>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="primary" htmlType="submit" loading={saving}>
              Сохранить изменения
            </Button>
          </div>
        </Form>
      </Card>
    </Space>
  );
}
