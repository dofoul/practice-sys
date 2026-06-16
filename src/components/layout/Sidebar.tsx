"use client";

import { useState } from "react";
import { Layout, Menu, Typography } from "antd";
import {
  DashboardOutlined,
  FileTextOutlined,
  BookOutlined,
  TeamOutlined,
  UserOutlined,
  BankOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  SettingOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  role: string;
  userName: string;
}

function getMenuItems(role: string) {
  const common = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">Главная</Link>,
    },
  ];

  const studentItems = [
    {
      key: "/practices",
      icon: <FileTextOutlined />,
      label: <Link href="/practices">Мои практики</Link>,
    },
    {
      key: "/catalog",
      icon: <BookOutlined />,
      label: <Link href="/catalog">Каталог мест</Link>,
    },
  ];

  const curatorItems = [
    {
      key: "/practices",
      icon: <FileTextOutlined />,
      label: <Link href="/practices">Практики студентов</Link>,
    },
    {
      key: "/groups",
      icon: <TeamOutlined />,
      label: <Link href="/groups">Мои группы</Link>,
    },
    {
      key: "/catalog",
      icon: <BookOutlined />,
      label: <Link href="/catalog">Каталог мест</Link>,
    },
  ];

  const adminItems = [
    {
      key: "/practices",
      icon: <FileTextOutlined />,
      label: <Link href="/practices">Все практики</Link>,
    },
    {
      key: "/groups",
      icon: <TeamOutlined />,
      label: <Link href="/groups">Группы</Link>,
    },
    {
      key: "/catalog",
      icon: <BookOutlined />,
      label: <Link href="/catalog">Каталог мест</Link>,
    },
    {
      key: "admin",
      icon: <SettingOutlined />,
      label: "Администрирование",
      children: [
        {
          key: "/admin/users",
          icon: <UserOutlined />,
          label: <Link href="/admin/users">Пользователи</Link>,
        },
        {
          key: "/admin/students",
          icon: <SolutionOutlined />,
          label: <Link href="/admin/students">Студенты</Link>,
        },
        {
          key: "/admin/institutions",
          icon: <BankOutlined />,
          label: <Link href="/admin/institutions">Заведения</Link>,
        },
        {
          key: "/admin/periods",
          icon: <CalendarOutlined />,
          label: <Link href="/admin/periods">Периоды практик</Link>,
        },
        {
          key: "/admin/dictionaries",
          icon: <DatabaseOutlined />,
          label: <Link href="/admin/dictionaries">Справочники</Link>,
        },
      ],
    },
  ];

  switch (role) {
    case "admin":
      return [...common, ...adminItems];
    case "curator":
      return [...common, ...curatorItems];
    case "student":
    default:
      return [...common, ...studentItems];
  }
}

export function Sidebar({ role, userName }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const selectedKey =
    pathname === "/dashboard"
      ? "/dashboard"
      : pathname.startsWith("/admin/users")
        ? "/admin/users"
        : pathname.startsWith("/admin/institutions")
          ? "/admin/institutions"
          : pathname.startsWith("/admin/periods")
            ? "/admin/periods"
            : pathname.startsWith("/admin/dictionaries")
              ? "/admin/dictionaries"
              : pathname.startsWith("/admin/students")
                ? "/admin/students"
                : pathname.startsWith("/practices")
                ? "/practices"
                : pathname.startsWith("/catalog")
                  ? "/catalog"
                  : pathname.startsWith("/groups")
                    ? "/groups"
                    : pathname;

  const openKeys = pathname.startsWith("/admin/") ? ["admin"] : [];

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={240}
      style={{
        background: "#0F172A",
        overflow: "auto",
        height: "100vh",
        position: "fixed",
        insetInlineStart: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? 0 : "0 24px",
          borderBottom: "1px solid #1E293B",
        }}
      >
        {!collapsed && (
          <Typography.Text
            strong
            style={{ color: "#FFFFFF", fontSize: 16, whiteSpace: "nowrap" }}
          >
            📋 УчётПрактик
          </Typography.Text>
        )}
        {collapsed && (
          <Typography.Text strong style={{ color: "#2563EB", fontSize: 18 }}>
            УП
          </Typography.Text>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={openKeys}
        items={getMenuItems(role)}
        style={{ background: "#0F172A", border: "none", marginTop: 8 }}
      />

      {!collapsed && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 0,
            right: 0,
            padding: "12px 24px",
            borderTop: "1px solid #1E293B",
          }}
        >
          <Typography.Text style={{ color: "#94A3B8", fontSize: 12, display: "block" }}>
            {role === "admin" ? "Администратор" : role === "curator" ? "Куратор" : "Студент"}
          </Typography.Text>
          <Typography.Text
            style={{
              color: "#CBD5E1",
              fontSize: 13,
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {userName}
          </Typography.Text>
        </div>
      )}
    </Layout.Sider>
  );
}
