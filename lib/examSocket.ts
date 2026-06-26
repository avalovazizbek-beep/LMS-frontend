import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

function getSocketOptions(): { url: string; path: string } {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "")
  try {
    const u = new URL(raw)
    if (u.pathname && u.pathname !== "/") {
      return { url: u.origin, path: u.pathname.replace(/\/+$/, "") + "/socket.io" }
    }
  } catch {}
  return { url: raw, path: "/socket.io" }
}

export function getExamSocket(): Socket {
  if (!socket || !socket.connected) {
    const { url, path } = getSocketOptions()
    socket = io(url, { path, withCredentials: true, transports: ["websocket", "polling"] })
  }
  return socket
}

export function disconnectExamSocket() {
  socket?.disconnect()
  socket = null
}
