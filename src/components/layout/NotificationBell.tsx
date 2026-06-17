"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge, Dropdown, Button, Typography, Space, Tooltip } from "antd";
import {
  BellOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  FileOutlined,
  EditOutlined,
  CheckSquareOutlined,
  RightOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ru";

dayjs.extend(relativeTime);
dayjs.locale("ru");

const { Text } = Typography;

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

function NotificationIcon({ type, isRead }: { type: string; isRead: boolean }) {
  const color = isRead ? "#94A3B8" : undefined;
  const props = { style: { fontSize: 16, color } };

  switch (type) {
    case "practice_submitted":   return <FileDoneOutlined {...props} style={{ ...props.style, color: color ?? "#2563EB" }} />;
    case "practice_approved":    return <CheckCircleOutlined {...props} style={{ ...props.style, color: color ?? "#16A34A" }} />;
    case "practice_reviewed":    return <CloseCircleOutlined {...props} style={{ ...props.style, color: color ?? "#DC2626" }} />;
    case "practice_graded":      return <TrophyOutlined {...props} style={{ ...props.style, color: color ?? "#D97706" }} />;
    case "practice_needs_revision": return <EditOutlined {...props} style={{ ...props.style, color: color ?? "#D97706" }} />;
    case "practice_completed":   return <CheckSquareOutlined {...props} style={{ ...props.style, color: color ?? "#16A34A" }} />;
    case "document_reviewed":    return <FileOutlined {...props} style={{ ...props.style, color: color ?? "#2563EB" }} />;
    default:                     return <BellOutlined {...props} />;
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?pageSize=10");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  async function markRead(id: number) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  const dropdownContent = (
    <div style={{ width: 360, background: "#fff", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Text strong style={{ fontSize: 14 }}>Уведомления</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={markAllRead}>
            Прочитать все
          </Button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div style={{ padding: "32px 16px", textAlign: "center" }}>
          <Text type="secondary" style={{ fontSize: 13 }}>Уведомлений нет</Text>
        </div>
      ) : (
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => { if (!n.isRead) markRead(n.id); setOpen(false); }}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 16px",
                background: n.isRead ? "#fff" : "#EFF6FF",
                borderBottom: "1px solid #F1F5F9",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.isRead ? "#F8FAFC" : "#DBEAFE"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.isRead ? "#fff" : "#EFF6FF"; }}
            >
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <NotificationIcon type={n.type} isRead={n.isRead} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <Text strong={!n.isRead} style={{ fontSize: 13, lineHeight: 1.4 }}>{n.title}</Text>
                  {!n.isRead && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563EB", flexShrink: 0, marginTop: 4 }} />}
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.body}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
                  {dayjs(n.createdAt).fromNow()}
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid #E2E8F0", textAlign: "center" }}>
        <Link href="/notifications" onClick={() => setOpen(false)}>
          <Button type="link" size="small" style={{ fontSize: 13 }} icon={<RightOutlined style={{ fontSize: 10 }} />} iconPosition="end">
            Все уведомления
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => dropdownContent}
      placement="bottomRight"
      trigger={["click"]}
    >
      <Tooltip title="Уведомления">
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18, color: "#0F172A" }} />}
            style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}
          />
        </Badge>
      </Tooltip>
    </Dropdown>
  );
}
