"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

/* Meeting sahifasi (lobby/prejoin/call bosqichlari) va dashboard layout
   o'rtasida "hozir haqiqiy videochatdamizmi" holatini almashish uchun —
   sidebar faqat haqiqiy Call bosqichida yashiriladi, lobby/prejoin'da
   (hali ulanmasdan turib) odatdagidek ko'rinishda qoladi. */
interface MeetingCallContextValue {
  inCall: boolean
  setInCall: (value: boolean) => void
}

const MeetingCallContext = createContext<MeetingCallContextValue | null>(null)

export function MeetingCallProvider({ children }: { children: ReactNode }) {
  const [inCall, setInCall] = useState(false)
  return (
    <MeetingCallContext.Provider value={{ inCall, setInCall }}>
      {children}
    </MeetingCallContext.Provider>
  )
}

export function useMeetingCall() {
  const ctx = useContext(MeetingCallContext)
  if (!ctx) throw new Error("useMeetingCall must be used within MeetingCallProvider")
  return ctx
}
