import { SignJWT, jwtVerify, type JWTPayload } from "jose"

const jwtSecret =
  process.env.JWT_SECRET && process.env.JWT_SECRET !== "secret"
    ? process.env.JWT_SECRET
    : "lms_super_secret_key_2024"

const secret = new TextEncoder().encode(jwtSecret)

export interface HemisTokenPayload extends JWTPayload {
  userId: string
  role: "student" | "employee"
  username?: string
  fullName?: string
  groupId?: string | number | null
  teacherGroupIds?: Array<string | number>
}

export async function signHemisToken(payload: Omit<HemisTokenPayload, keyof JWTPayload>) {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifyHemisToken(token: string): Promise<HemisTokenPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as HemisTokenPayload
}
