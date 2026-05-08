"use client"

import { useState } from "react"
import { Send } from "lucide-react"

export default function XabarYaratish() {
  const [to, setTo]         = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody]     = useState("")
  const [sent, setSent]     = useState(false)

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-6 p-[30px]">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Xabar Yaratish
          </h1>
        </div>
        <div className="bg-white rounded-[10px] p-14 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#f0fff4" }}>
            <Send className="w-8 h-8" style={{ color: "#22c55e" }} />
          </div>
          <p className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Xabar muvaffaqiyatli yuborildi!
          </p>
          <button onClick={() => { setSent(false); setTo(""); setSubject(""); setBody("") }}
            className="mt-4 px-5 py-2 rounded-[5px] text-sm font-medium text-white"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            Yangi xabar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Xabar Yaratish
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Yangi xabar yuborish
        </p>
      </div>

      <form onSubmit={handleSend} className="bg-white rounded-[10px] p-6 flex flex-col gap-4"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        {[
          { label: "Kimga",   value: to,      setter: setTo,      type: "text", placeholder: "Qabul qiluvchi" },
          { label: "Mavzu",   value: subject, setter: setSubject, type: "text", placeholder: "Xabar mavzusi" },
        ].map(field => (
          <div key={field.label}>
            <label className="block text-sm font-medium mb-1.5"
              style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {field.label}
            </label>
            <input
              type={field.type}
              value={field.value}
              onChange={e => field.setter(e.target.value)}
              placeholder={field.placeholder}
              required
              className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none"
              style={{
                border: "1px solid rgba(1,41,112,0.2)",
                color: "#012970",
                fontFamily: "var(--font-poppins)",
              }}
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium mb-1.5"
            style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Matn
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Xabar matni..."
            rows={6}
            required
            className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none resize-none"
            style={{
              border: "1px solid rgba(1,41,112,0.2)",
              color: "#012970",
              fontFamily: "var(--font-poppins)",
            }}
          />
        </div>
        <div className="flex justify-end">
          <button type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-[5px] text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <Send className="w-4 h-4" />
            Yuborish
          </button>
        </div>
      </form>
    </div>
  )
}
