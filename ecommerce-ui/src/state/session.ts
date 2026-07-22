import { signal } from "@lit-labs/signals"
import { isServer } from "lit"
import type { AuthSessionDto } from "../services/types.js"

// Shared reactive app state → signals (data-and-state.md ladder, rung 4).
// A plain module IS the store.

const STORAGE_KEY = "railway.session"

// HYDRATION RULE: the first client render must match the server's exactly.
// The server cannot see localStorage, so it always renders signed-out — the
// signal therefore starts null on BOTH sides, and the stored session is
// restored only after hydration (app-shell.firstUpdated → restoreSession()).
export const session = signal<AuthSessionDto | null>(null)

export function restoreSession(): void {
  if (isServer) return
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw !== null) session.set(JSON.parse(raw) as AuthSessionDto)
}

export function signIn(next: AuthSessionDto): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  session.set(next)
}

export function signOut(): void {
  localStorage.removeItem(STORAGE_KEY)
  session.set(null)
}
