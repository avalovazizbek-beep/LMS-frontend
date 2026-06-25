import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    path?: string[]
  }>
}

const DEFAULT_MEETING_API_URL = "http://localhost:5000"

function getMeetingApiUrl() {
  const configured =
    process.env.MEETING_API_URL || process.env.NEXT_PUBLIC_MEETING_API_URL

  const normalized = configured?.replace(/\/+$/, "")

  if (
    normalized &&
    (normalized.startsWith("http://") || normalized.startsWith("https://"))
  ) {
    return normalized
  }

  return DEFAULT_MEETING_API_URL
}

function buildTargetUrl(req: NextRequest, path: string[]) {
  const target = new URL(
    `${getMeetingApiUrl()}/${path.map(encodeURIComponent).join("/")}`
  )
  target.search = new URL(req.url).search
  return target
}

function buildForwardHeaders(req: NextRequest) {
  const headers = new Headers()
  const authorization = req.headers.get("authorization")
  const contentType = req.headers.get("content-type")
  const accept = req.headers.get("accept")
  const xFileName = req.headers.get("x-file-name")

  if (authorization) headers.set("authorization", authorization)
  if (contentType) headers.set("content-type", contentType)
  if (accept) headers.set("accept", accept)
  if (xFileName) headers.set("x-file-name", xFileName)

  return headers
}

async function proxyMeeting(req: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params
  const target = buildTargetUrl(req, path)
  const hasBody = req.method !== "GET" && req.method !== "HEAD"

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: buildForwardHeaders(req),
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: "no-store",
    })
    const body = await upstream.arrayBuffer()
    const headers = new Headers()
    const contentType = upstream.headers.get("content-type")
    const contentDisposition = upstream.headers.get("content-disposition")

    if (contentType) headers.set("content-type", contentType)
    if (contentDisposition) headers.set("content-disposition", contentDisposition)

    return new NextResponse(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Meeting backendga ulanib bo'lmadi",
        details: { baseUrl: getMeetingApiUrl() },
      },
      { status: 502 }
    )
  }
}

export const GET = proxyMeeting
export const POST = proxyMeeting
export const PUT = proxyMeeting
export const PATCH = proxyMeeting
export const DELETE = proxyMeeting
