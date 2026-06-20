"use client";

import { useState } from "react";
import { Card, Form, Input, Button, Typography, Alert, Divider, Steps } from "antd";
import { UserOutlined, LockOutlined, MailOutlined, BankOutlined, PhoneOutlined, GlobalOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const { Title, Text } = Typography;

interface Step1Values {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  confirm: string;
}

interface Step2Values {
  companyName: string;
  inn?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  website?: string;
  description?: string;
}

export default function RegisterCompanyPage() {
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [form1] = Form.useForm();
  const [form2] = Form.useForm();

  function handleStep1Finish(values: Step1Values) {
    if (values.password !== values.confirm) {
      form1.setFields([{ name: "confirm", errors: ["Пароли не совпадают"] }]);
      return;
    }
    setStep1Data(values);
    setStep(1);
  }

  async function handleStep2Finish(values: Step2Values) {
    if (!step1Data) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...step1Data, companyName: values.companyName, ...values }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        return;
      }
      await signIn("credentials", {
        email: step1Data.email,
        password: step1Data.password,
        redirect: false,
      });
      router.push("/company/offers");
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
        maxWidth: 520,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        border: "1px solid #E2E8F0",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Text style={{ fontSize: 28, display: "block", marginBottom: 8 }}>🏢</Text>
        <Title level={3} style={{ margin: 0, color: "#0F172A" }}>
          Регистрация предприятия
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Создайте аккаунт для управления вакансиями практики
        </Text>
      </div>

      <Steps
        current={step}
        size="small"
        style={{ marginBottom: 24 }}
        items={[
          { title: "Аккаунт" },
          { title: "Предприятие" },
        ]}
      />

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

      {step === 0 && (
        <Form layout="vertical" form={form1} onFinish={handleStep1Finish} autoComplete="off">
          <Form.Item
            label="ФИО представителя"
            name="fullName"
            rules={[{ required: true, message: "Введите ФИО" }, { min: 2 }]}
          >
            <Input prefix={<UserOutlined style={{ color: "#94A3B8" }} />} placeholder="Иванов Иван Иванович" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Введите email" }, { type: "email" }]}
          >
            <Input prefix={<MailOutlined style={{ color: "#94A3B8" }} />} placeholder="company@example.ru" />
          </Form.Item>
          <Form.Item label="Телефон" name="phone">
            <Input prefix={<PhoneOutlined style={{ color: "#94A3B8" }} />} placeholder="+7 (999) 000-00-00" />
          </Form.Item>
          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ required: true, message: "Введите пароль" }, { min: 8 }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: "#94A3B8" }} />} placeholder="Минимум 8 символов" />
          </Form.Item>
          <Form.Item
            label="Повторите пароль"
            name="confirm"
            rules={[{ required: true, message: "Повторите пароль" }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: "#94A3B8" }} />} placeholder="••••••••" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block size="large" style={{ fontWeight: 600 }}>
              Далее →
            </Button>
          </Form.Item>
        </Form>
      )}

      {step === 1 && (
        <Form layout="vertical" form={form2} onFinish={handleStep2Finish} autoComplete="off">
          <Form.Item
            label="Название предприятия"
            name="companyName"
            rules={[{ required: true, message: "Введите название" }, { min: 2 }]}
          >
            <Input prefix={<BankOutlined style={{ color: "#94A3B8" }} />} placeholder='ООО "Пример"' />
          </Form.Item>
          <Form.Item label="ИНН" name="inn" rules={[{ max: 16 }]}>
            <Input placeholder="1234567890" />
          </Form.Item>
          <Form.Item label="Адрес" name="address">
            <Input placeholder="г. Москва, ул. Примерная, д. 1" />
          </Form.Item>
          <Form.Item label="Контактное лицо" name="contactPerson">
            <Input prefix={<UserOutlined style={{ color: "#94A3B8" }} />} placeholder="Сидоров Сергей Сергеевич" />
          </Form.Item>
          <Form.Item label="Телефон компании" name="contactPhone">
            <Input prefix={<PhoneOutlined style={{ color: "#94A3B8" }} />} placeholder="+7 (495) 000-00-00" />
          </Form.Item>
          <Form.Item label="Сайт" name="website">
            <Input prefix={<GlobalOutlined style={{ color: "#94A3B8" }} />} placeholder="https://example.ru" />
          </Form.Item>
          <Form.Item label="Описание деятельности" name="description">
            <Input.TextArea rows={3} placeholder="Краткое описание компании и сферы деятельности..." maxLength={1000} showCount />
          </Form.Item>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => setStep(0)} style={{ flex: 1 }}>
              ← Назад
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} style={{ flex: 2, fontWeight: 600 }}>
              Зарегистрироваться
            </Button>
          </div>
        </Form>
      )}

      <Divider style={{ margin: "16px 0" }} />
      <div style={{ textAlign: "center" }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Уже есть аккаунт?{" "}
          <Link href="/login" style={{ color: "#2563EB", fontWeight: 500 }}>
            Войти
          </Link>
        </Text>
        <Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
          Регистрируетесь как студент?{" "}
          <Link href="/register" style={{ color: "#2563EB", fontWeight: 500 }}>
            Регистрация студента
          </Link>
        </Text>
      </div>
    </Card>
  );
}
