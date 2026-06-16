"use client";

import { useState } from "react";
import { Card, Form, Input, Button, Typography, Alert, Divider } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(values: {
    email: string;
    password: string;
    confirm: string;
    fullName: string;
    phone?: string;
  }) {
    if (values.password !== values.confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          fullName: values.fullName,
          phone: values.phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        return;
      }

      await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      router.push("/dashboard");
    } catch {
      setError("Произошла ошибка. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      style={{
        width: "100%",
        maxWidth: 460,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        border: "1px solid #E2E8F0",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Text style={{ fontSize: 32, display: "block", marginBottom: 8 }}>📋</Text>
        <Title level={3} style={{ margin: 0, color: "#0F172A" }}>
          Регистрация
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Создайте аккаунт студента
        </Text>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      <Form layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item
          label="ФИО"
          name="fullName"
          rules={[{ required: true, message: "Введите ФИО" }, { min: 2, message: "ФИО слишком короткое" }]}
        >
          <Input
            prefix={<UserOutlined style={{ color: "#94A3B8" }} />}
            placeholder="Иванов Иван Иванович"
          />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Введите email" },
            { type: "email", message: "Неверный формат email" },
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: "#94A3B8" }} />}
            placeholder="you@example.ru"
          />
        </Form.Item>

        <Form.Item
          label="Телефон"
          name="phone"
          rules={[{ max: 32, message: "Слишком длинный номер" }]}
        >
          <Input
            placeholder="+7 (999) 000-00-00"
          />
        </Form.Item>

        <Form.Item
          label="Пароль"
          name="password"
          rules={[
            { required: true, message: "Введите пароль" },
            { min: 8, message: "Минимум 8 символов" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "#94A3B8" }} />}
            placeholder="Минимум 8 символов"
          />
        </Form.Item>

        <Form.Item
          label="Повторите пароль"
          name="confirm"
          rules={[{ required: true, message: "Повторите пароль" }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "#94A3B8" }} />}
            placeholder="••••••••"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{ fontWeight: 600 }}
          >
            Зарегистрироваться
          </Button>
        </Form.Item>
      </Form>

      <Divider style={{ margin: "16px 0" }} />

      <div style={{ textAlign: "center" }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Уже есть аккаунт?{" "}
          <Link href="/login" style={{ color: "#2563EB", fontWeight: 500 }}>
            Войти
          </Link>
        </Text>
      </div>
    </Card>
  );
}
