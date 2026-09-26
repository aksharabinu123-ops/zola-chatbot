"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Brain, Check, ChevronDown, Copy, Sparkles } from "lucide-react"

interface ThinkingBlockProps {
  reasoning: string
  isStreaming?: boolean
}

export function ThinkingBlock({ reasoning, isStreaming }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [seconds, setSeconds] = useState(0)

  // Live elapsed thinking timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isStreaming) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isStreaming])

  if (!reasoning || reasoning.trim().length === 0) return null

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(reasoning)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
      className="my-3 overflow-hidden rounded-[20px] border border-[#a8dec7] bg-[#edf7f2] dark:border-emerald-500/20 dark:bg-[#10191b]/90 backdrop-blur-md shadow-xs transition-all"
    >
      {/* M3 Accordion Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-[#006b44] dark:text-emerald-400 hover:bg-black/5 dark:hover:bg-emerald-500/5 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-7 items-center justify-center rounded-full bg-[#d0eee1] text-[#006b44] dark:bg-emerald-500/10 dark:text-emerald-400 border border-[#a8dec7] dark:border-emerald-500/25">
            {isStreaming ? (
              <>
                <Brain className="size-3.5 animate-pulse text-[#006b44] dark:text-emerald-400" />
                <span className="absolute -inset-0.5 rounded-full border border-emerald-500/40 animate-ping opacity-75" />
              </>
            ) : (
              <Sparkles className="size-3.5 text-[#006b44] dark:text-emerald-400" />
            )}
          </div>

          <div className="flex flex-col text-left">
            <span className="font-bold tracking-wide flex items-center gap-2 text-[#005234] dark:text-emerald-300">
              {isStreaming ? "Neural Thinking Process..." : "Reasoning Sequence"}
              {isStreaming && (
                <span className="font-mono text-[10px] text-[#005234] bg-[#b9e7d3] dark:text-emerald-400/90 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full">
                  {seconds}s
                </span>
              )}
            </span>
            <span className="text-[10px] text-[#4d635c] dark:text-[#839794] font-mono">
              {isStreaming
                ? "Synthesizing logic across 550B weights"
                : "Chain-of-thought completed"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#4d635c] dark:text-muted-foreground">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy thought process"
            className="flex items-center gap-1 rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-emerald-500/15 hover:text-[#005234] dark:hover:text-emerald-300 transition-colors"
          >
            {copied ? (
              <Check className="size-3.5 text-[#00875a] dark:text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="size-4 text-[#006b44] dark:text-emerald-400/70" />
          </motion.div>
        </div>
      </div>

      {/* Expandable M3 Reasoning Stream */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden border-t border-[#a8dec7]/70 dark:border-emerald-500/15"
          >
            <div className="max-h-80 overflow-y-auto px-4 py-3.5 text-xs font-mono leading-relaxed text-[#21352f] dark:text-[#a8b8ba] whitespace-pre-wrap select-text selection:bg-emerald-500/25">
              {reasoning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
