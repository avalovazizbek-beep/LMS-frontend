import { NextRequest } from "next/server"
import { proxyHemis } from "@/lib/hemis-proxy"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const extra: Record<string, string> = {}
  if (searchParams.get("semester")) extra.semester = searchParams.get("semester")!
  return proxyHemis(req, "/data/student-absence-count", `absence_${searchParams.toString()}`, extra)
}
