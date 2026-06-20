"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Typography,
  Space,
  Button,
  Tag,
  Descriptions,
  Progress,
  Alert,
  Spin,
  Breadcrumb,
  App,
  Divider,
  Rate,
} from "antd";
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileOutlined,
  CheckCircleOutlined,
  StarFilled,
  DownloadOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

interface OfferReview {
  rating: number;
  comment?: string;
  createdAt: string;
}

interface Offer {
  id: number;
  title: string;
  description?: string;
  direction?: string;
  slotsTotal: number;
  slotsTaken: number;
  isPublished: boolean;
  company: { name: string; address?: string; inn?: string; contactPerson?: string; contactPhone?: string; description?: string; website?: string; isVerified?: boolean };
  practiceType: { name: string };
  period: { name: string; dateStart: string; dateEnd: string };
  templates: { id: number; documentType: { name: string } }[];
  offerReviews?: OfferReview[];
}

export default function OfferDetailPage() {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState<number | null>(null);

  const role = session?.user?.role;
  const id = params.id as string;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/offers/${id}`);
        if (!res.ok) throw new Error();
        setOffer(await res.json());
      } catch {
        setError("Предложение не найдено");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleDownloadTemplate(templateId: number, name: string) {
    if (!offer) return;
    setDownloadingTemplate(templateId);
    try {
      const res = await fetch(`/api/offers/${offer.id}/templates/${templateId}/download`);
      const data = await res.json();
      if (!res.ok) { message.error(data.error); return; }
      const a = document.createElement("a");
      a.href = data.url;
      a.download = name;
      a.click();
    } catch {
      message.error("Ошибка загрузки файла");
    } finally {
      setDownloadingTemplate(null);
    }
  }

  async function handleApply() {
    if (!offer) return;
    setApplying(true);
    try {
      const typesRes = await fetch("/api/admin/dictionaries/practice-types");
      const types = await typesRes.json();
      const periodsRes = await fetch("/api/admin/periods");
      const periodsData = await periodsRes.json();

      const typeId = types.find((t: { name: string; id: number }) => t.name === offer.practiceType.name)?.id;
      const periodId = periodsData.items?.find((p: { name: string; id: number }) => p.name === offer.period.name)?.id;

      const res = await fetch("/api/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id, practiceTypeId: typeId, periodId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      message.success("Место практики выбрано!");
      router.push(`/practices/${data.id}`);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spin size="large" /></div>;
  if (error || !offer) return <Alert type="error" message={error ?? "Предложение не найдено"} />;

  const slotsLeft = offer.slotsTotal - offer.slotsTaken;
  const hasSlots = slotsLeft > 0;
  const occupancy = Math.round((offer.slotsTaken / offer.slotsTotal) * 100);
  const reviewCount = offer.offerReviews?.length ?? 0;
  const avgRating = reviewCount
    ? offer.offerReviews!.reduce((s, r) => s + r.rating, 0) / reviewCount
    : 0;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex", maxWidth: 800 }}>
      <div>
        <Breadcrumb
          items={[
            { title: <Link href="/catalog">Каталог</Link> },
            { title: offer.title },
          ]}
          style={{ marginBottom: 12 }}
        />
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ marginBottom: 16 }} />
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Space size={8} style={{ marginBottom: 8 }} wrap>
              <Tag color="blue">{offer.practiceType.name}</Tag>
              {offer.direction && <Tag color="purple">{offer.direction}</Tag>}
              {!hasSlots && <Tag color="red">Мест нет</Tag>}
              {offer.company.isVerified && <Tag color="green" icon={<SafetyCertificateOutlined />}>Верифицировано</Tag>}
            </Space>
            <Title level={3} style={{ margin: "0 0 8px" }}>{offer.title}</Title>
            <Text style={{ fontSize: 15, color: "#0F172A" }}>
              <EnvironmentOutlined style={{ marginRight: 8, color: "#64748B" }} />
              {offer.company.name}
            </Text>
            {avgRating > 0 && (
              <div style={{ marginTop: 8 }}>
                <Rate disabled defaultValue={avgRating} allowHalf style={{ fontSize: 16 }} />
                <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>
                  {avgRating.toFixed(1)} ({reviewCount} отзывов)
                </Text>
              </div>
            )}
          </div>
          {role === "student" && (
            <Button
              type="primary"
              size="large"
              disabled={!hasSlots}
              loading={applying}
              onClick={handleApply}
              icon={<CheckCircleOutlined />}
            >
              {hasSlots ? "Выбрать место" : "Мест нет"}
            </Button>
          )}
        </div>

        <Divider />

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 13 }}>
              <TeamOutlined style={{ marginRight: 6 }} />
              Занято мест: {offer.slotsTaken} из {offer.slotsTotal}
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>{slotsLeft} свободных</Text>
          </div>
          <Progress
            percent={occupancy}
            strokeColor={occupancy >= 100 ? "#DC2626" : occupancy > 70 ? "#D97706" : "#16A34A"}
            showInfo={false}
          />
        </div>

        {offer.description && (
          <Paragraph style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
            {offer.description}
          </Paragraph>
        )}
      </Card>

      <Card title={<span style={{ fontWeight: 600 }}>Детали</span>}>
        <Descriptions column={1} labelStyle={{ color: "#64748B", width: 180 }}>
          <Descriptions.Item label={<><CalendarOutlined /> Период</>}>
            {offer.period.name} ({dayjs(offer.period.dateStart).format("DD.MM.YYYY")} —{" "}
            {dayjs(offer.period.dateEnd).format("DD.MM.YYYY")})
          </Descriptions.Item>
          <Descriptions.Item label="Предприятие">{offer.company.name}</Descriptions.Item>
          {offer.company.address && (
            <Descriptions.Item label="Адрес">{offer.company.address}</Descriptions.Item>
          )}
          {offer.company.inn && (
            <Descriptions.Item label="ИНН">{offer.company.inn}</Descriptions.Item>
          )}
          {offer.company.contactPerson && (
            <Descriptions.Item label="Контактное лицо">{offer.company.contactPerson}</Descriptions.Item>
          )}
          {offer.company.contactPhone && (
            <Descriptions.Item label="Телефон">{offer.company.contactPhone}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {(offer.company.description || offer.company.website) && (
        <Card title={<span style={{ fontWeight: 600 }}>О компании</span>}>
          {offer.company.description && (
            <Paragraph style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: offer.company.website ? 12 : 0 }}>
              {offer.company.description}
            </Paragraph>
          )}
          {offer.company.website && (
            <Space>
              <GlobalOutlined style={{ color: "#2563EB" }} />
              <a href={offer.company.website} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB" }}>
                {offer.company.website}
              </a>
            </Space>
          )}
        </Card>
      )}

      {offer.templates.length > 0 && (
        <Card title={<span style={{ fontWeight: 600 }}>Документы от предприятия</span>}>
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {offer.templates.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "#F8FAFC",
                  borderRadius: 6,
                  border: "1px solid #E2E8F0",
                }}
              >
                <Space>
                  <FileOutlined style={{ color: "#2563EB" }} />
                  <Text style={{ fontSize: 13 }}>{t.documentType.name}</Text>
                </Space>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  loading={downloadingTemplate === t.id}
                  onClick={() => handleDownloadTemplate(t.id, t.documentType.name)}
                >
                  Скачать
                </Button>
              </div>
            ))}
          </Space>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 12 }}>
            Шаблоны документов предоставлены предприятием для ознакомления
          </Text>
        </Card>
      )}

      {reviewCount > 0 && (
        <Card title={<><StarFilled style={{ color: "#D97706", marginRight: 6 }} /><span style={{ fontWeight: 600 }}>Отзывы студентов ({reviewCount})</span></>}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {offer.offerReviews!.map((r, i) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: i < reviewCount - 1 ? "1px solid #E2E8F0" : undefined }}>
                <Rate disabled defaultValue={r.rating} style={{ fontSize: 14 }} />
                {r.comment && (
                  <Paragraph style={{ fontSize: 13, color: "#374151", marginTop: 6, marginBottom: 0 }}>
                    {r.comment}
                  </Paragraph>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(r.createdAt).format("DD.MM.YYYY")}
                </Text>
              </div>
            ))}
          </Space>
        </Card>
      )}
    </Space>
  );
}
