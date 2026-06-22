"use client";

import { Suspense, useState } from "react";
import { Card, Form, Input, Button, Typography, Alert, Divider, Spin, Space } from "antd";
import { LockOutlined, MailOutlined, BankOutlined, SafetyOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const { Title, Text } = Typography;

function CompanyLoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/company/offers";

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
          style={{ marginBottom: 20 }}
        />
      )}

      <Form layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item
          label="Email предприятия"
          name="email"
          rules={[{ required: true, message: "Введите email" }, { type: "email" }]}
        >
          <Input
            prefix={<MailOutlined style={{ color: "#94A3B8" }} />}
            placeholder="company@example.ru"
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
        <Form.Item style={{ marginBottom: 8 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{ fontWeight: 600, background: "#1d4ed8", borderColor: "#1d4ed8" }}
          >
            Войти в кабинет предприятия
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}

export default function CompanyLoginPage() {
  return (
    <div style={{ width: "100%", maxWidth: 460 }}>
      {/* Верхний бейдж */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Space align="center">
          <SafetyOutlined style={{ color: "#60a5fa", fontSize: 14 }} />
          <Text style={{ color: "#94a3b8", fontSize: 13 }}>Портал предприятий</Text>
        </Space>
      </div>

      <Card
        style={{
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)",
          border: "1px solid #1e3a5f",
          background: "#0f1f3d",
        }}
      >
        {/* Шапка */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 28,
            paddingBottom: 24,
            borderBottom: "1px solid #1e3a5f",
          }}
        >
          <BankOutlined style={{ fontSize: 36, color: "#3b82f6", marginBottom: 12, display: "block" }} />
          <Title level={3} style={{ margin: 0, color: "#f0f6ff" }}>
            Кабинет предприятия
          </Title>
          <Text style={{ color: "#7fa8d4", fontSize: 13 }}>
            Управление вакансиями и студентами-практикантами
          </Text>
        </div>

        <Suspense fallback={<div style={{ textAlign: "center" }}><Spin /></div>}>
          <CompanyLoginForm />
        </Suspense>

        {/* Преимущества */}
        <div
          style={{
            marginTop: 20,
            padding: "14px 16px",
            background: "#0a1628",
            borderRadius: 8,
            border: "1px solid #1e3a5f",
          }}
        >
          {[
            "Публикация вакансий и мест практики",
            "Приём и отклонение заявок студентов",
            "Выставление оценок по итогам практики",
            "Аналитика и статистика по практикантам",
          ].map((text) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "#3b82f6", fontSize: 12 }}>✓</span>
              <Text style={{ color: "#94a3b8", fontSize: 12 }}>{text}</Text>
            </div>
          ))}
        </div>

        <Divider style={{ borderColor: "#1e3a5f", margin: "20px 0" }} />

        <div style={{ textAlign: "center" }}>
          <Text style={{ color: "#7fa8d4", fontSize: 13 }}>
            Ещё нет аккаунта?{" "}
            <Link href="/register/company" style={{ color: "#60a5fa", fontWeight: 600 }}>
              Зарегистрировать предприятие
            </Link>
          </Text>
          <br />
          <Text style={{ color: "#4a6a8a", fontSize: 12 }}>
            Вы студент или куратор?{" "}
            <Link href="/login" style={{ color: "#4a6a8a" }}>
              Войти через основной портал
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
