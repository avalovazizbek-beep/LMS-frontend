"use client"

import { useEffect, useRef } from "react"
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Undo2, Redo2,
} from "lucide-react"

const btnCls = "p-1.5 rounded-[5px] transition-colors hover:bg-[#eef4ff]"

function ToolbarButton({ icon, onClick, title }: { icon: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button type="button" title={title} onClick={onClick} className={btnCls} style={{ color: "#445b7a" }}>
      {icon}
    </button>
  )
}

/** Yengil, tashqi kutubxonasiz rich-text muharrir — contentEditable + execCommand asosida. */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastValue = useRef(value)

  useEffect(() => {
    if (ref.current && value !== lastValue.current) {
      ref.current.innerHTML = value
      lastValue.current = value
    }
  }, [value])

  function exec(command: string, arg?: string) {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    handleInput()
  }

  function handleInput() {
    const html = ref.current?.innerHTML ?? ""
    lastValue.current = html
    onChange(html)
  }

  function handleLink() {
    const url = window.prompt("Havola manzilini kiriting:")
    if (url) exec("createLink", url)
  }

  return (
    <div className="rounded-[8px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.2)" }}>
      <div className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap" style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <ToolbarButton icon={<Bold className="w-4 h-4" />} title="Qalin" onClick={() => exec("bold")} />
        <ToolbarButton icon={<Italic className="w-4 h-4" />} title="Kursiv" onClick={() => exec("italic")} />
        <ToolbarButton icon={<Strikethrough className="w-4 h-4" />} title="Chizilgan" onClick={() => exec("strikeThrough")} />
        <span className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(1,41,112,0.12)" }} />
        <ToolbarButton icon={<Heading1 className="w-4 h-4" />} title="Sarlavha 1" onClick={() => exec("formatBlock", "H1")} />
        <ToolbarButton icon={<Heading2 className="w-4 h-4" />} title="Sarlavha 2" onClick={() => exec("formatBlock", "H2")} />
        <ToolbarButton icon={<Heading3 className="w-4 h-4" />} title="Sarlavha 3" onClick={() => exec("formatBlock", "H3")} />
        <span className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(1,41,112,0.12)" }} />
        <ToolbarButton icon={<List className="w-4 h-4" />} title="Ro'yxat" onClick={() => exec("insertUnorderedList")} />
        <ToolbarButton icon={<ListOrdered className="w-4 h-4" />} title="Raqamli ro'yxat" onClick={() => exec("insertOrderedList")} />
        <span className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(1,41,112,0.12)" }} />
        <ToolbarButton icon={<AlignLeft className="w-4 h-4" />} title="Chapga" onClick={() => exec("justifyLeft")} />
        <ToolbarButton icon={<AlignCenter className="w-4 h-4" />} title="O'rtaga" onClick={() => exec("justifyCenter")} />
        <ToolbarButton icon={<AlignRight className="w-4 h-4" />} title="O'ngga" onClick={() => exec("justifyRight")} />
        <span className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(1,41,112,0.12)" }} />
        <ToolbarButton icon={<LinkIcon className="w-4 h-4" />} title="Havola" onClick={handleLink} />
        <ToolbarButton icon={<Undo2 className="w-4 h-4" />} title="Bekor qilish" onClick={() => exec("undo")} />
        <ToolbarButton icon={<Redo2 className="w-4 h-4" />} title="Qaytarish" onClick={() => exec("redo")} />
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="min-h-[110px] max-h-[300px] overflow-y-auto px-3 py-2.5 text-sm outline-none rich-text-editable"
        style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
        suppressContentEditableWarning
      />
      <style jsx>{`
        .rich-text-editable:empty::before {
          content: attr(data-placeholder);
          color: #a9bcd6;
        }
        .rich-text-editable h1 { font-size: 1.4em; font-weight: 700; margin: 0.3em 0; }
        .rich-text-editable h2 { font-size: 1.2em; font-weight: 700; margin: 0.3em 0; }
        .rich-text-editable h3 { font-size: 1.05em; font-weight: 600; margin: 0.3em 0; }
        .rich-text-editable ul, .rich-text-editable ol { padding-left: 1.4em; }
        .rich-text-editable a { color: #0e58a8; text-decoration: underline; }
      `}</style>
    </div>
  )
}
