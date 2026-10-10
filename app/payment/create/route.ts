import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { admin, getUser, PACKAGES } from "@/lib/server";

// Tạo đơn + QR
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { packageId } = await req.json();
  const pkg = PACKAGES[packageId];
  if (!pkg) {
    return NextResponse.json({ error: "BAD_PACKAGE" }, { status: 400 });
  }

  const code = "GDS" + randomBytes(4).toString("hex").toUpperCase();

  const { error } = await admin.from("orders").insert({
    code,
    user_id: user.id,
    amount: pkg.amount,
    credits: pkg.credits,
  });
  if (error) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  const qrUrl =
    `https://img.vietqr.io/image/${process.env.BANK_ID}-${process.env.BANK_ACCOUNT}-compact2.png` +
    `?amount=${pkg.amount}&addInfo=${code}` +
    `&accountName=${encodeURIComponent(process.env.BANK_ACCOUNT_NAME || "")}`;

  return NextResponse.json({ code, amount: pkg.amount, qrUrl });
}

// Hỏi trạng thái đơn (để popup tự đóng khi đã trả tiền)
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const code = new URL(req.url).searchParams.get("code");
  const { data } = await admin
    .from("orders")
    .select("status")
    .eq("code", code)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ status: data?.status ?? "not_found" });
}