import { NVIDIA_MODELS } from "@/lib/local-chat-store"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ models: NVIDIA_MODELS })
}

export async function POST() {
  return NextResponse.json({
    message: "Models cache refreshed",
    models: NVIDIA_MODELS,
    count: NVIDIA_MODELS.length,
  })
}
