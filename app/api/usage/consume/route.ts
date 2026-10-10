import { NextResponse } from "next/server";
import { admin, getUser, FREE_LIMIT } from "@/lib/server";

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await admin.rpc("consume_credit", {
    p_user: user.id,
    p_free_limit: FREE_LIMIT,
  });

  if (error) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }
  return NextResponse.json({ ok: true });
}