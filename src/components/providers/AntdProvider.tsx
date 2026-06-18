"use client";

import "@ant-design/v5-patch-for-react-19";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";

const designTokens = {
  token: {
    colorPrimary: "#2563EB",
    colorSuccess: "#16A34A",
    colorWarning: "#D97706",
    colorError: "#DC2626",
    colorInfo: "#2563EB",
    colorTextBase: "#0F172A",
    colorBgLayout: "#F5F7FA",
    colorBorder: "#E2E8F0",
    borderRadius: 8,
    fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif",
    fontSize: 14,
    controlHeight: 38,
  },
  components: {
    Layout: {
      headerBg: "#FFFFFF",
      siderBg: "#0F172A",
      bodyBg: "#F5F7FA",
    },
    Card: { paddingLG: 24 },
    Table: {
      headerBg: "#F8FAFC",
      rowHoverBg: "#F1F5F9",
      cellPaddingBlock: 12,
    },
    Button: { fontWeight: 500 },
    Menu: {
      darkItemBg: "#0F172A",
      darkSubMenuItemBg: "#1E293B",
      darkItemSelectedBg: "#2563EB",
      darkItemHoverBg: "#1E293B",
    },
  },
};

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={designTokens} locale={ruRU} warning={{ strict: false }}>
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
