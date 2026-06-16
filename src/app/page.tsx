"use client";

import { useEffect, useState } from "react";
import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import {
  FileTextOutlined,
  TeamOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  SafetyOutlined,
  CloudUploadOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";

const { Title, Text, Paragraph } = Typography;

interface Offer {
  id: number;
  title: string;
  company: { name: string; address?: string };
  practiceType: { name: string };
  slotsTotal: number;
  slotsTaken: number;
}

const FEATURES = [
  {
    icon: <FileTextOutlined style={{ fontSize: 28, color: "#2563EB" }} />,
    title: "Студентам",
    desc: "Выбирайте место практики из каталога, загружайте документы и отслеживайте статус в одном окне.",
    items: ["Каталог мест практики", "Загрузка документов", "История проверок"],
  },
  {
    icon: <TeamOutlined style={{ fontSize: 28, color: "#16A34A" }} />,
    title: "Кураторам",
    desc: "Проверяйте документы студентов, выставляйте оценки и добавляйте новые места практики.",
    items: ["Проверка практик", "Оценивание студентов", "Управление группами"],
  },
  {
    icon: <BankOutlined style={{ fontSize: 28, color: "#D97706" }} />,
    title: "Предприятиям",
    desc: "Размещайте предложения о стажировке и отбирайте подходящих студентов.",
    items: ["Публикация вакансий", "Управление местами", "Контакт с куратором"],
  },
];

const STATS = [
  { value: "100%", label: "Цифровой документооборот" },
  { value: "3 роли", label: "Студент, куратор, администратор" },
  { value: "∞", label: "Мест практики в каталоге" },
  { value: "24/7", label: "Доступ к системе" },
];

const BENEFITS = [
  { icon: <SafetyOutlined />, title: "Безопасное хранение", desc: "Все документы хранятся в защищённом облачном хранилище MinIO." },
  { icon: <CloudUploadOutlined />, title: "Удобная загрузка", desc: "PDF, DOCX, JPG — любые форматы документов до 10 МБ." },
  { icon: <BarChartOutlined />, title: "Аналитика и статистика", desc: "Администратор видит полную картину по всем практикам в реальном времени." },
  { icon: <CheckCircleOutlined />, title: "Прозрачный процесс", desc: "Каждое изменение статуса фиксируется с комментарием и временем." },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    fetch("/api/offers?pageSize=20")
      .then((r) => r.json())
      .then((d) => setOffers(d.items || []));
  }, []);

  const duplicated = [...offers, ...offers];

  return (
    <div style={{ fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif", overflowX: "hidden" }}>
      {/* Хедер */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #1E293B",
          padding: "0 40px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text strong style={{ color: "#FFFFFF", fontSize: 18 }}>📋 УчётПрактик</Text>
        <Space size={12}>
          {session?.user ? (
            <Link href="/dashboard">
              <Button type="primary" icon={<ArrowRightOutlined />}>
                Перейти в кабинет
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button style={{ color: "#CBD5E1", borderColor: "#334155", background: "transparent" }}>
                  Войти
                </Button>
              </Link>
              <Link href="/register">
                <Button type="primary">Регистрация</Button>
              </Link>
            </>
          )}
        </Space>
      </header>

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)",
          padding: "100px 40px 80px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 30% 50%, rgba(37,99,235,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 30%, rgba(22,163,74,0.1) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
          <Tag color="blue" style={{ marginBottom: 20, fontSize: 13, padding: "4px 16px", borderRadius: 20 }}>
            Цифровизация учебного процесса
          </Tag>
          <Title
            style={{
              color: "#FFFFFF",
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 800,
              lineHeight: 1.15,
              margin: "0 0 20px",
            }}
          >
            Система учёта практик
            <br />
            <span style={{ color: "#60A5FA" }}>нового поколения</span>
          </Title>
          <Paragraph
            style={{ color: "#94A3B8", fontSize: 18, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 40px" }}
          >
            Единая платформа для организации, учёта и контроля прохождения производственной практики студентов.
          </Paragraph>
          <Space size={16} wrap style={{ justifyContent: "center" }}>
            {session?.user ? (
              <Link href="/dashboard">
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowRightOutlined />}
                  style={{ height: 48, paddingInline: 32, fontSize: 15 }}
                >
                  Открыть кабинет
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <Button type="primary" size="large" style={{ height: 48, paddingInline: 32, fontSize: 15 }}>
                    Начать бесплатно
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="large"
                    style={{
                      height: 48,
                      paddingInline: 32,
                      fontSize: 15,
                      background: "transparent",
                      borderColor: "#475569",
                      color: "#CBD5E1",
                    }}
                  >
                    Войти в систему
                  </Button>
                </Link>
              </>
            )}
          </Space>
        </div>
      </section>

      {/* Статистика */}
      <section style={{ background: "#2563EB", padding: "32px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Row gutter={[0, 16]}>
            {STATS.map((s) => (
              <Col key={s.label} xs={12} md={6} style={{ textAlign: "center" }}>
                <div style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: "#BFDBFE", fontSize: 13, marginTop: 4 }}>{s.label}</div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Возможности по ролям */}
      <section style={{ background: "#F8FAFC", padding: "80px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Title level={2} style={{ margin: "0 0 12px", color: "#0F172A" }}>Для каждой роли</Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Платформа адаптирована под задачи студентов, кураторов и администраторов
            </Text>
          </div>
          <Row gutter={[24, 24]}>
            {FEATURES.map((f) => (
              <Col key={f.title} xs={24} md={8}>
                <Card
                  style={{ height: "100%", border: "1px solid #E2E8F0", borderRadius: 16 }}
                  styles={{ body: { padding: 28 } }}
                >
                  <div style={{ marginBottom: 16 }}>{f.icon}</div>
                  <Title level={4} style={{ margin: "0 0 8px", color: "#0F172A" }}>{f.title}</Title>
                  <Paragraph style={{ color: "#64748B", fontSize: 14, marginBottom: 16 }}>{f.desc}</Paragraph>
                  <Space direction="vertical" size={6}>
                    {f.items.map((item) => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CheckCircleOutlined style={{ color: "#16A34A", fontSize: 14 }} />
                        <Text style={{ fontSize: 13, color: "#374151" }}>{item}</Text>
                      </div>
                    ))}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Прокручивающиеся места практики */}
      {offers.length > 0 && (
        <section style={{ background: "#0F172A", padding: "64px 0", overflow: "hidden" }}>
          <div style={{ textAlign: "center", marginBottom: 40, padding: "0 40px" }}>
            <Title level={2} style={{ margin: "0 0 8px", color: "#FFFFFF" }}>
              Популярные места практики
            </Title>
            <Text style={{ color: "#94A3B8", fontSize: 15 }}>
              Предприятия, которые принимают студентов прямо сейчас
            </Text>
          </div>

          <style>{`
            @keyframes marquee {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-track {
              display: flex;
              gap: 16px;
              animation: marquee 30s linear infinite;
              width: max-content;
            }
            .marquee-track:hover { animation-play-state: paused; }
          `}</style>

          <div style={{ overflow: "hidden", padding: "8px 0" }}>
            <div className="marquee-track">
              {duplicated.map((offer, i) => {
                const left = offer.slotsTotal - offer.slotsTaken;
                const href = session?.user ? `/catalog/${offer.id}` : `/login?callbackUrl=/catalog/${offer.id}`;
                return (
                  <Link key={`${offer.id}-${i}`} href={href}>
                    <div
                      style={{
                        minWidth: 260,
                        maxWidth: 260,
                        background: "#1E293B",
                        border: "1px solid #334155",
                        borderRadius: 12,
                        padding: "16px 20px",
                        cursor: "pointer",
                        transition: "border-color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#334155")}
                    >
                      <Tag color={left > 0 ? "green" : "red"} style={{ marginBottom: 8, fontSize: 11 }}>
                        {left > 0 ? `${left} мест` : "Мест нет"}
                      </Tag>
                      <div
                        style={{ color: "#F1F5F9", fontWeight: 600, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}
                      >
                        {offer.title}
                      </div>
                      <div
                        style={{ color: "#94A3B8", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <EnvironmentOutlined />
                        {offer.company.name}
                      </div>
                      <div style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>
                        {offer.practiceType.name}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Преимущества */}
      <section style={{ background: "#FFFFFF", padding: "80px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Title level={2} style={{ margin: "0 0 12px", color: "#0F172A" }}>Почему мы</Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Продуманные инструменты для комфортной работы
            </Text>
          </div>
          <Row gutter={[24, 24]}>
            {BENEFITS.map((b) => (
              <Col key={b.title} xs={24} sm={12} lg={6}>
                <div style={{ textAlign: "center", padding: "24px 16px" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background: "#EFF6FF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                      fontSize: 22,
                      color: "#2563EB",
                    }}
                  >
                    {b.icon}
                  </div>
                  <Title level={5} style={{ margin: "0 0 8px", color: "#0F172A" }}>{b.title}</Title>
                  <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>{b.desc}</Text>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          background: "linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)",
          padding: "80px 40px",
          textAlign: "center",
        }}
      >
        <Title level={2} style={{ color: "#FFFFFF", margin: "0 0 16px" }}>
          Готовы начать?
        </Title>
        <Paragraph style={{ color: "#BFDBFE", fontSize: 16, maxWidth: 480, margin: "0 auto 32px" }}>
          Зарегистрируйтесь и начните работу с системой учёта практик уже сегодня.
        </Paragraph>
        <Space size={16} wrap style={{ justifyContent: "center" }}>
          <Link href="/register">
            <Button
              size="large"
              style={{
                background: "#FFFFFF",
                color: "#2563EB",
                border: "none",
                fontWeight: 600,
                height: 48,
                paddingInline: 32,
                fontSize: 15,
              }}
            >
              Создать аккаунт
            </Button>
          </Link>
          <Link href="/login">
            <Button
              size="large"
              style={{
                background: "transparent",
                borderColor: "rgba(255,255,255,0.4)",
                color: "#FFFFFF",
                height: 48,
                paddingInline: 32,
                fontSize: 15,
              }}
            >
              Войти
            </Button>
          </Link>
        </Space>
      </section>

      {/* Футер */}
      <footer
        style={{
          background: "#0F172A",
          borderTop: "1px solid #1E293B",
          padding: "32px 40px",
          textAlign: "center",
        }}
      >
        <Text style={{ color: "#475569", fontSize: 13 }}>
          © 2026 УчётПрактик — система учёта практик студентов
        </Text>
      </footer>
    </div>
  );
}
