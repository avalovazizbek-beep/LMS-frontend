import { Loader2, AlertCircle, RefreshCw } from "lucide-react"

export function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1cc2dc" }} />
    </div>
  )
}

export function ApiError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fff0f0" }}>
        <AlertCircle className="w-7 h-7" style={{ color: "#ef4444" }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Xatolik yuz berdi</p>
        <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm"
          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}
        >
          <RefreshCw className="w-4 h-4" /> Qayta urinish
        </button>
      )}
    </div>
  )
}
