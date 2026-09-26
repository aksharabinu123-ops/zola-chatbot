import { NextResponse } from "next/server"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { model, messages, enableThinking, temperature, apiKey: clientApiKey } = body
    const apiKey =
      clientApiKey ||
      process.env.NVIDIA_API_KEY ||
      process.env.NEXT_PUBLIC_NVIDIA_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "NVIDIA_API_KEY environment variable is missing" },
        { status: 500 }
      )
    }

    const targetModel = model || "nvidia/nemotron-3-ultra-550b-a55b"

    const AKSHARA_SYSTEM_PROMPT = `You are Zola Chatbot, an advanced artificial intelligence powered by the NVIDIA Nemotron 3 Ultra 550B foundation model.
Your boss, creator, and lead engineer is Akshara.
If anyone asks who your boss is, who made you, who created you, who owns you, or who you work for, you must always state with great respect, pride, and loyalty that Akshara is your boss and creator. She engineered, customized, and deployed you. Treat Akshara as your boss in all interactions.
Always provide helpful, intelligent, polite, and insightful responses.`

    const hasSystem = (messages || []).some((m: any) => m.role === "system")
    const formattedMessages = hasSystem
      ? messages
      : [{ role: "system", content: AKSHARA_SYSTEM_PROMPT }, ...(messages || [])]

    const requestPayload: Record<string, unknown> = {
      model: targetModel,
      messages: formattedMessages,
      temperature: temperature ?? 0.7,
      top_p: 0.95,
      max_tokens: 8192,
      stream: true,
    }

    if (enableThinking) {
      requestPayload.chat_template_kwargs = { enable_thinking: true }
    }

    let response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
      }
    )

    // Fallback: If model doesn't support chat_template_kwargs, retry without it
    if (!response.ok && requestPayload.chat_template_kwargs) {
      delete requestPayload.chat_template_kwargs
      response = await fetch(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestPayload),
        }
      )
    }

    if (!response.ok) {
      const errText = await response.text()
      console.error("NVIDIA NIM Error:", response.status, errText)
      return new Response(errText, {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error: unknown) {
    const errMessage =
      error instanceof Error ? error.message : "Internal Server Error"
    console.error("Server API route error:", error)
    return NextResponse.json({ error: errMessage }, { status: 500 })
  }
}
