"use client";

import { useEffect, useState, useCallback } from "react";
import {
  App, Card, Typography, Space, Button, Tag, Empty, Spin, Segmented, Pagination,
} from "antd";
import {
  BellOutlined, FileDoneOutlined, CheckCircleOutlined, CloseCircleOutlined,
  TrophyOutlined, FileOutlined, EditOutlined, CheckSquareOutlined, CheckOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ru";

dayjs.extend(relativeTime);
dayjs.locale("ru");

const { Title, Text } = Typography;

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

const TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  practice_submitted:      { label: "Подача практики",    color: "#2563EB", icon: <FileDoneOutlined /> },
  practice_approved:       { label: "Практика принята",   color: "#16A34A", icon: <CheckCircleOutlined /> },
  practice_reviewed:       { label: "Практика отклонена", color: "#DC2626", icon: <CloseCircleOutlined /> },
  practice_graded:         { label: "Оценка выставлена",  color: "#D97706", icon: <TrophyOutlined /> },
  practice_needs_revision: { label: "На доработку",       color: "#D97706", icon: <EditOutlined /> },
  practice_completed:      { label: "Практика завершена", color: "#16A34A", icon: <CheckSquareOutlined /> },
  document_reviewed:       { label: "Документ проверен",  color: "#2563EB", icon: <FileOutlined /> },
  practice_comment:        { label: "Сообщение",           color: "#7C3AED", icon: <MessageOutlined /> },
};

function getIcon(type: string, isRead: boolean) {
  const meta = TYPE_META[type];
  const color = isRead ? "#94A3B8" : (meta?.color ?? "#64748B");
  const icon = meta?.icon ?? <BellOutlined />;
  return <span style={{ fontSize: 20, color }}>{icon}</span>;
}

export default function NotificationsPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async (p = page, f = filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
      if (f === "unread") params.set("unread", "true");
      const res = await fetch(`/api/notifications?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      message.error("Не удалось загрузить уведомления");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { load(page, filter); }, [page, filter]);

  async function markRead(id: number) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    message.success("Все уведомления отмечены как прочитанные");
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Уведомления</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {unreadCount > 0 ? `${unreadCount} непрочитанных` : "Все прочитаны"}
          </Text>
        </div>
        <Space>
          <Segmented
            options={[
              { label: "Все", value: "all" },
              { label: `Непрочитанные${unreadCount > 0 ? ` (${unreadCount})` : ""}`, value: "unread" },
            ]}
            value={filter}
            onChange={(v) => { setFilter(v as "all" | "unread"); setPage(1); }}
          />
          {unreadCount > 0 && (
            <Button icon={<CheckOutlined />} onClick={markAllRead}>
              Прочитать все
            </Button>
          )}
        </Space>
      </div>

      <Card style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}><Spin /></div>
        ) : items.length === 0 ? (
          <Empty
            description={filter === "unread" ? "Непрочитанных уведомлений нет" : "Уведомлений пока нет"}
            style={{ padding: "48px 0" }}
          />
        ) : (
          items.map((n, idx) => {
            const meta = TYPE_META[n.type];
            const content = (
              <div
                key={n.id}
                onClick={() => { if (!n.isRead) markRead(n.id); }}
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "16px 24px",
                  background: n.isRead ? "#fff" : "#EFF6FF",
                  borderBottom: idx < items.length - 1 ? "1px solid #F1F5F9" : "none",
                  cursor: n.link ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.isRead ? "#F8FAFC" : "#DBEAFE"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.isRead ? "#fff" : "#EFF6FF"; }}
              >
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {getIcon(n.type, n.isRead)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <Space size={8} style={{ flexWrap: "wrap" }}>
                        <Text strong={!n.isRead} style={{ fontSize: 14 }}>{n.title}</Text>
                        {meta && (
                          <Tag color={n.isRead ? "default" : undefined} style={!n.isRead ? { color: meta.color, borderColor: meta.color, background: "transparent" } : {}}>
                            {meta.label}
                          </Tag>
                        )}
                        {!n.isRead && <Tag color="blue">Новое</Tag>}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
                        {n.body}
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                      {dayjs(n.createdAt).format("DD.MM.YYYY HH:mm")}
                    </Text>
                  </div>
                </div>
              </div>
            );

            return n.link ? (
              <Link href={n.link} key={n.id} style={{ display: "block", color: "inherit", textDecoration: "none" }}>
                {content}
              </Link>
            ) : content;
          })
        )}
      </Card>

      {total > pageSize && (
        <div style={{ textAlign: "right" }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={setPage}
            showTotal={(t) => `Всего: ${t}`}
          />
        </div>
      )}
    </Space>
  );
}
