"use client";

import { Button, Tooltip } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <Tooltip title="Выйти">
      <Button
        type="text"
        icon={<LogoutOutlined />}
        onClick={() => signOut({ callbackUrl: "/login" })}
        style={{ color: "#64748B" }}
        aria-label="Выйти из системы"
      />
    </Tooltip>
  );
}
