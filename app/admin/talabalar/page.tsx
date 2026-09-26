"use client"

import { useEffect, useState } from "react"
import { Users, RefreshCw, GraduationCap, ChevronLeft, ChevronRight, X, ScanFace, CheckCircle2, AlertCircle, Send } from "lucide-react"
import { adminApi, type StudentFaceRow } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { tr } from "@/lib/i18n/translations"

const PAGE_SIZE = 20

interface GroupRow { groupId: number; groupName: string; studentCount: number }

function RosterModal({ group, onClose }: { group: GroupRow; onClose: () => void }) {
  const { t } = useLanguage()
  const [students, setStudents] = useState<StudentFaceRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi.studentFaceRoster(group.groupId)
      .then(res => { if (!cancelled) setStudents(res.students) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : tr("adminStudents.errLoad")) })
    return () => { cancelled = true }
  }, [group.groupId])

  async function handleRequest(hemisId: number, fullName: string, alreadyRegistered: boolean) {
    const confirmMsg = alreadyRegistered
      ? t("adminStudents.confirmReset", { name: fullName })
      : t("adminStudents.confirmRequest", { name: fullName })
    if (!window.confirm(confirmMsg)) return

    setSendingId(hemisId)
    try {
      await adminApi.requestFaceReregister(hemisId)
      setStudents(prev => prev?.map(s => s.hemisId === hemisId ? { ...s, faceRegistered: false, adminRequestPending: false } : s) ?? prev)
    } catch {
      // jimgina — tugma yana bosiladigan holatga qaytadi, qayta urinish mumkin
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl rounded-[14px] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{group.groupName}</h2>
            <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t("adminStudents.faceStatus")}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f0f5ff] transition-colors">
            <X className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {error ? (
            <div className="p-6 text-sm" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{error}</div>
          ) : students === null ? (
            <div className="flex items-center justify-center py-14">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
            </div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {t("adminStudents.noStudents")}
            </div>
          ) : (
            <table className="w-full">
              <tbody>
                {students.map(s => (
                  <tr key={s.hemisId} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.fullName}</div>
                      {s.studentIdNumber && (
                        <div className="text-xs mt-0.5" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>{s.studentIdNumber}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.faceRegistered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                          style={{ backgroundColor: "#f0fff4", color: "#166534", fontFamily: "var(--font-poppins)" }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t("adminStudents.registered")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                          style={{ backgroundColor: "#fff8e6", color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                          <AlertCircle className="w-3.5 h-3.5" /> {t("adminStudents.notRegistered")}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {s.adminRequestPending ? (
                        <span className="text-xs italic" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>{t("adminStudents.requestSent")}</span>
                      ) : sendingId === s.hemisId ? (
                        <RefreshCw className="w-4 h-4 animate-spin ml-auto" style={{ color: "#0e58a8" }} />
                      ) : (
                        <button onClick={() => handleRequest(s.hemisId, s.fullName, s.faceRegistered)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-opacity hover:opacity-90"
                          style={{ backgroundColor: s.faceRegistered ? "#fef2f2" : "#eef4ff", color: s.faceRegistered ? "#b91c1c" : "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          <Send className="w-3.5 h-3.5" />
                          {s.faceRegistered ? t("adminStudents.reregister") : t("adminStudents.request")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminTalabalar() {
  const { t } = useLanguage()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [totalGroups, setTotalGroups] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [courses, setCourses] = useState<{ code: string; name: string }[]>([])
  const [degrees, setDegrees] = useState<{ code: string; name: string }[]>([])
  const [courseFilter, setCourseFilter] = useState("")
  const [degreeFilter, setDegreeFilter] = useState("")
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null)

  function load(courseArg?: string, degreeArg?: string, pageArg?: number) {
    setLoading(true)
    setError(null)
    const p = pageArg ?? page
    adminApi.hemisStudents({
      course: courseArg ?? courseFilter,
      degree: degreeArg ?? degreeFilter,
      limit: PAGE_SIZE,
      offset: p * PAGE_SIZE,
    })
      .then(res => {
        setGroups(res.groups ?? [])
        setTotalGroups(res.totalGroups ?? 0)
        setTotalStudents(res.totalStudents ?? 0)
        setCourses(res.courses ?? [])
        setDegrees(res.degrees ?? [])
      })
      .catch(e => setError(e instanceof Error ? e.message : tr("adminStudents.errLoad")))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(totalGroups / PAGE_SIZE))

  function goToPage(p: number) {
    const clamped = Math.min(Math.max(p, 0), totalPages - 1)
    setPage(clamped)
    load(courseFilter, degreeFilter, clamped)
  }

  function applyCourse(code: string) {
    setCourseFilter(code)
    setPage(0)
    load(code, degreeFilter, 0)
  }

  // Daraja o'zgarganda kurs tanlovi ham tozalanadi — kurslar ro'yxati
  // darajaga bog'liq (Bakalavr va Magistr har xil kurslarga ega), eski
  // tanlov yangi darajada mavjud bo'lmasligi mumkin.
  function applyDegree(name: string) {
    setDegreeFilter(name)
    setCourseFilter("")
    setPage(0)
    load("", name, 0)
  }

  const filtered = groups.filter(g => g.groupName.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("adminStudents.title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("adminStudents.subtitle")}
          </p>
        </div>
        <button onClick={() => load(courseFilter, degreeFilter, page)} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
        </div>
      ) : error ? (
        <div className="rounded-[12px] p-6 text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          {error}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-[12px] p-6 flex items-center gap-4 w-fit"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
            <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
              <Users className="w-6 h-6" style={{ color: "#0e58a8" }} />
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{totalStudents}</div>
              <div className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {t("adminStudents.totalStudents", { groups: totalGroups })}
              </div>
            </div>
          </div>

          {/* Daraja avval tanlanadi, kurs ro'yxati shunga qarab o'zgaradi
              (Bakalavr va Magistr'ning kurslari har xil) */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t("adminStudents.degree")}</span>
              <select value={degreeFilter} onChange={e => applyDegree(e.target.value)}
                className="text-sm px-3 py-2 rounded-[8px] outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
                <option value="">{t("common.all")}</option>
                {degrees.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t("adminStudents.course")}</span>
              <select value={courseFilter} onChange={e => applyCourse(e.target.value)}
                className="text-sm px-3 py-2 rounded-[8px] outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
                <option value="">{t("common.all")}</option>
                {courses.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </label>
          </div>

          <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
            <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
              <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {t("adminStudents.byGroups")}
              </h2>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("adminStudents.searchPage")}
                className="px-3 py-2 rounded-[8px] text-sm outline-none w-56"
                style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f6f9ff" }}>
                    {["#", t("common.group"), t("adminStudents.studentCount"), ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-14 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        <div className="flex flex-col items-center gap-2">
                          <GraduationCap className="w-8 h-8" style={{ color: "#d8e6f7" }} />
                          {t("adminStudents.noGroups")}
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map((g, i) => (
                    <tr key={g.groupId} onClick={() => setSelectedGroup(g)}
                      className="hover:bg-[#f6f9ff]/50 transition-colors cursor-pointer" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>{page * PAGE_SIZE + i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.groupName}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{g.studentCount}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          <ScanFace className="w-3.5 h-3.5" /> Face ID
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalGroups > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {t("adminStudents.pageRange", { from: page * PAGE_SIZE + 1, to: Math.min(totalGroups, page * PAGE_SIZE + PAGE_SIZE), total: totalGroups })}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 0}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-[6px] disabled:opacity-40"
                  style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {page + 1} / {totalPages}
                </span>
                <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-[6px] disabled:opacity-40"
                  style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedGroup && <RosterModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />}
    </div>
  )
}
