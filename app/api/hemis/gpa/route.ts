import { NextRequest } from "next/server"
import { proxyHemis } from "@/lib/hemis-proxy"

export async function GET(req: NextRequest) {
  return proxyHemis(req, "/data/student-gpa-list", "gpa", { limit: "10" })
}
