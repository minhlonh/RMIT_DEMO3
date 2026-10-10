"use client";

import { useCallback, useState } from "react";
// Đổi dòng này thành file tạo Supabase client mà dự án của bạn đang dùng
import { supabase } from "@/lib/supabase";

export function useCredit() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  // Trả về true nếu được phép chạy tính năng, false nếu bị chặn
  const consume = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return false; // chưa đăng nhập

    setAccessToken(session.access_token);

    const res = await fetch("/api/usage/consume", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.status === 402) {
      setShowPaywall(true);
      return false;
    }
    return res.ok;
  }, []);

  return { consume, showPaywall, setShowPaywall, accessToken };
}