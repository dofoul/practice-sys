"use client";

import { Avatar, Space, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Sidebar } from "./Sidebar";
import { SignOutButton } from "./SignOutButton";
import { NotificationBell } from "./NotificationBell";

interface Props {
  role: string;
  userName: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, userName, children }: Props) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F5F7FA" }}>
      <Sidebar role={role} userName={userName} />

      <div style={{ flex: 1, marginInlineStart: 240, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #E2E8F0",
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: 64,
            flexShrink: 0,
          }}
        >
          <div />
          <Space size={8}>
            <NotificationBell />
            <Typography.Text strong style={{ fontSize: 14, color: "#0F172A" }}>
              {userName}
            </Typography.Text>
            <Avatar size={36} style={{ background: "#2563EB" }} icon={<UserOutlined />} />
            <SignOutButton />
          </Space>
        </div>

        {/* Content */}
        <div style={{ padding: 24, flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
