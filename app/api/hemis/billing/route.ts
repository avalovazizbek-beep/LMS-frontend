import { NextRequest } from "next/server"
import { proxyHemis } from "@/lib/hemis-proxy"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const extra: Record<string, string> = {}
  if (searchParams.get("eduYear")) extra.eduYear = searchParams.get("eduYear")!
  return proxyHemis(req, "/billing/all", `billing_${searchParams.toString()}`, extra)
}
