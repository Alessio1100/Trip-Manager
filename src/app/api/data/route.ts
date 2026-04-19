import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'redis'
import { DEFAULT_DATA } from '@/lib/defaultData'

const KEY = 'peru_viaggio_data'

async function getClient() {
  const client = createClient({ url: process.env.REDIS_URL })
  await client.connect()
  return client
}

export async function GET() {
  let client
  try {
    client = await getClient()
    const raw = await client.get(KEY)
    if (!raw) {
      await client.set(KEY, JSON.stringify(DEFAULT_DATA))
      return NextResponse.json(DEFAULT_DATA)
    }
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json(DEFAULT_DATA)
  } finally {
    await client?.disconnect()
  }
}

export async function POST(req: NextRequest) {
  let client
  try {
    const body = await req.json()
    client = await getClient()
    await client.set(KEY, JSON.stringify(body))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  } finally {
    await client?.disconnect()
  }
}
