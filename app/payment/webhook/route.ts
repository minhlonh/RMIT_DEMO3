import { NextResponse } from "next/server";
import { admin } from "@/lib/server";

// SePay gọi vào đây khi có tiền vào tài khoản
export async function POST(req: Request) {
  const apiKey = process.env.SEPAY_API_KEY;
  if (!apiKey || req.headers.get("authorization") !== `Apikey ${apiKey}`) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const body = await req.json();
  if (body.transferType !== "in") {
    return NextResponse.json({ success: true });
  }

  const text = String(body.content || body.code || "").toUpperCase();
  const match = text.match(/GDS[A-F0-9]{8}/);
  if (!match) {
    return NextResponse.json({ success: true });
  }

  await admin.rpc("mark_order_paid", {
    p_code: match[0],
    p_amount: Number(body.transferAmount),
  });

  return NextResponse.json({ success: true });
}
