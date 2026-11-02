import { BookOpen } from "lucide-react"

/* Kartadagi fan nomi — guruh va boshqa mayda ma'lumotlar orasida yo'qolib
   qolmasligi uchun alohida, rangli belgi ko'rinishida */
export function SubjectBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-[6px] text-[13px] font-semibold"
      style={{ backgroundColor: "#e0f2fe", color: "#075985", fontFamily: "var(--font-poppins)" }}>
      <BookOpen className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  )
}
