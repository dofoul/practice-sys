import { Button, Result } from "antd";
import Link from "next/link";

export default function NotFound() {
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
        status="404"
        title="404"
        subTitle="Страница не найдена. Возможно, она была удалена или вы ввели неверный адрес."
        extra={
          <Link href="/dashboard">
            <Button type="primary" size="large">
              На главную
            </Button>
          </Link>
        }
      />
    </div>
  );
}
