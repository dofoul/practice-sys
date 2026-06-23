"use client";

import { useEffect } from "react";
import { Button, Result } from "antd";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F5F7FA",
      }}
    >
      <Result
        status="500"
        title="Что-то пошло не так"
        subTitle="Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернитесь позже."
        extra={[
          <Button type="primary" size="large" onClick={reset} key="retry">
            Попробовать снова
          </Button>,
          <Button size="large" href="/dashboard" key="home">
            На главную
          </Button>,
        ]}
      />
    </div>
  );
}
