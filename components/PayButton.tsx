'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Order = { qrUrl: string; code: string; amount: number }
type Status = 'idle' | 'loading' | 'pending' | 'paid' | 'error'

export default function PayButton() {
  const [order, setOrder] = useState<Order | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function startPayment() {
    setStatus('loading')
    const token = await getToken()
    if (!token) {
      setStatus('error')
      setMessage('Bạn cần đăng nhập trước')
      return
    }
    const res = await fetch('/payment/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) {
      setStatus('error')
      setMessage(data.error || 'Có lỗi xảy ra')
      return
    }
    setOrder(data)
    setStatus('pending')
  }

  // Hỏi server mỗi 3 giây xem đã trả tiền chưa
  useEffect(() => {
    if (status !== 'pending' || !order) return
    const timer = setInterval(async () => {
      const token = await getToken()
      const res = await fetch(`/payment/status?code=${order.code}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.status === 'paid') {
        setStatus('paid')
        clearInterval(timer)
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [status, order])

  if (status === 'paid') return <p>✅ Thanh toán thành công! Cảm ơn bạn.</p>

  if (status === 'pending' && order) {
    return (
      <div style={{ textAlign: 'center' }}>
        <img src={order.qrUrl} alt="QR thanh toán" style={{ maxWidth: 300 }} />
        <p>Số tiền: <b>{order.amount.toLocaleString('vi-VN')}đ</b></p>
        <p>Nội dung chuyển khoản: <b>{order.code}</b></p>
        <p>Quét mã bằng app ngân hàng, hệ thống sẽ tự xác nhận...</p>
      </div>
    )
  }

  return (
    <div>
      <button onClick={startPayment} disabled={status === 'loading'}>
        {status === 'loading' ? 'Đang tạo mã...' : 'Thanh toán bằng QR'}
      </button>
      {status === 'error' && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  )
}