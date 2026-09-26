"use client"

import { useState } from "react"
import { Check, Copy, Terminal } from "lucide-react"

interface CodeBlockProps {
  language?: string
  code: string
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cleanLang = (language || "code").toLowerCase()

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-[#2d3a3d] bg-[#0c1214] shadow-md">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#222d30] bg-[#12191b] px-4 py-2 text-xs font-mono">
        <div className="flex items-center gap-2 text-emerald-400">
          <Terminal className="size-3.5" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            {cleanLang}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-sans font-medium text-[#8ea4a7] hover:bg-white/10 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Text Body */}
      <div className="overflow-x-auto p-4 text-xs font-mono leading-relaxed text-[#d7e4e6] selection:bg-emerald-500/30">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}
