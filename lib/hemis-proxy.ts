import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyHemisToken } from "@/lib/hemis-jwt"

export const HEMIS_STUDENT_URL =
  process.env.HEMIS_STUDENT_URL || "https://student.sies.uz/rest/v1"

export const HEMIS_EMPLOYEE_URL =
  process.env.HEMIS_EMPLOYEE_URL || "https://hemis.sies.uz/rest/v1"

export async function getUserFromRequest(req: NextRequest) {
  const auth = req.headers.get("Authorization")
  if (!auth?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 })
  }
  const payload = await verifyHemisToken(auth.slice(7))
  const user = await prisma.hemisUser.findUnique({ where: { id: payload.userId } })
  if (!user) throw Object.assign(new Error("Foydalanuvchi topilmadi"), { status: 401 })
  return user
}

// HEMIS token ni query param sifatida yuboradi (Bearer emas)
export function buildHemisUrl(
  base: string,
  path: string,
  token: string,
  params: Record<string, string> = {}
): string {
  const url = new URL(`${base}${path}`)
  url.searchParams.set("access-token", token)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return url.toString()
}

export async function proxyHemis(
  req: NextRequest,
  hemisPath: string,
  cacheKey: string,
  extraParams: Record<string, string> = {}
) {
  try {
    const user = await getUserFromRequest(req)
    const base = user.role === "student" ? HEMIS_STUDENT_URL : HEMIS_EMPLOYEE_URL
    const url = buildHemisUrl(base, hemisPath, user.token, extraParams)

    let hemRes: Response
    try {
      hemRes = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      })
    } catch {
      return serveCached(user.id, cacheKey)
    }

    if (!hemRes.ok) {
      return serveCached(user.id, cacheKey)
    }

    const hemJson = await hemRes.json() as Record<string, unknown>
    // HEMIS ro'yxat endpointlari: data.items | yakka: data | boshqa: hemJson
    const raw = hemJson.data as Record<string, unknown> | unknown[] | undefined
    const data =
      raw && !Array.isArray(raw) && (raw as Record<string, unknown>).items
        ? (raw as Record<string, unknown>).items
        : raw ?? hemJson

    await prisma.hemisCache.upsert({
      where: { userId_key: { userId: user.id, key: cacheKey } },
      update: { data: JSON.stringify(data) },
      create: { userId: user.id, key: cacheKey, data: JSON.stringify(data) },
    })

    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    const e = err as Error & { status?: number }
    if (e.status === 401) {
      return NextResponse.json({ success: false, message: e.message }, { status: 401 })
    }
    console.error("[hemis-proxy]", e)
    return NextResponse.json({ success: false, message: "Server xatosi" }, { status: 500 })
  }
}

async function serveCached(userId: string, key: string) {
  const cached = await prisma.hemisCache.findUnique({
    where: { userId_key: { userId, key } },
  })
  if (cached) {
    return NextResponse.json({ success: true, data: JSON.parse(cached.data), cached: true })
  }
  return NextResponse.json({ success: false, message: "Ma'lumot topilmadi" }, { status: 404 })
}
