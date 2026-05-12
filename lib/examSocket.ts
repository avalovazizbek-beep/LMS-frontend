import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export function getExamSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(BACKEND, { withCredentials: true, transports: ["websocket", "polling"] })
  }
  return socket
}

export function disconnectExamSocket() {
  socket?.disconnect()
  socket = null
}
