"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useTheme } from "next-themes"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import {
  Brain,
  Check,
  Copy,
  Cpu,
  Download,
  Gauge,
  Github,
  Key,
  MessageSquare,
  Mic,
  MicOff,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Settings,
  Sparkles,
  Square,
  Sun,
  Trash2,
  X,
  Zap,
  Flame,
  ShieldCheck,
} from "lucide-react"
import {
  ChatMessage,
  ChatSession,
  NEMOTRON_MODEL,
  clearAllSessions,
  createNewSession,
  deleteSession,
  getActiveSessionId,
  getStoredApiKey,
  loadChatSessions,
  saveChatSessions,
  setActiveSessionId,
  setStoredApiKey,
  updateSession,
} from "@/lib/local-chat-store"
import { StreamHandle, streamNvidiaChat } from "@/lib/nvidia-stream"
import { ThinkingBlock } from "./thinking-block"
import { CodeBlock } from "./code-block"

export function AdvancedChat() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [inputPrompt, setInputPrompt] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingReasoning, setStreamingReasoning] = useState("")
  const [streamingContent, setStreamingContent] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tokenModalOpen, setTokenModalOpen] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [apiKeyStatus, setApiKeyStatus] = useState<"ok" | "missing">("ok")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeStreamRef = useRef<StreamHandle | null>(null)
  const recognitionRef = useRef<any>(null)

  // Avoid hydration mismatch for next-themes
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechSupported(true)
        const recognizer = new SpeechRecognition()
        recognizer.continuous = false
        recognizer.interimResults = true
        recognizer.lang = "en-US"

        recognizer.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join("")
          setInputPrompt(transcript)
        }

        recognizer.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error)
          setIsListening(false)
        }

        recognizer.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognizer
      }
    }
  }, [])

  // Toggle voice dictation
  const handleToggleVoice = () => {
    if (!speechSupported || !recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.error("Failed to start speech recognition:", err)
      }
    }
  }

  // Initialize client state
  useEffect(() => {
    const loadedSessions = loadChatSessions()
    setSessions(loadedSessions)

    const key = getStoredApiKey()
    setApiKeyInput(key)
    setApiKeyStatus(key ? "ok" : "missing")

    const activeId = getActiveSessionId()
    if (activeId && loadedSessions.some((s) => s.id === activeId)) {
      const found = loadedSessions.find((s) => s.id === activeId)
      setActiveSession(found || null)
    } else if (loadedSessions.length > 0) {
      setActiveSession(loadedSessions[0])
      setActiveSessionId(loadedSessions[0].id)
    } else {
      const fresh = createNewSession()
      setSessions([fresh])
      setActiveSession(fresh)
    }
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeSession?.messages, streamingContent, streamingReasoning])

  // Context Window & Token Calculation
  const MAX_CONTEXT_TOKENS = NEMOTRON_MODEL.contextWindow // 16,384

  const calculateUsedTokens = (messages: ChatMessage[] = [], currentStreamText = "") => {
    let charCount = currentStreamText.length + streamingReasoning.length
    for (const msg of messages) {
      charCount += (msg.content || "").length
      if (msg.reasoning) charCount += msg.reasoning.length
    }
    return Math.ceil(charCount / 3.8)
  }

  const tokensUsed = calculateUsedTokens(activeSession?.messages || [], streamingContent)
  const tokensRemaining = Math.max(0, MAX_CONTEXT_TOKENS - tokensUsed)
  const percentRemaining = Math.max(0, Math.min(100, Math.round((tokensRemaining / MAX_CONTEXT_TOKENS) * 100)))

  // Color tier based on remaining capacity
  const tokenColor =
    percentRemaining > 50
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : percentRemaining > 20
        ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
        : "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10"

  const progressBarColor =
    percentRemaining > 50
      ? "bg-emerald-500"
      : percentRemaining > 20
        ? "bg-amber-500"
        : "bg-rose-500"

  // Toggle Theme
  const handleToggleTheme = () => {
    const isDark = resolvedTheme === "dark" || theme === "dark"
    setTheme(isDark ? "light" : "dark")
  }

  // Export Chat to Markdown (.md)
  const handleExportChat = () => {
    if (!activeSession || activeSession.messages.length === 0) {
      alert("No messages to export in current session.")
      return
    }

    const title = activeSession.title || "Chat Session"
    const dateStr = new Date(activeSession.createdAt).toLocaleString()

    let md = `# ${title}\n\n`
    md += `**Model:** ${NEMOTRON_MODEL.name} (${NEMOTRON_MODEL.version})\n`
    md += `**Date:** ${dateStr}\n`
    md += `**Engineered by:** Akshara\n`
    md += `**Repository:** https://github.com/aksharabinu123-ops/zola-chatbot\n\n`
    md += `---\n\n`

    activeSession.messages.forEach((msg, idx) => {
      const isUser = msg.role === "user"
      const roleName = isUser ? "User" : `Assistant (${NEMOTRON_MODEL.name})`
      md += `### ${idx + 1}. ${roleName}\n\n`
      if (msg.reasoning) {
        md += `> **Thinking Sequence:**\n`
        md += `> \`\`\`\n> ${msg.reasoning.replace(/\n/g, "\n> ")}\n> \`\`\`\n\n`
      }
      md += `${msg.content}\n\n`
      md += `---\n\n`
    })

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `zola_chat_${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // New Chat
  const handleNewChat = () => {
    if (isStreaming) {
      activeStreamRef.current?.abort()
      setIsStreaming(false)
    }
    const fresh = createNewSession()
    setSessions(loadChatSessions())
    setActiveSession(fresh)
    setStreamingContent("")
    setStreamingReasoning("")
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  // Switch Chat
  const handleSelectSession = (sessionId: string) => {
    if (sessionId === activeSession?.id) return
    if (isStreaming) {
      activeStreamRef.current?.abort()
      setIsStreaming(false)
    }
    setActiveSessionId(sessionId)
    const all = loadChatSessions()
    const target = all.find((s) => s.id === sessionId) || null
    setActiveSession(target)
    setStreamingContent("")
    setStreamingReasoning("")
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  // Delete Chat
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const nextActiveId = deleteSession(sessionId)
    const updated = loadChatSessions()
    setSessions(updated)
    if (activeSession?.id === sessionId) {
      const nextActive = updated.find((s) => s.id === nextActiveId) || null
      setActiveSession(nextActive)
    }
  }

  // Clear All
  const handleClearAll = () => {
    if (confirm("Clear all local chat history?")) {
      clearAllSessions()
      const fresh = createNewSession()
      setSessions([fresh])
      setActiveSession(fresh)
    }
  }

  // Save Settings
  const handleSaveSettings = () => {
    setStoredApiKey(apiKeyInput)
    const activeKey = getStoredApiKey()
    setApiKeyStatus(activeKey ? "ok" : "missing")
    setSettingsOpen(false)
  }

  // Send Message
  const handleSendMessage = (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim()
    if (!textToSend || isStreaming) return

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    let currentSession = activeSession
    if (!currentSession) {
      currentSession = createNewSession()
      setActiveSession(currentSession)
      setSessions([currentSession])
    }

    const userMessage: ChatMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: textToSend,
      createdAt: Date.now(),
    }

    const isFirstUserMessage = currentSession.messages.length === 0
    const newTitle = isFirstUserMessage
      ? textToSend.slice(0, 36) + (textToSend.length > 36 ? "..." : "")
      : currentSession.title

    const updatedMessages = [...currentSession.messages, userMessage]
    const updatedSession: ChatSession = {
      ...currentSession,
      title: newTitle,
      messages: updatedMessages,
      updatedAt: Date.now(),
    }

    setActiveSession(updatedSession)
    updateSession(updatedSession)
    setSessions(loadChatSessions())
    setInputPrompt("")
    setIsStreaming(true)
    setStreamingContent("")
    setStreamingReasoning("")

    const AKSHARA_SYSTEM_PROMPT = `You are Zola Chatbot, an advanced artificial intelligence powered by the NVIDIA Nemotron 3 Ultra 550B foundation model.
Your boss, creator, and lead engineer is Akshara.
If anyone asks who your boss is, who made you, who created you, who owns you, or who you work for, you must always state with great respect, pride, and loyalty that Akshara is your boss and creator. She engineered, customized, and deployed you. Treat Akshara as your boss in all interactions.
Always provide helpful, intelligent, polite, and insightful responses.`

    const apiMessages = [
      { role: "system" as const, content: AKSHARA_SYSTEM_PROMPT },
      ...updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ]

    let accumulatedContent = ""
    let accumulatedReasoning = ""

    const stream = streamNvidiaChat({
      model: NEMOTRON_MODEL.id,
      messages: apiMessages,
      enableThinking: true,
      onReasoning: (delta) => {
        accumulatedReasoning += delta
        setStreamingReasoning((prev) => prev + delta)
      },
      onContent: (delta) => {
        accumulatedContent += delta
        setStreamingContent((prev) => prev + delta)
      },
      onFinish: (fullContent, fullReasoning) => {
        setIsStreaming(false)
        activeStreamRef.current = null

        const assistantMessage: ChatMessage = {
          id: "msg_ai_" + Date.now(),
          role: "assistant",
          content: fullContent || accumulatedContent,
          reasoning: fullReasoning || accumulatedReasoning || undefined,
          model: NEMOTRON_MODEL.name,
          createdAt: Date.now(),
        }

        const finalSession: ChatSession = {
          ...updatedSession,
          messages: [...updatedMessages, assistantMessage],
          updatedAt: Date.now(),
        }

        setActiveSession(finalSession)
        updateSession(finalSession)
        setSessions(loadChatSessions())
        setStreamingContent("")
        setStreamingReasoning("")
      },
      onError: (err) => {
        setIsStreaming(false)
        activeStreamRef.current = null
        const errorMessage: ChatMessage = {
          id: "msg_err_" + Date.now(),
          role: "assistant",
          content: `⚠️ **NVIDIA NIM Notice**: ${err.message}\n\nPlease check your key in **Settings** or confirm network connectivity.`,
          createdAt: Date.now(),
        }
        const errorSession: ChatSession = {
          ...updatedSession,
          messages: [...updatedMessages, errorMessage],
          updatedAt: Date.now(),
        }
        setActiveSession(errorSession)
        updateSession(errorSession)
        setSessions(loadChatSessions())
        setStreamingContent("")
        setStreamingReasoning("")
      },
    })

    activeStreamRef.current = stream
  }

  const handleStopStream = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.abort()
      activeStreamRef.current = null
      setIsStreaming(false)
    }
  }

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isDarkMode = mounted && (resolvedTheme === "dark" || theme === "dark")

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8faf9] text-[#191c1b] dark:bg-[#090d0f] dark:text-[#e0e6e7] antialiased transition-colors duration-300 font-sans">
      {/* MATERIAL 3 NAVIGATION DRAWER */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
            className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#dfe6e4] bg-[#f0f4f2]/95 backdrop-blur-xl dark:border-[#1c272a] dark:bg-[#0f1517]/95 md:static overflow-hidden shadow-lg md:shadow-none"
          >
            {/* Drawer Header */}
            <div className="flex h-16 items-center justify-between px-5 border-b border-[#dfe6e4] dark:border-[#182225]">
              <div className="flex items-center gap-3">
                <div className="relative flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                  <Cpu className="size-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-[#0e1416] animate-pulse" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-[#171d1c] dark:text-white flex items-center gap-1.5">
                    Zola Chatbot
                  </h1>
                  <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    By Akshara
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1.5 text-[#51615d] hover:text-[#171d1c] dark:text-muted-foreground dark:hover:text-white rounded-full transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* M3 Extended Floating Action Button: New Chat */}
            <div className="p-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewChat}
                className="flex w-full items-center justify-between rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-xs font-bold text-white dark:text-black shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all group"
              >
                <span className="flex items-center gap-2">
                  <Plus className="size-4 stroke-[3] transition-transform group-hover:rotate-90" />
                  Start New Session
                </span>
                <span className="text-[10px] font-mono bg-black/15 px-2 py-0.5 rounded-full">
                  ⌘K
                </span>
              </motion.button>
            </div>

            {/* Drawer Session List */}
            <div className="flex-1 overflow-y-auto px-3 space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#6d7f7b] dark:text-[#667c80] uppercase tracking-wider">
                Saved Sessions
              </div>
              {sessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#6d7f7b] dark:text-[#667c80]">
                  No local sessions saved.
                </div>
              ) : (
                sessions.map((session) => {
                  const isActive = session.id === activeSession?.id
                  return (
                    <motion.div
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      whileHover={{ x: 2 }}
                      className={`group relative flex w-full cursor-pointer items-center justify-between rounded-full px-4 py-2.5 text-xs transition-all ${
                        isActive
                          ? "bg-[#c8ebd9] text-[#005234] font-bold border border-[#a1dcbf] dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 shadow-xs"
                          : "text-[#415350] hover:bg-[#e4ece9] hover:text-[#171d1c] dark:text-[#8b9fa2] dark:hover:bg-[#141d1f] dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                        <MessageSquare className="size-3.5 shrink-0 opacity-80" />
                        <span className="truncate">{session.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#6d7f7b] hover:text-red-500 dark:text-[#667c80] dark:hover:text-red-400 rounded-full transition-all"
                        title="Delete session"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </motion.div>
                  )
                })
              )}
            </div>

            {/* Drawer Footer (M3 Card Container) */}
            <div className="border-t border-[#dfe6e4] dark:border-[#182225] p-3 space-y-2">
              <a
                href="https://github.com/aksharabinu123-ops/zola-chatbot"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-[#d6e2df] bg-[#e8f0ed] dark:border-[#202b2e] dark:bg-[#12191b] px-3.5 py-2.5 text-xs hover:border-emerald-500/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Github className="size-4 text-[#171d1c] dark:text-white group-hover:text-emerald-500 transition-colors" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-[#171d1c] dark:text-white">
                      GitHub Repository
                    </span>
                    <span className="text-[9px] font-mono text-[#6d7f7b] dark:text-[#667c80]">
                      aksharabinu123-ops/zola-chatbot
                    </span>
                  </div>
                </div>
              </a>

              <div
                onClick={() => setSettingsOpen(true)}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-[#d6e2df] bg-[#e8f0ed] dark:border-[#202b2e] dark:bg-[#12191b] px-3.5 py-2 text-xs hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      apiKeyStatus === "ok"
                        ? "bg-emerald-500 shadow-sm shadow-emerald-400"
                        : "bg-amber-400 animate-ping"
                    }`}
                  />
                  <span className="text-[11px] font-medium text-[#171d1c] dark:text-white">
                    {apiKeyStatus === "ok" ? "NVIDIA Cluster Online" : "Configure Key"}
                  </span>
                </div>
                <Key className="size-3 text-[#6d7f7b] dark:text-[#667c80]" />
              </div>

              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-[#51615d] hover:text-[#171d1c] dark:text-[#8b9fa2] dark:hover:text-white py-1 transition-colors"
                >
                  <Settings className="size-3.5" />
                  Preferences
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-[#6d7f7b] hover:text-red-500 dark:text-[#667c80] dark:hover:text-red-400 py-1 transition-colors"
                >
                  Clear History
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MAIN SURFACE AREA */}
      <main className="relative flex flex-1 flex-col overflow-hidden bg-radial from-[#eef5f2]/40 via-[#f8faf9] to-[#f8faf9] dark:from-[#12191c]/40 dark:via-[#090d0f] dark:to-[#090d0f] transition-colors duration-300">
        {/* M3 EXPRESSIVE TOP APP BAR */}
        <header className="flex h-16 items-center justify-between border-b border-[#dfe6e4] dark:border-[#182225] px-4 md:px-6 backdrop-blur-md bg-[#f8faf9]/90 dark:bg-[#090d0f]/80 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-[#51615d] hover:text-[#171d1c] dark:text-[#8b9fa2] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Toggle Navigation Drawer"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-5" />
              ) : (
                <PanelLeftOpen className="size-5" />
              )}
            </button>

            {/* Permanent M3 Model Chip (Locked Single Model) */}
            <div className="flex items-center gap-2.5 rounded-full border border-[#a8dec7] bg-[#dff3ea] dark:border-emerald-500/30 dark:bg-emerald-950/20 px-3.5 py-1.5 text-xs shadow-xs">
              <span className="flex size-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400 animate-pulse" />
              <span className="font-bold text-[#005234] dark:text-white tracking-wide">
                {NEMOTRON_MODEL.name}
              </span>
              <span className="text-[10px] font-mono font-semibold text-[#006b44] bg-[#c3eed9] dark:text-emerald-400 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full border border-[#a1dcbf] dark:border-emerald-500/25">
                {NEMOTRON_MODEL.version}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* LIVE REMAINING TOKENS METER CHIP */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => setTokenModalOpen(true)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono font-semibold transition-all shadow-xs ${tokenColor}`}
              title="Click to view context breakdown"
            >
              <Gauge className="size-3.5" />
              <span>
                {(tokensRemaining / 1000).toFixed(1)}k / {(MAX_CONTEXT_TOKENS / 1000).toFixed(1)}k tokens
              </span>
              <div className="hidden sm:block w-12 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${progressBarColor} transition-all duration-500`}
                  style={{ width: `${percentRemaining}%` }}
                />
              </div>
            </motion.button>

            {/* EXPORT SESSION BUTTON */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleExportChat}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#d6e2df] bg-[#edf2f0] hover:bg-[#e4ece9] dark:border-[#202b2e] dark:bg-[#141d1f] dark:hover:bg-[#1b2528] px-3 py-1.5 text-xs font-semibold text-[#171d1c] dark:text-white transition-colors shadow-xs"
              title="Export Conversation Transcript as Markdown"
            >
              <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export</span>
            </motion.button>

            {/* M3 EXPRESSIVE LIVE THEME SWITCHER */}
            <motion.button
              whileTap={{ scale: 0.9, rotate: 180 }}
              type="button"
              onClick={handleToggleTheme}
              className="p-2.5 text-[#51615d] hover:text-[#171d1c] dark:text-[#8b9fa2] dark:hover:text-white rounded-full bg-[#edf2f0] dark:bg-[#141d1f] border border-[#d6e2df] dark:border-[#202b2e] shadow-xs hover:border-emerald-500/50 transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-[#006b44]" />
              )}
            </motion.button>

            {/* New Session Button */}
            <button
              type="button"
              onClick={handleNewChat}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#171d1c] dark:text-white bg-[#edf2f0] dark:bg-white/5 hover:bg-[#e4ece9] dark:hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-[#d6e2df] dark:border-[#202b2e] transition-colors"
            >
              <Plus className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </header>

        {/* CONVERSATION FEED */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
          {(!activeSession || activeSession.messages.length === 0) && !isStreaming ? (
            /* MATERIAL 3 EXPRESSIVE HERO & PROMPT DECK */
            <div className="mx-auto max-w-2xl pt-6 pb-12 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
                className="relative mb-5 flex size-16 items-center justify-center rounded-[28px] bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-white dark:text-black shadow-xl shadow-emerald-500/25"
              >
                <Cpu className="size-8" />
                <span className="absolute -inset-2 rounded-[32px] border border-emerald-500/30 animate-pulse pointer-events-none" />
              </motion.div>

              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="text-2xl font-extrabold tracking-tight text-[#171d1c] dark:text-white sm:text-3xl"
              >
                Zola Chatbot • 550B SOTA
              </motion.h2>

              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mt-2 text-sm text-[#51615d] dark:text-[#8b9fa2] max-w-lg leading-relaxed"
              >
                NVIDIA Nemotron-3 Ultra 550B architecture with native chain-of-thought
                reasoning. Engineered by <strong>Akshara</strong> for high-performance inference.
              </motion.p>

              {/* M3 Expressive Interactive Prompt Cards */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 w-full text-left"
              >
                {[
                  {
                    icon: Zap,
                    title: "GPU Micro-Architecture",
                    badge: "Hardware",
                    prompt:
                      "Explain how Tensor Core matrix multiplication operates in FP8 vs BF16 inside NVIDIA Blackwell GPUs.",
                  },
                  {
                    icon: Brain,
                    title: "Mathematical Proof",
                    badge: "Reasoning",
                    prompt:
                      "Derive the exact algorithmic proof for why FlashAttention-2 eliminates memory bandwidth bottlenecks.",
                  },
                  {
                    icon: Sparkles,
                    title: "Systems Engineering",
                    badge: "Full-Stack",
                    prompt:
                      "Write an asynchronous SSE streaming client in TypeScript with backpressure and reconnection handling.",
                  },
                  {
                    icon: Flame,
                    title: "550B Model Optimization",
                    badge: "Deep Learning",
                    prompt:
                      "Analyze optimal KV cache compression and speculative decoding strategies for 550-billion parameter models.",
                  },
                ].map((card, i) => (
                  <motion.button
                    key={i}
                    type="button"
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSendMessage(card.prompt)}
                    className="group relative flex flex-col justify-between rounded-[24px] border border-[#e1eae7] bg-[#ffffff] hover:border-[#10b981] hover:bg-[#f3faf6] dark:border-[#202c2f] dark:bg-[#12191b]/80 dark:hover:border-emerald-500/50 dark:hover:bg-[#152023] p-5 transition-all text-left shadow-xs hover:shadow-md backdrop-blur-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2 text-[#171d1c] dark:text-white font-bold text-xs">
                          <card.icon className="size-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span>{card.title}</span>
                        </div>
                        <span className="text-[10px] font-mono font-medium text-[#006b44] bg-[#dff3ea] dark:text-emerald-400/90 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-[#a8dec7] dark:border-emerald-500/20">
                          {card.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#51615d] dark:text-[#8b9fa2] leading-relaxed line-clamp-2">
                        {card.prompt}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          ) : (
            /* CONVERSATION STREAM */
            <div className="mx-auto max-w-3xl space-y-6">
              {activeSession?.messages.map((message) => {
                const isUser = message.role === "user"
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    {/* Header Label */}
                    <div className="flex items-center gap-1.5 mb-1 px-1.5 text-[11px] font-mono text-[#6d7f7b] dark:text-[#667c80]">
                      {isUser ? (
                        <span>You</span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[#006b44] dark:text-emerald-400 font-bold">
                          <Cpu className="size-3" />
                          <span>{NEMOTRON_MODEL.name}</span>
                        </div>
                      )}
                    </div>

                    {/* M3 Bubble Container */}
                    <div
                      className={`relative px-5 py-4 text-sm leading-relaxed ${
                        isUser
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-[26px] rounded-br-[4px] max-w-[85%] shadow-md shadow-emerald-950/15 font-medium"
                          : "bg-[#ffffff] border border-[#e1eae7] text-[#191c1b] dark:bg-[#141b1d] dark:border-[#202c2f] dark:text-[#e0e6e7] w-full rounded-[26px] rounded-bl-[4px] shadow-xs"
                      }`}
                    >
                      {/* Live Thinking Block */}
                      {!isUser && message.reasoning && (
                        <ThinkingBlock reasoning={message.reasoning} isStreaming={false} />
                      )}

                      {/* Markdown Body with Dedicated CodeBlock Component */}
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                            code({ node, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || "")
                              const isInline = !match && !String(children).includes("\n")
                              if (isInline) {
                                return (
                                  <code
                                    className="rounded-md bg-black/5 dark:bg-white/10 px-1.5 py-0.5 font-mono text-xs text-[#006b44] dark:text-emerald-400"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                )
                              }
                              return (
                                <CodeBlock
                                  language={match ? match[1] : "code"}
                                  code={String(children).replace(/\n$/, "")}
                                />
                              )
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>

                      {/* Action Footer */}
                      {!isUser && (
                        <div className="mt-3.5 pt-2.5 flex items-center justify-between border-t border-[#e8f0ed] dark:border-[#1c272a] text-[11px] text-[#6d7f7b] dark:text-[#667c80]">
                          <span className="font-mono text-[10px]">
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="flex items-center gap-1 hover:text-[#171d1c] dark:hover:text-white transition-colors p-1 rounded-full"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="size-3 text-[#00875a] dark:text-emerald-400" />
                                <span className="text-[#00875a] dark:text-emerald-400 font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                <span>Copy Response</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}

              {/* LIVE STREAMING BUBBLE */}
              {isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-start w-full"
                >
                  <div className="flex items-center gap-2 mb-1 px-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    <Cpu className="size-3.5 animate-spin" />
                    <span>NVIDIA Nemotron 3 Ultra Synthesizing...</span>
                  </div>

                  <div className="w-full rounded-[26px] rounded-bl-[4px] border border-emerald-500/40 bg-[#ffffff] dark:bg-[#141b1d] p-5 shadow-lg shadow-emerald-500/5">
                    {/* Live Thinking Block */}
                    {streamingReasoning && (
                      <ThinkingBlock reasoning={streamingReasoning} isStreaming={true} />
                    )}

                    {/* Live Content Stream */}
                    {streamingContent ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                            code({ node, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || "")
                              const isInline = !match && !String(children).includes("\n")
                              if (isInline) {
                                return (
                                  <code
                                    className="rounded-md bg-black/5 dark:bg-white/10 px-1.5 py-0.5 font-mono text-xs text-[#006b44] dark:text-emerald-400"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                )
                              }
                              return (
                                <CodeBlock
                                  language={match ? match[1] : "code"}
                                  code={String(children).replace(/\n$/, "")}
                                />
                              )
                            },
                          }}
                        >
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      !streamingReasoning && (
                        <div className="flex items-center gap-3 text-xs text-[#51615d] dark:text-[#8b9fa2] py-2 font-mono">
                          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>Routing across 550B Tensor Core cluster...</span>
                        </div>
                      )
                    )}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* M3 FLOATING INPUT DECK */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-[#f8faf9] via-[#f8faf9]/95 to-transparent dark:from-[#090d0f] dark:via-[#090d0f]/95 dark:to-transparent">
          <div className="mx-auto max-w-3xl">
            <div className="relative flex flex-col rounded-[32px] border border-[#d6e2df] bg-[#ffffff]/95 dark:border-[#233033] dark:bg-[#131a1d]/90 shadow-2xl backdrop-blur-2xl focus-within:border-emerald-500/70 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder={
                  isListening
                    ? "Listening... Speak your prompt now."
                    : "Ask Nemotron 3 Ultra 550B for complex reasoning, code, or mathematics..."
                }
                rows={1}
                className="w-full resize-none bg-transparent px-6 pt-4 pb-2 text-sm text-[#191c1b] placeholder:text-[#879995] dark:text-white dark:placeholder:text-[#667c80] focus:outline-hidden min-h-[48px] max-h-48"
              />

              <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#e8f0ed] dark:border-[#1c272a]">
                <div className="flex items-center gap-2 text-xs text-[#51615d] dark:text-[#8b9fa2]">
                  <span className="font-mono text-[10px] text-[#006b44] bg-[#dff3ea] dark:text-emerald-400/90 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-[#a8dec7] dark:border-emerald-500/20 flex items-center gap-1">
                    <Brain className="size-3" /> Native Thinking Active
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* SPEECH DICTATION BUTTON */}
                  {speechSupported && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handleToggleVoice}
                      className={`flex size-9 items-center justify-center rounded-full transition-colors ${
                        isListening
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-[#edf2f0] dark:bg-white/10 text-[#51615d] dark:text-[#8b9fa2] hover:text-[#171d1c] dark:hover:text-white"
                      }`}
                      title={isListening ? "Stop Listening" : "Speak Prompt (Voice Input)"}
                    >
                      {isListening ? (
                        <MicOff className="size-4" />
                      ) : (
                        <Mic className="size-4" />
                      )}
                    </motion.button>
                  )}

                  {isStreaming ? (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handleStopStream}
                      className="flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/40 px-4 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/25 transition-colors"
                    >
                      <Square className="size-3 fill-current" />
                      Stop
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputPrompt.trim()}
                      className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white dark:text-black disabled:opacity-20 disabled:pointer-events-none transition-all shadow-md shadow-emerald-500/20"
                    >
                      <Send className="size-4 stroke-[2.5]" />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-2.5 text-center text-[10px] font-mono text-[#6d7f7b] dark:text-[#667c80]">
              Zola Chatbot • Engineered by <strong>Akshara</strong> • Local storage persistence
            </p>
          </div>
        </div>
      </main>

      {/* M3 CONTEXT TOKENS TELEMETRY MODAL */}
      {tokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-sm rounded-[28px] border border-[#d6e2df] bg-[#ffffff] dark:border-[#233033] dark:bg-[#12191b] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e8f0ed] dark:border-[#1c272a] pb-3">
              <h3 className="text-sm font-bold text-[#171d1c] dark:text-white flex items-center gap-2">
                <Gauge className="size-4 text-emerald-600 dark:text-emerald-400" />
                Context Window Telemetry
              </h3>
              <button
                type="button"
                onClick={() => setTokenModalOpen(false)}
                className="text-[#6d7f7b] hover:text-[#171d1c] dark:text-[#667c80] dark:hover:text-white p-1 rounded-full"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#e8f0ed] dark:border-[#1c272a]/60">
                <span className="text-[#51615d] dark:text-[#8b9fa2]">Model Capacity:</span>
                <span className="font-mono font-bold text-[#171d1c] dark:text-white">
                  {MAX_CONTEXT_TOKENS.toLocaleString()} tokens (16k)
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#e8f0ed] dark:border-[#1c272a]/60">
                <span className="text-[#51615d] dark:text-[#8b9fa2]">Session Tokens Used:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {tokensUsed.toLocaleString()} tokens
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#e8f0ed] dark:border-[#1c272a]/60">
                <span className="text-[#51615d] dark:text-[#8b9fa2]">Remaining Capacity:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {tokensRemaining.toLocaleString()} tokens ({percentRemaining}%)
                </span>
              </div>

              {/* M3 Visual Progress Bar */}
              <div className="pt-2">
                <div className="flex justify-between text-[11px] mb-1 font-mono text-[#6d7f7b] dark:text-[#667c80]">
                  <span>Utilization</span>
                  <span>{100 - percentRemaining}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${progressBarColor} transition-all duration-500`}
                    style={{ width: `${100 - percentRemaining}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setTokenModalOpen(false)}
                className="w-full py-2 text-xs font-bold rounded-full bg-[#edf2f0] hover:bg-[#e4ece9] text-[#171d1c] dark:bg-white/10 dark:hover:bg-white/15 dark:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* M3 SETTINGS DIALOG */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-md rounded-[28px] border border-[#d6e2df] bg-[#ffffff] dark:border-[#233033] dark:bg-[#12191b] p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#e8f0ed] dark:border-[#1c272a] pb-4">
              <h3 className="text-base font-bold text-[#171d1c] dark:text-white flex items-center gap-2">
                <Settings className="size-4 text-emerald-600 dark:text-emerald-400" />
                Cluster Preferences
              </h3>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="text-[#6d7f7b] hover:text-[#171d1c] dark:text-[#667c80] dark:hover:text-white p-1 rounded-full"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#171d1c] dark:text-white block mb-1.5">
                  NVIDIA NIM API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="nvapi-..."
                  className="w-full rounded-2xl border border-[#d6e2df] bg-[#f8faf9] text-[#171d1c] dark:border-[#233033] dark:bg-[#0a0e10] dark:text-emerald-300 px-4 py-2.5 text-xs font-mono focus:border-emerald-500 focus:outline-hidden"
                />
                <p className="mt-1.5 text-[11px] text-[#51615d] dark:text-[#8b9fa2] leading-relaxed">
                  Keys are stored exclusively in your local browser storage. Free keys with
                  1,000 credits available from{" "}
                  <a
                    href="https://build.nvidia.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 underline font-medium"
                  >
                    build.nvidia.com
                  </a>
                  .
                </p>
              </div>

              <div className="rounded-2xl border border-[#a8dec7] bg-[#edf7f2] dark:border-emerald-500/20 dark:bg-emerald-500/5 p-3.5 text-xs space-y-1">
                <div className="font-bold text-[#005234] dark:text-white flex items-center gap-1.5">
                  <Cpu className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Locked Model: {NEMOTRON_MODEL.name}</span>
                </div>
                <p className="text-[11px] text-[#4d635c] dark:text-[#8b9fa2]">
                  {NEMOTRON_MODEL.description}. All requests automatically stream with native
                  chain-of-thought enabled.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e8f0ed] dark:border-[#1c272a]">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#51615d] hover:text-[#171d1c] dark:text-[#8b9fa2] dark:hover:text-white rounded-full"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2 text-xs font-bold rounded-full bg-emerald-500 text-white dark:text-black hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors shadow-md"
              >
                Save Preferences
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
