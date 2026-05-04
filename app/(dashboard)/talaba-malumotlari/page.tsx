"use client"

import { useState } from "react"
import {
  User, FileText, Award, GraduationCap, Briefcase,
  Phone, Mail, MapPin, Calendar, BookOpen, Star
} from "lucide-react"

const tabs = [
  { key: "profile", label: "Shaxsiy ma'lumotlar", icon: User },
  { key: "documents", label: "Hujjatlar", icon: FileText },
  { key: "certificates", label: "Sertifikatlar", icon: Award },
  { key: "thesis", label: "Bitiruv ishi", icon: GraduationCap },
  { key: "resume", label: "Rezyume", icon: Briefcase },
]

const documents = [
  { name: "Talaba guvohnomasi", date: "2023-09-01", status: "active" },
  { name: "O'qish jadvali", date: "2024-02-15", status: "active" },
  { name: "Bitiruv varaqasi", date: "—", status: "pending" },
  { name: "GPA baholash", date: "2024-01-20", status: "active" },
]

const certificates = [
  { name: "Python dasturlash kursi", org: "IT Academy", date: "2023-12-01", score: "95/100" },
  { name: "Ingliz tili B2", org: "IELTS", date: "2023-06-15", score: "6.5" },
  { name: "Matematik olimpiada — 2-o'rin", org: "TDU", date: "2023-11-10", score: "2-daraja" },
]

export default function TalabaMalumotlari() {
  const [activeTab, setActiveTab] = useState("profile")

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Talaba Ma&apos;lumotlari</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Shaxsiy kabinet</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-[10px] p-5 flex items-center gap-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0" style={{ backgroundColor: "#0e58a8" }}>J</div>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Jasur Toshmatov</h2>
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>MT-21 guruh · 3-kurs · Informatika va axborot texnologiyalari</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4" style={{ color: "#f59e0b" }} />
            <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>GPA: 3.85</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] whitespace-nowrap border transition-colors text-sm font-medium"
              style={{
                backgroundColor: activeTab === t.key ? "#0e58a8" : "#fff",
                color: activeTab === t.key ? "#fff" : "#7293b9",
                borderColor: activeTab === t.key ? "rgba(1,41,112,0.3)" : "rgba(1,41,112,0.1)",
                fontFamily: "var(--font-poppins)",
              }}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <h3 className="text-base font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Asosiy ma&apos;lumotlar</h3>
            {[
              { icon: User, label: "To'liq ism", value: "Toshmatov Jasur Komiljonovich" },
              { icon: Calendar, label: "Tug'ilgan sana", value: "15.03.2003" },
              { icon: Phone, label: "Telefon", value: "+998 90 123 45 67" },
              { icon: Mail, label: "Email", value: "jasur.toshmatov@student.uz" },
              { icon: MapPin, label: "Manzil", value: "Toshkent shahri, Yunusobod tumani" },
              { icon: BookOpen, label: "Yo'nalish", value: "Informatika va AT (5330100)" },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-start gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#1cc2dc" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</p>
                    <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{item.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <h3 className="text-base font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>O&apos;quv ma&apos;lumotlari</h3>
            {[
              { label: "HEMIS ID", value: "23010042" },
              { label: "Guruh", value: "MT-21" },
              { label: "Kurs", value: "3-kurs" },
              { label: "Ta'lim shakli", value: "Kunduzgi" },
              { label: "Ta'lim tili", value: "O'zbek" },
              { label: "Stipendiya", value: "Davlat stipendiyasi" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
                <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((d, i) => (
            <div key={i} className="bg-white rounded-[10px] p-4 flex items-center justify-between gap-3" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: "#f6f9ff" }}>
                  <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{d.name}</p>
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{d.date}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: d.status === "active" ? "#f0fbfd" : "#fff8e6", color: d.status === "active" ? "#1cc2dc" : "#f59e0b", border: `1px solid ${d.status === "active" ? "#1cc2dc" : "#f59e0b"}` }}>
                {d.status === "active" ? "Aktiv" : "Kutilmoqda"}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "certificates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((c, i) => (
            <div key={i} className="bg-white rounded-[10px] p-4" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center mb-3" style={{ backgroundColor: "#f0fbfd" }}>
                <Award className="w-5 h-5" style={{ color: "#1cc2dc" }} />
              </div>
              <p className="font-medium text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{c.name}</p>
              <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{c.org}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{c.date}</span>
                <span className="text-xs font-semibold" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{c.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {(activeTab === "thesis" || activeTab === "resume") && (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#f6f9ff" }}>
            {activeTab === "thesis" ? <GraduationCap className="w-6 h-6" style={{ color: "#7293b9" }} /> : <Briefcase className="w-6 h-6" style={{ color: "#7293b9" }} />}
          </div>
          <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{activeTab === "thesis" ? "Bitiruv ishi hali topshirilmagan" : "Rezyume mavjud emas"}</p>
          <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Yuklash uchun quyidagi tugmani bosing</p>
          <button className="mt-4 px-4 py-2 rounded-[5px] text-sm font-medium text-white" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>Yuklash</button>
        </div>
      )}
    </div>
  )
}
