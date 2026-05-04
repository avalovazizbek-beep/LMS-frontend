"use client"

import { useMemo, useState } from "react"
import {
  Search,
  SlidersHorizontal,
  Plus,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"

type Moderator = {
  id: number
  fullName: string
  username: string
  phone: string
  permission: string
}

const moderators: Moderator[] = [
  {
    id: 1,
    fullName: "Samiddin Ravshanov",
    username: "@moderator1",
    phone: "+998 (93) 038 11 10",
    permission: "Moderator",
  },
  {
    id: 2,
    fullName: "Shahob Berdiqulov",
    username: "@moderator2",
    phone: "+998 (99) 456 17 70",
    permission: "Moderator",
  },
  {
    id: 3,
    fullName: "Jasur Toshmatov",
    username: "@moderator3",
    phone: "+998 (90) 123 45 67",
    permission: "Moderator",
  },
  {
    id: 4,
    fullName: "Nodira Karimova",
    username: "@moderator4",
    phone: "+998 (91) 234 56 78",
    permission: "Moderator",
  },
]

type TabKey = "table" | "card"

const topTabs: { key: TabKey; label: string }[] = [
  { key: "table", label: "Jadval" },
  { key: "card", label: "Card" },
]

type SortKey = "fullName" | "username" | "phone" | null
type SortDir = "asc" | "desc"

function SortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: string
  sortKey: SortKey
  sortDir: SortDir
}) {
  if (sortKey !== column) {
    return (
      <span className="flex flex-col opacity-30">
        <ChevronUp className="w-3 h-3 -mb-0.5" />
        <ChevronDown className="w-3 h-3" />
      </span>
    )
  }
  return sortDir === "asc" ? (
    <ChevronUp className="w-4 h-4" style={{ color: "#1cc2dc" }} />
  ) : (
    <ChevronDown className="w-4 h-4" style={{ color: "#1cc2dc" }} />
  )
}

