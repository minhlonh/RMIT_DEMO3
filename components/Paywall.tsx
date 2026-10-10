"use client";

import { useEffect, useState } from "react";

type Props = {
  accessToken: string;
  onPaid: () => void;
  onClose: () => void;
};

const PACKS = [
  { id: "p20", label: "20 lượt - 20.000đ" },
  { id: "p100", label: "100 lượt - 80.000đ" },
];

export default function Paywall({ accessToken, onPaid, onClose }: Props) {
  const [order, setOrder] = useState<{ code: string; amount: number; qrUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function createOrder(packageId: string) {
    setLoading(true);
    const res = await fetch("/api/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ packageId }),
    });
    setOrder(await res.json());
    setLoading(false);
  }

  // Cứ 3 giây hỏi server xem đơn đã được thanh toán chưa
  useEffect(() => {
    if (!order) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/payment/create?code=${order.code}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const { status } = await res.json();
      if (status === "paid") {
        clearInterval(timer);
        onPaid();
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [order, accessToken, onPaid]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <h2 className="mb-2 text-xl font-bold">Bạn đã dùng hết lượt miễn phí</h2>

        {!order ? (
          <div className="mt-4 space-y-3">
            {PACKS.map((p) => (
              <button
                key={p.id}
                disabled={loading}
                onClick={() => createOrder(p.id)}
                className="w-full rounded-xl border px-4 py-3 font-medium hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={order.qrUrl} alt="QR thanh toán" className="mx-auto w-56" />
            <p className="mt-2 text-sm">
              Số tiền: <b>{order.amount.toLocaleString("vi-VN")}đ</b>
            </p>
            <p className="text-sm">
              Nội dung chuyển khoản: <b>{order.code}</b>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Hệ thống tự cộng lượt sau khi nhận được tiền.
            </p>
          </div>
        )}

        <button onClick={onClose} className="mt-4 text-sm text-gray-500 underline">
          Đóng
        </button>
      </div>
    </div>
  );
}