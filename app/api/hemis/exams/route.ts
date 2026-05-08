import { NextRequest } from "next/server"
import { proxyHemis } from "@/lib/hemis-proxy"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const extra: Record<string, string> = { limit: "200" }
  if (searchParams.get("_semester")) extra._semester = searchParams.get("_semester")!
  if (searchParams.get("_group"))    extra._group    = searchParams.get("_group")!
  return proxyHemis(req, "/data/exam-list", `exams_${searchParams.toString()}`, extra)
}
