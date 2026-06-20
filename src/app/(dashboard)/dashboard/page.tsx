"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Typography,
  Spin,
  Empty,
  Alert,
  Space,
  Button,
} from "antd";
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ApartmentOutlined,
  TeamOutlined,
  StarOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PracticeStatusTag } from "@/components/ui/PracticeStatusTag";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface CompanyStats {
  activeOffers: number;
  takenSlots: number;
  completedPractices: number;
  pendingPractices: number;
  avgRating: number | null;
  reviewCount: number;
  recentApplicants: {
    id: number;
    status: string;
    student: { user: { fullName: string }; group: { name: string } };
    offer: { title: string };
    createdAt: string;
  }[];
}

interface Stats {
  total: number;
  submitted: number;
  approved: number;
  needsRevision: number;
}

interface RecentPractice {
  id: number;
  status: string;
  practiceType: { name: string };
  period: { name: string };
  student?: { user: { fullName: string } };
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentPractice[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = session?.user?.role;

  useEffect(() => {
    async function load() {
      try {
        if (role === "company") {
          const res = await fetch("/api/company/dashboard");
          if (!res.ok) throw new Error();
          setCompanyStats(await res.json());
        } else {
          const res = await fetch("/api/dashboard");
          if (!res.ok) throw new Error("Ошибка загрузки");
          const data = await res.json();
          setStats(data.stats);
          setRecent(data.recent);
        }
      } catch {
        setError("Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    }
    if (role !== undefined) load();
  }, [role]);

  const columns = [
    ...(role !== "student"
      ? [
          {
            title: "Студент",
            key: "student",
            render: (r: RecentPractice) => r.student?.user?.fullName ?? "—",
          },
        ]
      : []),
    {
      title: "Тип практики",
      key: "type",
      render: (r: RecentPractice) => r.practiceType?.name,
    },
    {
      title: "Период",
      key: "period",
      render: (r: RecentPractice) => r.period?.name,
    },
    {
      title: "Статус",
      key: "status",
      render: (r: RecentPractice) => <PracticeStatusTag status={r.status} />,
    },
    {
      title: "Обновлено",
      key: "updated",
      render: (r: RecentPractice) => dayjs(r.updatedAt).format("DD.MM.YYYY"),
    },
    {
      title: "",
      key: "action",
      render: (r: RecentPractice) => (
        <Link href={`/practices/${r.id}`}>Открыть</Link>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (role === "company" && companyStats) {
    const applicantColumns = [
      { title: "Студент", key: "student", render: (r: CompanyStats["recentApplicants"][0]) => r.student.user.fullName },
      { title: "Группа", key: "group", render: (r: CompanyStats["recentApplicants"][0]) => r.student.group.name },
      { title: "Вакансия", key: "offer", render: (r: CompanyStats["recentApplicants"][0]) => r.offer.title },
      { title: "Статус", key: "status", render: (r: CompanyStats["recentApplicants"][0]) => <PracticeStatusTag status={r.status} /> },
      { title: "Записан", key: "date", render: (r: CompanyStats["recentApplicants"][0]) => dayjs(r.createdAt).format("DD.MM.YYYY") },
    ];
    return (
      <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Дашборд предприятия</Title>
          <Text type="secondary">Статистика по вашим вакансиям и студентам</Text>
        </div>
        {error && <Alert type="error" message={error} showIcon />}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            <Card><Statistic title="Активных вакансий" value={companyStats.activeOffers} prefix={<ApartmentOutlined style={{ color: "#2563EB" }} />} valueStyle={{ color: "#0F172A", fontWeight: 600 }} /></Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card><Statistic title="Студентов сейчас" value={companyStats.takenSlots} prefix={<TeamOutlined style={{ color: "#D97706" }} />} valueStyle={{ color: "#D97706", fontWeight: 600 }} /></Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card><Statistic title="Завершили практику" value={companyStats.completedPractices} prefix={<CheckCircleOutlined style={{ color: "#16A34A" }} />} valueStyle={{ color: "#16A34A", fontWeight: 600 }} /></Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card><Statistic title="Средний рейтинг" value={companyStats.avgRating ?? "—"} suffix={companyStats.reviewCount ? `(${companyStats.reviewCount} отз.)` : ""} prefix={<StarOutlined style={{ color: "#D97706" }} />} valueStyle={{ color: "#D97706", fontWeight: 600 }} /></Card>
          </Col>
        </Row>
        <Card
          title={<span style={{ fontWeight: 600 }}>Последние студенты</span>}
          extra={<Link href="/company/offers">Все вакансии →</Link>}
        >
          <Table dataSource={companyStats.recentApplicants} columns={applicantColumns} rowKey="id" pagination={false} locale={{ emptyText: <Empty description="Пока нет студентов" /> }} scroll={{ x: true }} />
        </Card>
        <div style={{ display: "flex", gap: 12 }}>
          <Button type="primary" icon={<ApartmentOutlined />}>
            <Link href="/company/offers">Управление вакансиями</Link>
          </Button>
          <Button icon={<IdcardOutlined />}>
            <Link href="/company/profile">Профиль компании</Link>
          </Button>
        </div>
      </Space>
    );
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          {role === "student"
            ? "Мои практики"
            : role === "curator"
              ? "Обзор практик моих групп"
              : "Обзор системы"}
        </Title>
        <Text type="secondary">Актуальная статистика и последние изменения</Text>
      </div>

      {error && <Alert type="error" message={error} showIcon />}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Всего практик"
              value={stats?.total ?? 0}
              prefix={<FileTextOutlined style={{ color: "#2563EB" }} />}
              valueStyle={{ color: "#0F172A", fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="На проверке"
              value={stats?.submitted ?? 0}
              prefix={<ClockCircleOutlined style={{ color: "#D97706" }} />}
              valueStyle={{ color: "#D97706", fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Принято"
              value={stats?.approved ?? 0}
              prefix={<CheckCircleOutlined style={{ color: "#16A34A" }} />}
              valueStyle={{ color: "#16A34A", fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="На доработке"
              value={stats?.needsRevision ?? 0}
              prefix={<ExclamationCircleOutlined style={{ color: "#DC2626" }} />}
              valueStyle={{ color: "#DC2626", fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {role === "student" ? "Последние практики" : "Требуют внимания"}
          </span>
        }
        extra={<Link href="/practices">Все практики →</Link>}
      >
        <Table
          dataSource={recent}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="Нет данных" /> }}
          scroll={{ x: true }}
        />
      </Card>
    </Space>
  );
}
