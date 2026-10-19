import { vi } from 'vitest'

// Equal to fixture-clock.json `referenceNow`, so the mock rebases fixtures by 0
// and every fixture timestamp keeps its documented value.
export const FIXED_NOW = new Date('2026-07-27T12:00:00Z')

// Only Date is faked: MSW, debounce timers, and Testing Library's async
// utilities keep using real timers.
export function freezeClock() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXED_NOW)
}

export function restoreClock() {
  vi.useRealTimers()
}
