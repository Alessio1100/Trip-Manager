import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { DEFAULT_DATA } from '@/lib/defaultData'

const KEY = 'peru_viaggio_data'

export async function GET() {
  try {
    const data = await kv.get(KEY)
    if (!data) {
      await kv.set(KEY, DEFAULT_DATA)
      return NextResponse.json(DEFAULT_DATA)
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(DEFAULT_DATA)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await kv.set(KEY, body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
