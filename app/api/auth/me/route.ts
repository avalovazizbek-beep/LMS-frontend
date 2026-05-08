import { NextRequest, NextResponse } from "next/server"
import { verifyHemisToken } from "@/lib/hemis-jwt"

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null

  if (!token) {
    return NextResponse.json({ success: false, message: "Token topilmadi" }, { status: 401 })
  }

  // Try as HEMIS token first (signed with Next.js JWT_SECRET)
  try {
    const payload = await verifyHemisToken(token)

    // Valid HEMIS token — fetch user profile from DB
    try {
      const { prisma } = await import("@/lib/prisma")
      const hemUser = await prisma.hemisUser.findUnique({ where: { id: payload.userId } })
      if (hemUser) {
        let profile: Record<string, unknown> = {}
        try { profile = JSON.parse(hemUser.profile) } catch { /* empty */ }
        return NextResponse.json({
          success: true,
          user: {
            id: hemUser.id,
            fullName: (profile.full_name as string) || (profile.name as string) || hemUser.login,
            username: hemUser.login,
            phone: (profile.phone as string) || "",
            role: hemUser.role,
            status: "active",
            createdAt: hemUser.createdAt,
          },
        })
      }
    } catch { /* prisma unavailable — fall back to payload */ }

    // Fallback: minimal user from token payload
    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        fullName: payload.userId,
        username: payload.userId,
        phone: "",
        role: payload.role,
        status: "active",
        createdAt: new Date().toISOString(),
      },
    })
  } catch {
    // Not a HEMIS token — proxy to Express backend (admin token)
  }

  const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  try {
    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, message: "Server bilan bog'lanib bo'lmadi" }, { status: 503 })
  }
}
