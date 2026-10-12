import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { admin, getUser } from "@/lib/server";
import { PLANS, type PlanId } from "@/lib/pricing";

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: string };
  const plan = body.plan as PlanId;
  if (plan !== "month" && plan !== "year") {
    return NextResponse.json({ error: "BAD_PLAN" }, { status: 400 });
  }

  const amount = PLANS[plan].price;
  const code = "GDS" + randomBytes(4).toString("hex").toUpperCase();

  const { error } = await admin.from("orders").insert({
    code,
    user_id: user.id,
    amount,
    credits: 0,
    plan,
  });
  if (error) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  // Đã thêm encodeURIComponent cho code để đảm bảo URL luôn an toàn
  const qrUrl =
    `https://img.vietqr.io/image/${process.env.BANK_ID}-${process.env.BANK_ACCOUNT}-compact2.png` +
    `?amount=${amount}&addInfo=${encodeURIComponent(code)}` +
    `&accountName=${encodeURIComponent(process.env.BANK_ACCOUNT_NAME || "")}`;

  return NextResponse.json({ code, amount, qrUrl });
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const code = new URL(req.url).searchParams.get("code");

  // === MỤC 5 THÊM VÀO ĐÂY ===
  // Kiểm tra nếu không truyền parameter ?code=... hoặc code rỗng
  if (!code) {
    return NextResponse.json({ error: "MISSING_CODE" }, { status: 400 });
  }
  // =========================

  const { data } = await admin
    .from("orders")
    .select("status")
    .eq("code", code)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ status: data?.status ?? "not_found" });
}