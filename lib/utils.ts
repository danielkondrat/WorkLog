import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatHours(hours: number): string {
  return hours.toFixed(2)
}

export function formatMoney(amount: number, symbol = '$'): string {
  return `${symbol}${amount.toFixed(2)}`
}

export function calcEarnings(hours: number, rate: number, type: 'hourly' | 'fixed'): number {
  if (type === 'hourly') return hours * rate
  return rate
}

export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

export function getMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function isInRange(dateStr: string, start: Date, end: Date): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date >= start && date <= end
}

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const JOB_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#64748B', '#78716C',
]
