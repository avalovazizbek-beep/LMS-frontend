"use client"

interface Props {
  currentCode: number      // student's current semester (e.g., 2) — disables tabs above this
  value: number            // currently selected tab
  onChange: (code: number) => void
  total?: number           // default 8
}

export default function SemesterTabs({ currentCode, value, onChange, total = 8 }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold mr-1 tracking-widest"
        style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        SEMESTR
      </span>
      {Array.from({ length: total }, (_, i) => i + 1).map(n => {
        const isActive   = n === value
        // Only disable if we've actually loaded currentCode (> 0) and n exceeds it
        const isDisabled = currentCode > 0 && n > currentCode
        return (
          <button
            key={n}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(n)}
            className="w-8 h-8 rounded-[5px] text-sm font-semibold transition-all"
            style={{
              backgroundColor: isActive   ? "#22c55e"               : "transparent",
              color:           isActive   ? "#fff"
                             : isDisabled ? "rgba(1,41,112,0.18)"   : "#012970",
              border: isActive   ? "1px solid #22c55e"
                    : isDisabled ? "1px solid rgba(1,41,112,0.06)"
                    :              "1px solid rgba(1,41,112,0.22)",
              cursor:          isDisabled ? "not-allowed" : "pointer",
              opacity:         isDisabled ? 0.45 : 1,
              fontFamily: "var(--font-poppins)",
            }}>
            {n}
          </button>
        )
      })}
    </div>
  )
}
