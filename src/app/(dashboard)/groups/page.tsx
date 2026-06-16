"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Typography,
  Space,
  Collapse,
  Tag,
  Button,
  Empty,
  Spin,
  Alert,
  Avatar,
  Tooltip,
} from "antd";
import {
  TeamOutlined,
  UserOutlined,
  EyeOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { PracticeStatusTag } from "@/components/ui/PracticeStatusTag";

const { Title, Text } = Typography;

interface Student {
  id: number;
  recordBookNo?: string;
  user: { fullName: string; email: string };
  practices: { id: number; status: string; practiceType: { name: string } }[];
}

interface Group {
  id: number;
  name: string;
  course?: number;
  specialty: { name: string; institution: { name: string } };
  students: Student[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/groups");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setGroups(data);
      } catch {
        setError("Не удалось загрузить данные групп");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const studentColumns = [
    {
      title: "Студент",
      key: "student",
      render: (s: Student) => (
        <Space>
          <Avatar size={32} icon={<UserOutlined />} style={{ background: "#2563EB" }} />
          <div>
            <Text strong style={{ fontSize: 13 }}>{s.user.fullName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{s.user.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Зачётная книжка",
      dataIndex: "recordBookNo",
      key: "recordBook",
      render: (v: string | undefined) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Практики",
      key: "practices",
      render: (s: Student) => (
        <Space size={4} wrap>
          {s.practices.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>Нет практик</Text>
          ) : (
            s.practices.map((p) => (
              <PracticeStatusTag key={p.id} status={p.status} />
            ))
          )}
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (s: Student) => (
        <Space size={4}>
          {s.practices.map((p) => (
            <Tooltip key={p.id} title={`Открыть практику: ${p.practiceType.name}`}>
              <Link href={`/practices/${p.id}`}>
                <Button size="small" icon={<FileTextOutlined />} />
              </Link>
            </Tooltip>
          ))}
        </Space>
      ),
    },
  ];

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spin size="large" /></div>;
  if (error) return <Alert type="error" message={error} showIcon />;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>Мои группы</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Студенты и их практики</Text>
      </div>

      {groups.length === 0 ? (
        <Card>
          <Empty description="Группы не назначены" />
        </Card>
      ) : (
        <Collapse
          defaultActiveKey={groups.map((g) => String(g.id))}
          style={{ background: "transparent", border: "none" }}
          items={groups.map((group) => ({
            key: String(group.id),
            label: (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <TeamOutlined style={{ color: "#2563EB", fontSize: 16 }} />
                <div>
                  <Text strong style={{ fontSize: 15 }}>{group.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    {group.specialty?.institution?.name} — {group.specialty?.name}
                  </Text>
                </div>
                <Tag color="blue">{group.students.length} студ.</Tag>
                {group.course && <Tag>Курс {group.course}</Tag>}
              </div>
            ),
            children: (
              <Table
                dataSource={group.students}
                columns={studentColumns}
                rowKey="id"
                pagination={false}
                locale={{ emptyText: <Empty description="Студентов нет" /> }}
                scroll={{ x: 600 }}
                size="small"
              />
            ),
            style: {
              background: "#FFFFFF",
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              marginBottom: 12,
            },
          }))}
        />
      )}
    </Space>
  );
}
