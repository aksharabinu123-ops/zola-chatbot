import { defaultPreferences } from "@/lib/user-preference-store/utils"
import type { UserProfile } from "./types"

export async function getSupabaseUser() {
  return { supabase: null, user: null }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  return {
    id: "guest",
    email: "guest@zola.chat",
    display_name: "Guest",
    profile_image: "",
    anonymous: true,
    preferences: defaultPreferences,
  } as UserProfile
}
