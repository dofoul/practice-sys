"use client";

import { useEffect, useState } from "react";
import {
  Card, Col, Row, Statistic, Typography, Space, Table, Tag, Progress,
  Spin, Empty,
} from "antd";
import {
  ApartmentOutlined, TeamOutlined, CheckCircleOutlined,
  CloseCircleOutlined, StarOutlined, TrophyOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:          { label: "Черновик",       color: "default"    },
  submitted:      { label: "На проверке",    color: "processing" },
  needs_revision: { label: "На доработке",   color: "warning"    },
  approved:       { label: "Принято",        color: "success"    },
  rejected:       { label: "Отклонено",      color: "error"      },
  completed:      { label: "Завершено",      color: "green"      },
};

interface Summary {
  totalOffers: number;
  publishedOffers: number;
  draftOffers: number;
  totalSlots: number;
  takenSlots: number;
  totalApplicants: number;
  avgRating: number | null;
  reviewCount: number;
}

interface OfferStat {
  id: number;
  title: string;
  isPublished: boolean;
  slotsTotal: number;
  slotsTaken: number;
  applicantsCount: number;
  fillPercent: number;
}

interface RecentApplicant {
  id: number;
  status: string;
  createdAt: string;
  student: { user: { fullName: string }; group: { name: string } };
  offer: { title: string };
}

interface AnalyticsData {
  summary: Summary;
  statusCounts: Record<string, number>;
  offerStats: OfferStat[];
  recentApplicants: RecentApplicant[];
}

export default function CompanyAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/company/analytics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) return <Empty description="Не удалось загрузить аналитику" />;

  const { summary, statusCounts, offerStats, recentApplicants } = data;

  const offerColumns = [
    {
      title: "Вакансия",
      dataIndex: "title",
      key: "title",
      render: (title: string, r: OfferStat) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 13 }}>{title}</Text>
          <Tag color={r.isPublished ? "green" : "default"} style={{ fontSize: 11 }}>
            {r.isPublished ? "Опубликовано" : "Черновик"}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Места",
      key: "slots",
      width: 140,
      render: (r: OfferStat) => (
        <Space direction="vertical" size={2} style={{ width: "100%" }}>
          <Text style={{ fontSize: 12 }}>{r.slotsTaken} / {r.slotsTotal}</Text>
          <Progress percent={r.fillPercent} size="small" showInfo={false} />
        </Space>
      ),
    },
    {
      title: "Откликов",
      dataIndex: "applicantsCount",
      key: "applicantsCount",
      width: 100,
      render: (v: number) => <Text>{v}</Text>,
    },
  ];

  const recentColumns = [
    {
      title: "Студент",
      key: "student",
      render: (r: RecentApplicant) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.student.user.fullName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.student.group.name}</Text>
        </Space>
      ),
    },
    {
      title: "Вакансия",
      key: "offer",
      render: (r: RecentApplicant) => <Text style={{ fontSize: 13 }}>{r.offer.title}</Text>,
    },
    {
      title: "Статус",
      key: "status",
      width: 130,
      render: (r: RecentApplicant) => {
        const s = STATUS_LABELS[r.status] ?? { label: r.status, color: "default" };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: "Дата",
      key: "date",
      width: 110,
      render: (r: RecentApplicant) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(r.createdAt).format("DD.MM.YYYY")}
        </Text>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>Аналитика</Title>
        <Text type="secondary">Сводная статистика по вашим вакансиям и студентам</Text>
      </div>

      {/* Summary cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Всего вакансий"
              value={summary.totalOffers}
              prefix={<ApartmentOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {summary.publishedOffers} опубл. · {summary.draftOffers} черновик.
            </Text>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Заполненность мест"
              value={summary.takenSlots}
              suffix={`/ ${summary.totalSlots}`}
              prefix={<TeamOutlined />}
            />
            {summary.totalSlots > 0 && (
              <Progress
                percent={Math.round((summary.takenSlots / summary.totalSlots) * 100)}
                size="small"
                style={{ marginTop: 4 }}
              />
            )}
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Принято"
              value={statusCounts["approved"] ?? 0}
              valueStyle={{ color: "#16a34a" }}
              prefix={<CheckCircleOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Отклонено: {statusCounts["rejected"] ?? 0}
            </Text>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Завершено практик"
              value={statusCounts["completed"] ?? 0}
              valueStyle={{ color: "#2563eb" }}
              prefix={<TrophyOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Всего откликов: {summary.totalApplicants}
            </Text>
          </Card>
        </Col>
        {summary.avgRating !== null && (
          <Col xs={12} sm={8} md={6}>
            <Card>
              <Statistic
                title="Средний рейтинг"
                value={summary.avgRating}
                precision={1}
                valueStyle={{ color: "#d97706" }}
                prefix={<StarOutlined />}
                suffix={`/ 5 (${summary.reviewCount} отзыв.)`}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Status breakdown */}
      {Object.keys(statusCounts).length > 0 && (
        <Card title="Заявки по статусам">
          <Space wrap size={12}>
            {Object.entries(statusCounts).map(([status, count]) => {
              const s = STATUS_LABELS[status] ?? { label: status, color: "default" };
              return (
                <div key={status} style={{ textAlign: "center", minWidth: 80 }}>
                  <Tag color={s.color} style={{ fontSize: 13, padding: "2px 10px" }}>{s.label}</Tag>
                  <div style={{ marginTop: 4 }}>
                    <Text strong style={{ fontSize: 20 }}>{count}</Text>
                  </div>
                </div>
              );
            })}
          </Space>
        </Card>
      )}

      {/* Offers table */}
      <Card title="Вакансии — заполненность">
        <Table
          dataSource={offerStats}
          columns={offerColumns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="Вакансий нет" /> }}
          size="small"
        />
      </Card>

      {/* Recent applicants */}
      <Card title={<><TeamOutlined /> Последние отклики</>}>
        <Table
          dataSource={recentApplicants}
          columns={recentColumns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="Откликов ещё нет" /> }}
          size="small"
        />
      </Card>
    </Space>
  );
}
