import { auth } from "@/auth";
import { NextResponse } from "next/server";

export type ApiSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

export async function requireAuth(): Promise<
  { session: ApiSession; error: null } | { session: null; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Не авторизован" }, { status: 401 }),
    };
  }
  return { session: session as ApiSession, error: null };
}

export function requireRole(session: ApiSession, ...roles: string[]): NextResponse | null {
  if (!roles.includes(session.user.role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }
  return null;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
