import { NextRequest } from "next/server"
import { proxyHemis } from "@/lib/hemis-proxy"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const extra: Record<string, string> = { limit: "200" }
  if (searchParams.get("_semester")) extra._semester = searchParams.get("_semester")!
  return proxyHemis(req, "/data/attendance-list", `attendance_${searchParams.toString()}`, extra)
}
