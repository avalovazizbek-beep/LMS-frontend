"use client"

import { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: number
}

export function Modal({ open, title, onClose, children, maxWidth = 480 }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-black/30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} />
          <motion.div className="relative bg-white rounded-[10px] w-full shadow-xl overflow-hidden"
            style={{ maxWidth, border: "1px solid rgba(1,41,112,0.1)" }}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
              <h3 className="font-semibold text-lg" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {title}
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff] transition-colors">
                <X className="w-5 h-5" style={{ color: "#7293b9" }} />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Umumiy form input style
export function FInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{label}</label>
      <input {...props} className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none transition-colors"
        style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)", ...((props.style) || {}) }} />
    </div>
  )
}

// Umumiy form select style
export function FSelect({ label, children, ...props }: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{label}</label>
      <select {...props} className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none"
        style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}>
        {children}
      </select>
    </div>
  )
}

// Modal footer tugmalari
export function ModalFooter({ onClose, saving }: { onClose: () => void; saving: boolean }) {
  return (
    <div className="flex gap-3 justify-end mt-5 pt-4" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
      <button type="button" onClick={onClose} className="h-[38px] px-4 rounded-[5px] text-sm transition-colors hover:bg-[#f6f9ff]"
        style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        Bekor
      </button>
      <button type="submit" disabled={saving} className="h-[38px] px-5 rounded-[5px] text-sm text-white disabled:opacity-60 transition-opacity"
        style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
        {saving ? "Saqlanmoqda..." : "Saqlash"}
      </button>
    </div>
  )
}
