import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /payment/status?code=GDSxxxx  -> { status: 'pending' | 'paid' }
export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  const { data: userData } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const code = new URL(req.url).searchParams.get('code')
  const { data } = await supabase
    .from('payments')
    .select('status')
    .eq('code', code)
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ status: data?.status || 'not_found' })
}