export default function ModeratorsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("table")
  const [pageSearch, setPageSearch] = useState("")
  const [tableSearch, setTableSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [openActionId, setOpenActionId] = useState<number | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filteredModerators = useMemo(() => {
    const query = tableSearch.trim().toLowerCase()
    let list = query
      ? moderators.filter((m) =>
          [m.fullName, m.username, m.phone, m.permission]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      : [...moderators]

    if (sortKey) {
      list = list.sort((a, b) => {
        const av = a[sortKey].toLowerCase()
        const bv = b[sortKey].toLowerCase()
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return list
  }, [tableSearch, sortKey, sortDir])

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      {/* Page sub-header */}
      <header
        className="flex flex-col items-start gap-[15px] pt-[25px] pb-5 px-5 bg-white"
        style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}
      >
        <div className="flex items-center gap-6 self-stretch w-full">
          <h1
            className="font-medium text-[28px] tracking-[0] leading-normal"
            style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
          >
            Moderatorlar
          </h1>
        </div>

        <div className="flex items-start justify-between self-stretch w-full">
          {/* Tabs */}
          <div className="inline-flex items-center gap-[15px]" role="tablist">
            {topTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-5 h-[45px] inline-flex items-center justify-center rounded-[10px] overflow-hidden border transition-colors"
                style={{
                  backgroundColor: activeTab === tab.key ? "#0e58a8" : "#fff",
                  borderColor:
                    activeTab === tab.key
                      ? "rgba(1,41,112,0.3)"
                      : "rgba(1,41,112,0.1)",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                <span
                  className="font-semibold text-base"
                  style={{
                    color: activeTab === tab.key ? "#fff" : "#7293b9",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Filter */}
          <div className="inline-flex items-center gap-2.5">
            <label
              className="w-[500px] gap-3.5 px-2.5 py-2 rounded-[5px] overflow-hidden border flex items-center bg-white"
              style={{ borderColor: "rgba(1,41,112,0.3)" }}
            >
              <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
              <span className="sr-only">Search by student name or number</span>
              <input
                type="search"
                value={pageSearch}
                onChange={(e) => setPageSearch(e.target.value)}
                placeholder="Search by student name or number"
                className="flex-1 bg-transparent outline-none text-sm font-medium"
                style={{
                  color: "#012970",
                  fontFamily: "var(--font-poppins)",
                }}
              />
            </label>

            <button
              type="button"
              aria-label="Open filters"
              className="inline-flex h-[42px] items-center gap-2.5 px-[15px] py-2.5 bg-white rounded-[5px] overflow-hidden border"
              style={{ borderColor: "rgba(1,41,112,0.3)" }}
            >
              <SlidersHorizontal
                className="w-6 h-6"
                style={{ color: "#012970" }}
              />
              <span
                className="text-base"
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
              >
                Filter
              </span>
              <span
                className="flex w-[18px] h-[18px] items-center justify-center rounded-full text-[10px] font-medium text-white"
                style={{ backgroundColor: "#7293b9" }}
              >
                2
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-col items-start gap-[30px] pl-[30px] pr-0 pt-[30px] pb-0 flex self-stretch w-full">
        <div
          className="flex flex-col w-full max-w-[1086px] items-start bg-white rounded-[5px]"
          style={{
            border: "1px solid rgba(1,41,112,0.1)",
            boxShadow: "0px 0px 5px rgba(1,41,112,0.1)",
          }}
        >
          {/* Table toolbar */}
          <div className="flex items-center justify-between p-5 self-stretch w-full">
            <div className="inline-flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <h2
                  className="font-medium text-[22px] leading-[26.9px] tracking-[0] whitespace-nowrap"
                  style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                >
                  Barcha moderatorlar
                </h2>
                <div
                  className="flex w-[33px] h-[33px] items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(114,147,185,0.2)" }}
                >
                  <span
                    className="font-semibold text-lg text-center leading-none"
                    style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
                  >
                    {moderators.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2.5">
              {/* Table search */}
              <label
                className="w-[500px] gap-3.5 px-2.5 py-2 rounded-[5px] overflow-hidden border flex items-center"
                style={{ borderColor: "rgba(1,41,112,0.3)" }}
              >
                <Search
                  className="w-5 h-5 shrink-0"
                  style={{ color: "#7293b9" }}
                />
                <span className="sr-only">Search moderators</span>
                <input
                  type="search"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search"
                  className="flex-1 bg-transparent outline-none text-sm font-medium"
                  style={{
                    color: "#012970",
                    fontFamily: "var(--font-poppins)",
                  }}
                />
              </label>

              {/* Add button */}
              <button
                type="button"
                className="inline-flex h-[42px] items-center gap-2.5 px-[15px] py-2.5 rounded-[5px] overflow-hidden"
                style={{ backgroundColor: "#0e58a8" }}
              >
                <Plus className="w-6 h-6 text-white" />
                <span
                  className="text-base text-white"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Moderator qo&apos;shish
                </span>
              </button>
            </div>
          </div>

          {/* Table */}
          {activeTab === "table" && (
            <div className="self-stretch w-full overflow-x-auto px-2.5 pb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: "#fff" }}>
                    {/* # */}
                    <th
                      className="w-[41px] px-4 py-[18px] text-left"
                      style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}
                    >
                      <span
                        className="text-sm font-medium whitespace-nowrap"
                        style={{
                          color: "#7293b9",
                          fontFamily: "var(--font-poppins)",
                        }}
                      >
                        #
                      </span>
                    </th>

                    {/* FIO */}
                    <th
                      className="w-[198px] px-4 py-[18px] text-left"
                      style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-1"
                        onClick={() => handleSort("fullName")}
                      >
                        <span
                          className="text-sm font-medium whitespace-nowrap"
                          style={{
                            color: "#7293b9",
                            fontFamily: "var(--font-poppins)",
                          }}
                        >
                          FIO
                        </span>
                        <SortIcon
                          column="fullName"
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </button>
                    </th>

                    {/* Username */}
                    <th
                      className="w-[210px] px-4 py-[18px] text-left"
                      style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-1"
                        onClick={() => handleSort("username")}
                      >
                        <span
                          className="text-sm font-medium whitespace-nowrap"
                          style={{
                            color: "#7293b9",
                            fontFamily: "var(--font-poppins)",
                          }}
                        >
                          Username
                        </span>
                        <SortIcon
                          column="username"
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </button>
                    </th>

                    {/* Phone */}
                    <th
                      className="w-[216px] px-4 py-[18px] text-left"
                      style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-1"
                        onClick={() => handleSort("phone")}
                      >
                        <span
                          className="text-sm font-medium whitespace-nowrap"
                          style={{
                            color: "#7293b9",
                            fontFamily: "var(--font-poppins)",
                          }}
                        >
                          Telefon
                        </span>
                        <SortIcon
                          column="phone"
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </button>
                    </th>

                    {/* Permission */}
                    <th
                      className="w-[321px] px-4 py-[18px] text-left"
                      style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}
                    >
                      <span
                        className="text-sm font-medium whitespace-nowrap"
                        style={{
                          color: "#7293b9",
                          fontFamily: "var(--font-poppins)",
                        }}
                      >
                        Account Permission
                      </span>
                    </th>

                    {/* Action */}
                    <th
                      className="w-[90px] px-4 py-[18px] text-left"
                      style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}
                    >
                      <span
                        className="text-sm font-medium whitespace-nowrap"
                        style={{
                          color: "#7293b9",
                          fontFamily: "var(--font-poppins)",
                        }}
                      >
                        Action
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModerators.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-10 text-sm"
                        style={{
                          color: "#7293b9",
                          fontFamily: "var(--font-poppins)",
                        }}
                      >
                        Hech narsa topilmadi
                      </td>
                    </tr>
                  ) : (
                    filteredModerators.map((moderator) => (
                      <tr
                        key={moderator.id}
                        className="hover:bg-[#f6f9ff]/60 transition-colors"
                        style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}
                      >
                        {/* ID */}
                        <td className="px-4 py-0 h-14">
                          <span
                            className="text-sm font-medium whitespace-nowrap"
                            style={{
                              color: "#012970",
                              fontFamily: "var(--font-poppins)",
                            }}
                          >
                            {moderator.id}
                          </span>
                        </td>

                        {/* Full Name */}
                        <td className="px-4 py-0 h-14">
                          <span
                            className="text-sm font-medium whitespace-nowrap"
                            style={{
                              color: "#012970",
                              fontFamily: "var(--font-poppins)",
                            }}
                          >
                            {moderator.fullName}
                          </span>
                        </td>

                        {/* Username */}
                        <td className="px-4 py-0 h-14">
                          <div
                            className="inline-flex items-center justify-center gap-2.5 p-[5px] rounded-[5px]"
                          >
                            <span
                              className="text-sm whitespace-nowrap"
                              style={{
                                color: "#1cc2dc",
                                fontFamily: "var(--font-poppins)",
                              }}
                            >
                              {moderator.username}
                            </span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-0 h-14">
                          <span
                            className="text-sm font-medium whitespace-nowrap"
                            style={{
                              color: "#012970",
                              fontFamily: "var(--font-poppins)",
                            }}
                          >
                            {moderator.phone}
                          </span>
                        </td>

                        {/* Permission badge */}
                        <td className="px-4 py-0 h-14">
                          <div
                            className="inline-flex h-[30px] items-center justify-center gap-2.5 px-5 rounded-[10px] overflow-hidden border"
                            style={{
                              backgroundColor: "#f6f9ff",
                              borderColor: "#1cc2dc",
                            }}
                          >
                            <span
                              className="font-semibold text-sm whitespace-nowrap"
                              style={{
                                color: "#1cc2dc",
                                fontFamily: "var(--font-poppins)",
                              }}
                            >
                              {moderator.permission}
                            </span>
                          </div>
                        </td>

                        {/* Action menu */}
                        <td className="px-4 py-0 h-14 relative">
                          <button
                            type="button"
                            aria-label="Actions"
                            onClick={() =>
                              setOpenActionId(
                                openActionId === moderator.id
                                  ? null
                                  : moderator.id
                              )
                            }
                            className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff] transition-colors"
                          >
                            <MoreHorizontal
                              className="w-5 h-5"
                              style={{ color: "#012970" }}
                            />
                          </button>
                          {openActionId === moderator.id && (
                            <div
                              className="absolute right-4 top-[calc(100%-4px)] z-10 bg-white rounded-[5px] overflow-hidden"
                              style={{
                                boxShadow: "0 4px 20px rgba(1,41,112,0.15)",
                                border: "1px solid rgba(1,41,112,0.1)",
                                minWidth: 140,
                              }}
                            >
                              <button
                                type="button"
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#f6f9ff] transition-colors"
                                style={{
                                  color: "#012970",
                                  fontFamily: "var(--font-poppins)",
                                }}
                                onClick={() => setOpenActionId(null)}
                              >
                                <Pencil className="w-4 h-4" />
                                Tahrirlash
                              </button>
                              <button
                                type="button"
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50 transition-colors"
                                style={{
                                  color: "#ef4444",
                                  fontFamily: "var(--font-poppins)",
                                }}
                                onClick={() => setOpenActionId(null)}
                              >
                                <Trash2 className="w-4 h-4" />
                                O&apos;chirish
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Card view */}
          {activeTab === "card" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-5 self-stretch w-full">
              {filteredModerators.map((moderator) => (
                <div
                  key={moderator.id}
                  className="flex flex-col gap-3 p-4 bg-white rounded-[10px]"
                  style={{ border: "1px solid rgba(1,41,112,0.1)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white text-sm"
                      style={{ backgroundColor: "#0e58a8" }}
                    >
                      {moderator.fullName.charAt(0)}
                    </div>
                    <div>
                      <p
                        className="font-medium text-sm"
                        style={{
                          color: "#012970",
                          fontFamily: "var(--font-poppins)",
                        }}
                      >
                        {moderator.fullName}
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          color: "#1cc2dc",
                          fontFamily: "var(--font-poppins)",
                        }}
                      >
                        {moderator.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p
                      className="text-xs"
                      style={{
                        color: "#7293b9",
                        fontFamily: "var(--font-poppins)",
                      }}
                    >
                      {moderator.phone}
                    </p>
                    <div
                      className="inline-flex h-[26px] items-center justify-center gap-2.5 px-3 rounded-[10px] w-fit border"
                      style={{
                        backgroundColor: "#f6f9ff",
                        borderColor: "#1cc2dc",
                      }}
                    >
                      <span
                        className="font-semibold text-xs"
                        style={{
                          color: "#1cc2dc",
                          fontFamily: "var(--font-poppins)",
                        }}
                      >
                        {moderator.permission}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
