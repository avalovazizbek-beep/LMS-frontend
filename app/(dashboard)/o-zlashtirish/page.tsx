"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, GraduationCap, BarChart3 } from "lucide-react"
import { hemisApi, teachingApi, type HemisPerformance, type TeacherContent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { JournalRowTable } from "@/components/teaching/JournalRowTable"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

/* ─── HEMIS semestr accordion ─────────────────────────────────────────── */
interface SubjectRow { name: string; jn: number; on: number; yn: number; total: number }

function groupBySubject(items: HemisPerformance[]): SubjectRow[] {
  const map = new Map<string, SubjectRow>()
  items.forEach(item => {
    const name = item.subject?.name ?? "—"
    if (!map.has(name)) map.set(name, { name, jn: 0, on: 0, yn: 0, total: 0 })
    const row = map.get(name)!
    const examName = (item.examType?.name ?? "").toLowerCase()
    const score = Number(item.score) || 0
    if (examName.includes("yakuniy")) row.yn += score
    else if (examName.includes("oraliq")) row.on += score
    else row.jn += score
    row.total += score
  })
  return Array.from(map.values())
}

function SemesterAccordion({ code, semId, open, onToggle }: { code: number; semId?: string; open: boolean; onToggle: () => void }) {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(
    () => semId ? hemisApi.performance({ _semester: semId }) : Promise.resolve({ success: true, data: [] as HemisPerformance[] }),
    [semId]
  )
  const rows = groupBySubject(data?.data ?? [])
  return (
    <div className="bg-white rounded-[10px] overflow-hidden"
      style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[#f6f9ff]/60"
        style={{ borderTop: "3px solid #22c55e" }}>
        <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {code}-semestr
        </span>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: "#7293b9" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#7293b9" }} />}
      </button>
      {open && (
        <div style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
          {loading ? (
            <div className="px-5 py-6"><Loading /></div>
          ) : error ? (
            <div className="px-5 py-6"><ApiError message={error} onRetry={refetch} /></div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {t("ozlashtirish.notFound")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                    {[t("ozlashtirish.col.subjects"), "JN", "ON", "YN", t("ozlashtirish.col.overall")].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                        style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.name} className="hover:bg-[#f6f9ff]/50 transition-colors"
                      style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(1,41,112,0.06)" : undefined }}>
                      <td className="px-4 py-3 text-sm font-medium max-w-[260px]" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{r.name}</td>
                      <td className="px-4 py-3 text-sm" style={T}>{r.jn.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm" style={T}>{r.on.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm" style={T}>{r.yn.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{r.total.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Jurnaldagi baholar: o'qituvchi jurnalidagi qator bilan bir xil jadval
   (ma'ruza / amaliy mavzular / amaliyot / joriy / yakuniy / ball / baho) ── */
function MyJournal({ subjectName }: { subjectName: string }) {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => teachingApi.myJournal(subjectName), [subjectName])
  if (loading) return (
    <div className="flex items-center justify-center py-10 gap-2" style={L}>
      <div className="w-5 h-5 border-2 border-[#0e58a8] border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{t("ozlashtirish.loading")}</span>
    </div>
  )
  if (error) return <ApiError message={error} onRetry={refetch} />
  const journal = data?.data
  const me = journal?.students[0]
  if (!journal || !me) return null
  return <JournalRowTable data={journal} student={me} />
}

/* ─── Bosh sahifa ─────────────────────────────────────────────────────── */
export default function Ozlashtirish() {
  const { t } = useLanguage()
  const { data: meRes, loading: lMe, error: eMe, refetch: rMe } = useApi(() => hemisApi.me(), [])
  const { data: contentRes } = useApi(() => teachingApi.content({}), [])
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [activeCode, setActiveCode] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState("")
  const [activeTab, setActiveTab] = useState<"topics" | "hemis">("topics")

  if (lMe) return <Loading />
  if (eMe) return <ApiError message={eMe} onRetry={rMe} />

  const groupName = meRes?.data?.group?.name ?? "—"
  const total = currentCode > 0 ? currentCode : 1
  const codes = Array.from({ length: total }, (_, i) => total - i)

  const items: TeacherContent[] = contentRes?.data ?? []
  const subjectSet = new Set<string>()
  items.forEach(item => { if (item.subjectName) subjectSet.add(item.subjectName) })
  const subjects = Array.from(subjectSet).sort()

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={T}>{t("ozlashtirish.title")}</h1>
        <p className="text-sm mt-1" style={L}>{t("ozlashtirish.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([["topics", t("ozlashtirish.tab.topics")], ["hemis", t("ozlashtirish.tab.hemis")]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="px-4 py-2 rounded-[8px] text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === key ? "#0e58a8" : "white",
              color: activeTab === key ? "white" : "#7293b9",
              border: activeTab === key ? "1px solid #0e58a8" : "1px solid rgba(1,41,112,0.15)",
              fontFamily: "var(--font-poppins)",
            }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "topics" ? (
        <div className="flex flex-col gap-4">
          {/* Subject selector */}
          <div className="bg-white rounded-[10px] p-4"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4" style={{ color: "#0e58a8" }} />
              <span className="text-sm font-semibold" style={T}>{t("ozlashtirish.tab.topics")}</span>
            </div>
            <div className="flex flex-col gap-1 max-w-xs">
              <label className="text-xs font-medium" style={L}>{t("ozlashtirish.selectSubjectLabel")}</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                className="px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none bg-white"
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                <option value="">{t("ozlashtirish.selectSubjectOption")}</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {selectedSubject ? (
            <MyJournal subjectName={selectedSubject} />
          ) : (
            <div className="rounded-[10px] bg-white p-14 text-center"
              style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
              <p className="text-sm font-medium" style={T}>{t("ozlashtirish.selectSubjectPrompt")}</p>
              <p className="text-xs mt-1" style={L}>{t("ozlashtirish.selectSubjectHint")}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Guruh + semestr tablari */}
          <div className="bg-white rounded-[10px] px-5 py-3 flex items-center justify-between gap-4 flex-wrap"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#22c55e" }}>
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-semibold" style={T}>{groupName}</span>
            </div>
            <SemesterTabs currentCode={currentCode} value={activeCode ?? currentCode} onChange={code => setActiveCode(code)} />
          </div>

          {/* Semestrlar accordion */}
          <div className="flex flex-col gap-3">
            {codes.map(code => (
              <SemesterAccordion key={code} code={code} semId={getSemesterId(code)}
                open={(activeCode ?? currentCode) === code}
                onToggle={() => setActiveCode(prev => (prev ?? currentCode) === code ? -1 : code)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
