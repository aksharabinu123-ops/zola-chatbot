"use client"

import { getStoredApiKey } from "./local-chat-store"

export interface StreamMessageInput {
  role: "user" | "assistant" | "system"
  content: string
}

export interface StreamOptions {
  model: string
  messages: StreamMessageInput[]
  enableThinking?: boolean
  temperature?: number
  onReasoning?: (deltaReasoning: string) => void
  onContent?: (deltaContent: string) => void
  onFinish?: (fullContent: string, fullReasoning: string) => void
  onError?: (err: Error) => void
}

export interface StreamHandle {
  abort: () => void
}

const CHAT_API_ENDPOINT = "/api/chat"

export function streamNvidiaChat(options: StreamOptions): StreamHandle {
  const controller = new AbortController()
  const apiKey = getStoredApiKey()
  const effectiveKey =
    apiKey ||
    process.env.NEXT_PUBLIC_NVIDIA_API_KEY ||
    ""

  const isStaticExport =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("github.io") || !!effectiveKey)

  const endpoint = isStaticExport
    ? "https://integrate.api.nvidia.com/v1/chat/completions"
    : "/api/chat"

  let fullContent = ""
  let fullReasoning = ""

  ;(async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (isStaticExport && effectiveKey) {
        headers["Authorization"] = `Bearer ${effectiveKey}`
      }

      const payload = isStaticExport
        ? {
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            top_p: 0.95,
            max_tokens: 8192,
            stream: true,
            ...(options.enableThinking ? { chat_template_kwargs: { enable_thinking: true } } : {}),
          }
        : {
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            enableThinking: options.enableThinking ?? true,
            apiKey: apiKey || undefined,
          }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status} ${response.statusText}`
        try {
          const errJson = await response.json()
          if (errJson?.error?.message) {
            errorDetail = errJson.error.message
          } else if (errJson?.error) {
            errorDetail = typeof errJson.error === "string" ? errJson.error : JSON.stringify(errJson.error)
          } else if (errJson?.message) {
            errorDetail = errJson.message
          }
        } catch {
          // fallback to status text
        }
        throw new Error(errorDetail)
      }

      if (!response.body) {
        throw new Error("No response stream received from chat API.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith("data:")) continue
          const dataPayload = trimmed.replace(/^data:\s*/, "")

          if (dataPayload === "[DONE]") {
            continue
          }

          try {
            const parsed = JSON.parse(dataPayload)
            const delta = parsed.choices?.[0]?.delta

            if (!delta) continue

            // 1. Capture step-by-step reasoning / thinking
            if (delta.reasoning_content) {
              fullReasoning += delta.reasoning_content
              options.onReasoning?.(delta.reasoning_content)
            }

            // 2. Capture final response content
            if (delta.content) {
              fullContent += delta.content
              options.onContent?.(delta.content)
            }
          } catch {
            // Partial JSON chunk, will resolve on next line
          }
        }
      }

      options.onFinish?.(fullContent, fullReasoning)
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        options.onFinish?.(fullContent, fullReasoning)
        return
      }
      console.error("Streaming error in client chat:", err)
      options.onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  })()

  return {
    abort: () => controller.abort(),
  }
}
