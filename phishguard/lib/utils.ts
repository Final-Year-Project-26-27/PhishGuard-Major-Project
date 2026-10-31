import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Where the FastAPI backend lives. For a deploy, set NEXT_PUBLIC_API_URL when building.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
