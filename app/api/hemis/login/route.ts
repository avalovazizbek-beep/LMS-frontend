import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signHemisToken } from "@/lib/hemis-jwt"
import { HEMIS_STUDENT_URL, buildHemisUrl } from "@/lib/hemis-proxy"

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function textValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return undefined
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json()
    if (!login || !password) {
      return NextResponse.json({ success: false, message: "Login va parol kerak" }, { status: 400 })
    }

    // 1. HEMIS ga login so'rovi (JSON body)
    let authJson: Record<string, unknown>
    try {
      const authRes = await fetch(`${HEMIS_STUDENT_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ login, password }),
      })
      authJson = await authRes.json()
    } catch (fetchErr) {
      console.error("[hemis/login] HEMIS ga ulanib bo'lmadi:", fetchErr)
      return NextResponse.json(
        { success: false, message: `HEMIS serveriga ulanib bo'lmadi` },
        { status: 502 }
      )
    }

    // token turli joylarda bo'lishi mumkin
    const d = authJson.data as Record<string, unknown> | undefined
    const hemisToken =
      (d?.token as string) || (d?.access_token as string) ||
      (authJson.token as string) || (authJson.access_token as string)

    if (!hemisToken) {
      const errMsg =
        (authJson.error as string) || (authJson._message as string) ||
        (authJson.message as string) || "Login yoki parol noto'g'ri"
      console.error("[hemis/login] Token topilmadi:", authJson)
      return NextResponse.json({ success: false, message: errMsg }, { status: 401 })
    }

    // 2. Talaba profilini olish (access-token query param)
    let profile: Record<string, unknown> = {}
    try {
      const profileUrl = buildHemisUrl(HEMIS_STUDENT_URL, "/account/me", hemisToken)
      const profileRes = await fetch(profileUrl, { headers: { Accept: "application/json" } })
      const profileJson = await profileRes.json() as Record<string, unknown>
      profile = (profileJson.data as Record<string, unknown>) ?? profileJson
    } catch (e) {
      console.warn("[hemis/login] Profil olishda xato:", e)
    }

    const hemisId = String(
      (profile.student_id_number as string) ?? (profile.id as string) ?? login
    )
    const group = asRecord(profile.group)
    const fullName = textValue(
      profile.full_name,
      profile.fullName,
      profile.name,
      profile.short_name,
      login
    )
    const groupId = numberValue(
      profile.group_id,
      profile.groupId,
      group.id,
      group.code,
      group.name
    )

    // 3. Bazaga saqlash yoki yangilash
    const user = await prisma.hemisUser.upsert({
      where: { hemisId },
      update: { token: hemisToken, profile: JSON.stringify(profile), login },
      create: { hemisId, role: "student", login, token: hemisToken, profile: JSON.stringify(profile) },
    })

    // 4. O'zimizning JWT
    const token = await signHemisToken({
      userId: user.id,
      role: "student",
      username: fullName,
      fullName,
      groupId,
    })
    return NextResponse.json({ success: true, token })
  } catch (err) {
    console.error("[hemis/login] Server xatosi:", err)
    return NextResponse.json({ success: false, message: "Server xatosi" }, { status: 500 })
  }
}
