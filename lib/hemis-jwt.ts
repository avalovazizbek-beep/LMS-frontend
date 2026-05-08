import { SignJWT, jwtVerify, type JWTPayload } from "jose"

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "lms-hemis-secret-change-in-production"
)

export interface HemisTokenPayload extends JWTPayload {
  userId: string
  role: "student" | "employee"
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
