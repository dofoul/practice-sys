"use client";

import { useState } from "react";
import { Card, Form, Input, Button, Typography, Space, App, Divider, Alert } from "antd";
import { LockOutlined, SafetyOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function CompanySettingsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  async function handlePasswordChange(values: {
    currentPassword: string;
    newPassword: string;
    confirm: string;
  }) {
    if (values.newPassword !== values.confirm) {
      form.setFields([{ name: "confirm", errors: ["Пароли не совпадают"] }]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error);
        return;
      }
      message.success("Пароль успешно изменён");
      form.resetFields();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>Настройки</Title>
        <Text type="secondary">Безопасность и параметры аккаунта</Text>
      </div>

      <Card
        title={
          <Space>
            <SafetyOutlined style={{ color: "#2563eb" }} />
            <span>Смена пароля</span>
          </Space>
        }
        style={{ maxWidth: 480 }}
      >
        <Alert
          type="info"
          showIcon
          message="После смены пароля вам потребуется войти заново"
          style={{ marginBottom: 20 }}
        />

        <Form layout="vertical" form={form} onFinish={handlePasswordChange} autoComplete="off">
          <Form.Item
            label="Текущий пароль"
            name="currentPassword"
            rules={[{ required: true, message: "Введите текущий пароль" }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#94A3B8" }} />}
              placeholder="••••••••"
            />
          </Form.Item>

          <Divider style={{ margin: "12px 0" }} />

          <Form.Item
            label="Новый пароль"
            name="newPassword"
            rules={[
              { required: true, message: "Введите новый пароль" },
              { min: 8, message: "Минимум 8 символов" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#94A3B8" }} />}
              placeholder="Минимум 8 символов"
            />
          </Form.Item>
          <Form.Item
            label="Повторите новый пароль"
            name="confirm"
            rules={[{ required: true, message: "Повторите пароль" }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#94A3B8" }} />}
              placeholder="••••••••"
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block>
            Изменить пароль
          </Button>
        </Form>
      </Card>
    </Space>
  );
}
