"use client";

import { Suspense, useState } from "react";
import { Card, Form, Input, Button, Typography, Alert, Divider, Spin } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const { Title, Text } = Typography;

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  async function handleSubmit(values: { email: string; password: string }) {
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Неверный email или пароль");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Произошла ошибка. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Введите email" },
            { type: "email", message: "Неверный формат email" },
          ]}
        >
          <Input
            prefix={<UserOutlined style={{ color: "#94A3B8" }} />}
            placeholder="you@example.ru"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="Пароль"
          name="password"
          rules={[{ required: true, message: "Введите пароль" }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "#94A3B8" }} />}
            placeholder="••••••••"
            size="large"
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
            Войти
          </Button>
        </Form.Item>
      </Form>

      <Divider style={{ margin: "16px 0" }} />

      <div style={{ textAlign: "center" }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Нет аккаунта?{" "}
          <Link href="/register" style={{ color: "#2563EB", fontWeight: 500 }}>
            Регистрация
          </Link>
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Вы предприятие?{" "}
          <Link href="/company/login" style={{ color: "#3b82f6", fontWeight: 500 }}>
            Войти в кабинет предприятия →
          </Link>
        </Text>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Card
      style={{
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        border: "1px solid #E2E8F0",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Text style={{ fontSize: 32, display: "block", marginBottom: 8 }}>📋</Text>
        <Title level={3} style={{ margin: 0, color: "#0F172A" }}>
          Вход в систему
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Система учёта практик
        </Text>
      </div>

      <Suspense fallback={<div style={{ textAlign: "center" }}><Spin /></div>}>
        <LoginForm />
      </Suspense>
    </Card>
  );
}
