"use client"

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  reasoning?: string
  isThinking?: boolean
  createdAt: number
  model?: string
}

export interface ChatSession {
  id: string
  title: string
  model: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEYS = {
  SESSIONS: "zola_local_chat_sessions",
  ACTIVE_ID: "zola_local_active_session_id",
  API_KEY: "zola_local_nvidia_api_key",
}

// Supported Models on NVIDIA NIM
export const NEMOTRON_MODEL = {
  id: "nvidia/nemotron-3-ultra-550b-a55b",
  name: "NVIDIA Nemotron 3 Ultra",
  version: "550B SOTA",
  description: "Flagship 550-Billion Parameter Foundation Model with Native Chain-of-Thought Reasoning",
  contextWindow: 16384,
  hasThinking: true,
}

export const DEEPSEEK_MODEL = {
  id: "deepseek-ai/deepseek-v4.1-flash",
  name: "DeepSeek V4.1 Flash",
  version: "NVIDIA NIM",
  description: "High-Speed Frontier Reasoning Model hosted on NVIDIA DGX Cloud",
  contextWindow: 32768,
  hasThinking: true,
}

export const NVIDIA_MODELS = [NEMOTRON_MODEL, DEEPSEEK_MODEL]
export const DEFAULT_MODEL = NEMOTRON_MODEL.id

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return ""
  const userKey = localStorage.getItem(STORAGE_KEYS.API_KEY)
  if (userKey && userKey.trim().length > 0) return userKey.trim()
  return process.env.NEXT_PUBLIC_NVIDIA_API_KEY || ""
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") return
  if (key) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim())
  } else {
    localStorage.removeItem(STORAGE_KEYS.API_KEY)
  }
}

export function loadChatSessions(): ChatSession[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS)
    if (!raw) return []
    return JSON.parse(raw) as ChatSession[]
  } catch (err) {
    console.error("Failed to parse local chat sessions:", err)
    return []
  }
}

export function saveChatSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions))
  } catch (err) {
    console.error("Failed to save local chat sessions:", err)
  }
}

export function getActiveSessionId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID)
}

export function setActiveSessionId(id: string | null): void {
  if (typeof window === "undefined") return
  if (id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id)
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID)
  }
}

export function createNewSession(initialTitle = "New Chat"): ChatSession {
  const newSession: ChatSession = {
    id: "chat_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    title: initialTitle,
    model: DEFAULT_MODEL,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const sessions = loadChatSessions()
  const updated = [newSession, ...sessions]
  saveChatSessions(updated)
  setActiveSessionId(newSession.id)
  return newSession
}

export function updateSession(updatedSession: ChatSession): void {
  const sessions = loadChatSessions()
  const index = sessions.findIndex((s) => s.id === updatedSession.id)
  if (index >= 0) {
    sessions[index] = { ...updatedSession, updatedAt: Date.now() }
  } else {
    sessions.unshift(updatedSession)
  }
  saveChatSessions(sessions)
}

export function deleteSession(sessionId: string): string | null {
  const sessions = loadChatSessions()
  const filtered = sessions.filter((s) => s.id !== sessionId)
  saveChatSessions(filtered)

  const activeId = getActiveSessionId()
  if (activeId === sessionId) {
    const nextActive = filtered.length > 0 ? filtered[0].id : null
    setActiveSessionId(nextActive)
    return nextActive
  }
  return activeId
}

export function clearAllSessions(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEYS.SESSIONS)
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID)
}
