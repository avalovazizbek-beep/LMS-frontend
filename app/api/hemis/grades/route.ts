import { NextRequest } from "next/server"
import { proxyHemis } from "@/lib/hemis-proxy"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const extra: Record<string, string> = { limit: "200" }
  if (searchParams.get("_semester"))       extra._semester       = searchParams.get("_semester")!
  if (searchParams.get("_education_year")) extra._education_year = searchParams.get("_education_year")!
  return proxyHemis(req, "/data/academic-record-list", `grades_${searchParams.toString()}`, extra)
}
