"use client"

import { Bell, Menu, ChevronDown } from "lucide-react"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-5 py-[22px] bg-white w-full"
      style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}
    >
      {/* Left: Menu button */}
      <div className="inline-flex items-center gap-6">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="relative w-[30px] h-[30px] flex flex-col justify-center gap-[5px] hover:opacity-70 transition-opacity"
        >
          <Menu className="w-6 h-6 text-[#012970]" />
        </button>
      </div>

      {/* Right: Notifications + Avatar + Name */}
      <div className="inline-flex items-center gap-[15px]">
        {/* Notification bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative w-6 h-6 hover:opacity-70 transition-opacity"
        >
          <div className="relative">
            <Bell className="w-6 h-6 text-[#012970]" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#1cc2dc] rounded-full flex items-center justify-center">
              <span
                className="text-white text-[9px] font-medium"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                3
              </span>
            </span>
          </div>
        </button>

        {/* Avatar */}
        <div className="flex w-8 h-8 items-center justify-center rounded-full bg-[#0e58a8] text-white font-semibold text-sm shrink-0">
          A
        </div>

        {/* User name + dropdown */}
        <button
          type="button"
          aria-label="Open profile menu"
          className="flex items-center gap-1 hover:opacity-70 transition-opacity"
        >
          <span
            className="text-[#012970] text-sm font-normal"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Asilbek F.
          </span>
          <ChevronDown className="w-4 h-4 text-[#012970]" />
        </button>
      </div>
    </header>
  )
}
