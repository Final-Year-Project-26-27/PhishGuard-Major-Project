import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Where the FastAPI backend lives. For a deploy, set NEXT_PUBLIC_API_URL when building.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isHttpUrl(raw: string) {
  try {
    const { protocol } = new URL(raw)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

// Reported URLs are untrusted: refuse javascript:/data: and cut window.opener so the page can't tabnab us.
export function openExternal(raw: string) {
  if (isHttpUrl(raw)) window.open(raw, "_blank", "noopener,noreferrer")
}
