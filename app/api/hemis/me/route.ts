import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/hemis-proxy"

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    const profile = JSON.parse(user.profile)
    return NextResponse.json({ success: true, data: profile })
  } catch (err: unknown) {
    const e = err as Error & { status?: number }
    return NextResponse.json({ success: false, message: e.message }, { status: e.status ?? 500 })
  }
}
