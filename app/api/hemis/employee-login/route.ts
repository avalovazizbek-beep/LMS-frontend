import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signHemisToken } from "@/lib/hemis-jwt"
import { HEMIS_EMPLOYEE_URL, buildHemisUrl } from "@/lib/hemis-proxy"

function textValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return undefined
}

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json()
    if (!login || !password) {
      return NextResponse.json({ success: false, message: "Login va parol kerak" }, { status: 400 })
    }

    let authJson: Record<string, unknown>
    try {
      const authRes = await fetch(`${HEMIS_EMPLOYEE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ login, password }),
      })
      authJson = await authRes.json()
    } catch (fetchErr) {
      console.error("[hemis/employee-login] HEMIS ga ulanib bo'lmadi:", fetchErr)
      return NextResponse.json({ success: false, message: "HEMIS serveriga ulanib bo'lmadi" }, { status: 502 })
    }

    const d = authJson.data as Record<string, unknown> | undefined
    const hemisToken =
      (d?.token as string) || (d?.access_token as string) ||
      (authJson.token as string) || (authJson.access_token as string)

    if (!hemisToken) {
      const errMsg =
        (authJson.error as string) || (authJson._message as string) ||
        (authJson.message as string) || "Login yoki parol noto'g'ri"
      console.error("[hemis/employee-login] Token topilmadi:", authJson)
      return NextResponse.json({ success: false, message: errMsg }, { status: 401 })
    }

    let profile: Record<string, unknown> = {}
    try {
      const profileUrl = buildHemisUrl(HEMIS_EMPLOYEE_URL, "/account/me", hemisToken)
      const profileRes = await fetch(profileUrl, { headers: { Accept: "application/json" } })
      const profileJson = await profileRes.json() as Record<string, unknown>
      profile = (profileJson.data as Record<string, unknown>) ?? profileJson
    } catch (e) {
      console.warn("[hemis/employee-login] Profil olishda xato:", e)
    }

    const hemisId = `emp_${String(
      (profile.employee_id_number as string) ?? (profile.id as string) ?? login
    )}`
    const fullName = textValue(
      profile.full_name,
      profile.fullName,
      profile.name,
      profile.short_name,
      login
    )

    const user = await prisma.hemisUser.upsert({
      where: { hemisId },
      update: { token: hemisToken, profile: JSON.stringify(profile), login },
      create: { hemisId, role: "employee", login, token: hemisToken, profile: JSON.stringify(profile) },
    })

    const token = await signHemisToken({
      userId: user.id,
      role: "employee",
      username: fullName,
      fullName,
    })
    return NextResponse.json({ success: true, token })
  } catch (err) {
    console.error("[hemis/employee-login] Server xatosi:", err)
    return NextResponse.json({ success: false, message: "Server xatosi" }, { status: 500 })
  }
}
