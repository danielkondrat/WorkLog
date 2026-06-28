'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { calcEarnings } from '@/lib/utils'
import ThemeToggle from '@/components/ThemeToggle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  currency_symbol: z.string().min(1, 'Required').max(3, 'Max 3 chars'),
})
type ProfileForm = z.infer<typeof profileSchema>

interface JobOption {
  id: string
  name: string
  color: string
}

interface Props {
  profile: Profile | null
  email: string
  jobs: JobOption[]
}

type EntryRow = {
  date: string
  description: string | null
  hours: number
  start_time: string | null
  end_time: string | null
  is_paid: boolean
  job: { name: string; type: string; rate: number; color: string } | null
}

export default function SettingsClient({ profile, email, jobs }: Props) {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const [reportJobId, setReportJobId] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      currency_symbol: profile?.currency_symbol ?? '$',
    },
  })

  async function saveProfile(data: ProfileForm) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update(data).eq('id', user.id)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Profile saved')
    router.refresh()
  }

  async function fetchEntries() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('entries')
      .select('*, job:jobs(*)')
      .order('date', { ascending: false })
    if (error || !data) return null
    return data as EntryRow[]
  }

  async function exportCSV() {
    setExporting(true)
    const entries = await fetchEntries()
    if (!entries) { toast.error('Export failed'); setExporting(false); return }

    const currency = profile?.currency_symbol ?? '$'
    const rows = entries.map(e => {
      const earnings = e.job ? calcEarnings(e.hours, e.job.rate, e.job.type as 'hourly' | 'fixed') : 0
      return {
        Date: e.date,
        Job: e.job?.name ?? '',
        Description: e.description ?? '',
        Hours: e.hours,
        'Start Time': e.start_time ?? '',
        'End Time': e.end_time ?? '',
        'Rate Type': e.job?.type ?? '',
        Rate: e.job?.rate ?? '',
        [`Earnings (${currency})`]: earnings.toFixed(2),
        Status: e.is_paid ? 'Paid' : 'Unpaid',
      }
    })

    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worklog-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export downloaded')
    setExporting(false)
  }

  async function exportReport() {
    setPrinting(true)
    const entries = await fetchEntries()
    if (!entries) { toast.error('Failed to generate report'); setPrinting(false); return }

    const currency = profile?.currency_symbol ?? '$'
    const userName = profile?.full_name ?? 'Unknown'
    const generatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const selectedJob = jobs.find(j => j.id === reportJobId) ?? null
    const allVisible = selectedJob ? entries.filter(e => e.job?.name === selectedJob.name) : entries
    const visibleEntries = allVisible.filter(e => !e.is_paid)

    const totalHours = visibleEntries.reduce((s, e) => s + e.hours, 0)
    const totalEarnings = visibleEntries.reduce((s, e) =>
      s + (e.job ? calcEarnings(e.hours, e.job.rate, e.job.type as 'hourly' | 'fixed') : 0), 0)

    const jobMap: Record<string, { name: string; color: string; hours: number; earnings: number; count: number }> = {}
    visibleEntries.forEach(e => {
      if (!e.job) return
      const key = e.job.name
      if (!jobMap[key]) jobMap[key] = { name: e.job.name, color: e.job.color, hours: 0, earnings: 0, count: 0 }
      jobMap[key].hours += e.hours
      jobMap[key].earnings += calcEarnings(e.hours, e.job.rate, e.job.type as 'hourly' | 'fixed')
      jobMap[key].count++
    })
    const jobBreakdown = Object.values(jobMap).sort((a, b) => b.earnings - a.earnings)

    const byMonth: Record<string, EntryRow[]> = {}
    visibleEntries.forEach(e => {
      const key = e.date.slice(0, 7)
      if (!byMonth[key]) byMonth[key] = []
      byMonth[key].push(e)
    })
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const fmt = (ym: string) => { const [y,m] = ym.split('-'); return `${MONTHS[+m-1]} ${y}` }

    const jobRows = jobBreakdown.map(j => `
      <tr>
        <td><span style="display:inline-flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${j.color};flex-shrink:0;display:inline-block;"></span>
          ${j.name}
        </span></td>
        <td style="text-align:center;">${j.count}</td>
        <td style="text-align:right;">${j.hours.toFixed(2)}h</td>
        <td style="text-align:right;font-weight:600;">${currency}${j.earnings.toFixed(2)}</td>
      </tr>`).join('')

    const entryRows = Object.entries(byMonth).map(([month, mes]) => {
      const mh = mes.reduce((s, e) => s + e.hours, 0)
      const me = mes.reduce((s, e) => s + (e.job ? calcEarnings(e.hours, e.job.rate, e.job.type as 'hourly' | 'fixed') : 0), 0)
      const rows = mes.map(e => {
        const earn = e.job ? calcEarnings(e.hours, e.job.rate, e.job.type as 'hourly' | 'fixed') : 0
        return `<tr>
          <td style="color:#6b7280;">${e.date}</td>
          <td><span style="display:inline-flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${e.job?.color ?? '#6366f1'};flex-shrink:0;display:inline-block;"></span>
            ${e.job?.name ?? '—'}
          </span></td>
          <td style="color:#6b7280;">${e.description ?? '—'}</td>
          <td style="text-align:right;">${e.hours.toFixed(2)}h</td>
          <td style="text-align:right;font-weight:600;color:#4f46e5;">${currency}${earn.toFixed(2)}</td>
        </tr>`
      }).join('')
      return `
        <tr style="background:#f9fafb;">
          <td colspan="3" style="padding:10px 10px 6px;font-size:12px;font-weight:700;color:#374151;border-bottom:2px solid #e5e7eb;letter-spacing:0.02em;">${fmt(month)}</td>
          <td style="text-align:right;padding:10px 10px 6px;font-size:12px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">${mh.toFixed(2)}h</td>
          <td style="text-align:right;padding:10px 10px 6px;font-size:12px;font-weight:600;color:#4f46e5;border-bottom:2px solid #e5e7eb;">${currency}${me.toFixed(2)}</td>
        </tr>${rows}`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Outstanding Hours — ${userName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;background:#fff;font-size:13px;line-height:1.5;}
  .page{max-width:860px;margin:0 auto;padding:48px 40px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;}
  .brand{display:flex;align-items:center;gap:12px;}
  .brand-icon{width:40px;height:40px;background:#4f46e5;border-radius:10px;display:flex;align-items:center;justify-content:center;}
  .brand-icon svg{display:block;}
  .brand-text h1{font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px;}
  .brand-text p{font-size:12px;color:#6b7280;margin-top:1px;}
  .meta{text-align:right;font-size:12px;color:#6b7280;line-height:1.8;}
  .meta strong{color:#374151;}
  .accent-bar{height:3px;background:linear-gradient(90deg,#4f46e5,#7c3aed);border-radius:99px;margin-bottom:28px;}
  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:32px;}
  .stat{border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;background:#fafafa;}
  .stat-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;margin-bottom:5px;}
  .stat-value{font-size:20px;font-weight:800;color:#111827;}
  .stat-value.indigo{color:#4f46e5;}
  .stat-value.amber{color:#d97706;}
  .section{margin-bottom:30px;}
  .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #f3f4f6;}
  table{width:100%;border-collapse:collapse;}
  th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;padding:8px 10px;text-align:left;border-bottom:2px solid #e5e7eb;}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;}
  tbody tr:last-child td{border-bottom:none;}
  .footer{margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;color:#9ca3af;font-size:10px;}
  .print-bar{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid #e5e7eb;padding:10px 40px;display:flex;justify-content:flex-end;gap:10px;}
  .btn-print{display:inline-flex;align-items:center;gap:7px;padding:8px 18px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}
  .btn-print:hover{background:#4338ca;}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .page{padding:24px 28px;}
    .stat{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fafafa!important;}
    .accent-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .print-bar{display:none;}
  }
</style>
</head>
<body>
<div class="print-bar">
  <button class="btn-print" onclick="window.print()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
    Print / Save as PDF
  </button>
</div>
<div class="page">
  <div class="header">
    <div class="brand">
      <div class="brand-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <div class="brand-text">
        <h1>WorkLog</h1>
        <p>Outstanding Hours${selectedJob ? ` &mdash; ${selectedJob.name}` : ''}</p>
      </div>
    </div>
    <div class="meta">
      <div><strong>Prepared by:</strong> ${userName}</div>
      <div><strong>Generated:</strong> ${generatedDate}</div>
      <div><strong>Unpaid entries:</strong> ${visibleEntries.length}</div>
    </div>
  </div>

  <div class="accent-bar"></div>

  <div class="summary">
    <div class="stat">
      <div class="stat-label">Hours Owed</div>
      <div class="stat-value">${totalHours.toFixed(2)}<span style="font-size:13px;font-weight:500;color:#9ca3af;">h</span></div>
    </div>
    <div class="stat">
      <div class="stat-label">Amount Owed</div>
      <div class="stat-value indigo">${currency}${totalEarnings.toFixed(2)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Unpaid Entries</div>
      <div class="stat-value amber">${visibleEntries.length}</div>
    </div>
  </div>

  ${jobBreakdown.length > 1 ? `
  <div class="section">
    <div class="section-title">By Job</div>
    <table>
      <thead><tr>
        <th>Job</th>
        <th style="text-align:center;">Entries</th>
        <th style="text-align:right;">Hours</th>
        <th style="text-align:right;">Owed</th>
      </tr></thead>
      <tbody>${jobRows}</tbody>
    </table>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Unpaid Entries</div>
    ${visibleEntries.length === 0
      ? '<p style="color:#9ca3af;font-size:13px;padding:16px 0;">No unpaid entries — all caught up!</p>'
      : `<table>
      <thead><tr>
        <th>Date</th>
        <th>Job</th>
        <th>Description</th>
        <th style="text-align:right;">Hours</th>
        <th style="text-align:right;">Owed</th>
      </tr></thead>
      <tbody>${entryRows}</tbody>
    </table>`}
  </div>

  <div class="footer">
    <span>WorkLog &mdash; generated ${new Date().toISOString().replace('T',' ').slice(0,19)} UTC</span>
    <span>Confidential &mdash; do not distribute</span>
  </div>
</div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Allow popups to open the report')
      setPrinting(false)
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    setPrinting(false)
  }

  async function generateImage() {
    setSavingImage(true)
    const entries = await fetchEntries()
    if (!entries) { toast.error('Failed to generate image'); setSavingImage(false); return }

    const currency = profile?.currency_symbol ?? '$'
    const userName = profile?.full_name ?? 'Unknown'
    const selectedJob = jobs.find(j => j.id === reportJobId) ?? null
    const allVisible = selectedJob ? entries.filter(e => e.job?.name === selectedJob.name) : entries
    const unpaid = allVisible.filter(e => !e.is_paid)

    const totalHours = unpaid.reduce((s, e) => s + e.hours, 0)
    const totalEarnings = unpaid.reduce((s, e) =>
      s + (e.job ? calcEarnings(e.hours, e.job.rate, e.job.type as 'hourly' | 'fixed') : 0), 0)

    const DPR = 2
    const W = 390
    const PAD = 20
    const ROW_H = 50

    // Layout constants
    const HEADER_H = 90
    const GAP = 14
    const SUMMARY_H = 72
    const SECTION_LABEL_H = 22
    const TABLE_HEAD_H = 28
    const SEP = 1
    const TOTAL_ROW_H = 44
    const FOOTER_H = 36

    const H = HEADER_H + GAP + SUMMARY_H + GAP + SECTION_LABEL_H + TABLE_HEAD_H + SEP + unpaid.length * ROW_H + TOTAL_ROW_H + GAP + FOOTER_H

    const canvas = document.createElement('canvas')
    canvas.width = W * DPR
    canvas.height = H * DPR
    const ctx = canvas.getContext('2d')!
    ctx.scale(DPR, DPR)

    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // Header (indigo)
    ctx.fillStyle = '#4f46e5'
    ctx.fillRect(0, 0, W, HEADER_H)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText('WorkLog', PAD, 32)

    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = '12px sans-serif'
    ctx.fillText(`Outstanding Hours${selectedJob ? ` — ${selectedJob.name}` : ''}`, PAD, 54)
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    ctx.fillText(dateStr, PAD, 74)

    // Summary box
    const SY = HEADER_H + GAP
    ctx.fillStyle = '#f3f4f6'
    rr(PAD, SY, W - PAD * 2, SUMMARY_H, 12)
    ctx.fill()

    const MID = W / 2

    // Left: amount owed
    ctx.fillStyle = '#9ca3af'
    ctx.font = 'bold 10px sans-serif'
    ctx.fillText('AMOUNT OWED', PAD + 12, SY + 18)
    ctx.fillStyle = '#4f46e5'
    ctx.font = 'bold 26px sans-serif'
    ctx.fillText(`${currency}${totalEarnings.toFixed(2)}`, PAD + 12, SY + 52)

    // Divider
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(MID, SY + 14)
    ctx.lineTo(MID, SY + SUMMARY_H - 14)
    ctx.stroke()

    // Right: hours
    ctx.textAlign = 'right'
    ctx.fillStyle = '#9ca3af'
    ctx.font = 'bold 10px sans-serif'
    ctx.fillText('HOURS OWED', W - PAD - 12, SY + 18)
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 26px sans-serif'
    const hText = `${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h`
    ctx.fillText(hText, W - PAD - 12, SY + 52)
    ctx.textAlign = 'left'

    // Section label
    const SLY = SY + SUMMARY_H + GAP
    ctx.fillStyle = '#9ca3af'
    ctx.font = 'bold 10px sans-serif'
    ctx.fillText('UNPAID ENTRIES', PAD, SLY + 12)

    // Table header
    const THY = SLY + SECTION_LABEL_H
    ctx.fillStyle = '#9ca3af'
    ctx.font = 'bold 10px sans-serif'
    ctx.fillText('DATE', PAD, THY + 12)
    ctx.fillText('JOB', PAD + 86, THY + 12)
    ctx.textAlign = 'right'
    ctx.fillText('HRS', W - PAD - 66, THY + 12)
    ctx.fillText('AMOUNT', W - PAD, THY + 12)
    ctx.textAlign = 'left'

    // Separator
    const SEPY = THY + TABLE_HEAD_H
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, SEPY)
    ctx.lineTo(W - PAD, SEPY)
    ctx.stroke()

    // Entry rows
    const ROWSY = SEPY + 6
    if (unpaid.length === 0) {
      ctx.fillStyle = '#9ca3af'
      ctx.font = '13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No unpaid entries', W / 2, ROWSY + 28)
      ctx.textAlign = 'left'
    } else {
      unpaid.forEach((e, i) => {
        const ry = ROWSY + i * ROW_H
        const earnings = e.job ? calcEarnings(e.hours, e.job.rate, e.job.type as 'hourly' | 'fixed') : 0

        if (i % 2 === 1) {
          ctx.fillStyle = '#f9fafb'
          ctx.fillRect(PAD, ry - 4, W - PAD * 2, ROW_H)
        }

        // Date
        const parts = e.date.split('-')
        ctx.fillStyle = '#374151'
        ctx.font = '13px sans-serif'
        ctx.fillText(`${parts[1]}/${parts[2]}`, PAD, ry + 16)
        ctx.fillStyle = '#9ca3af'
        ctx.font = '10px sans-serif'
        ctx.fillText(parts[0], PAD, ry + 32)

        // Color dot
        ctx.fillStyle = e.job?.color ?? '#6366f1'
        ctx.beginPath()
        ctx.arc(PAD + 88, ry + 12, 4, 0, Math.PI * 2)
        ctx.fill()

        // Job name
        ctx.fillStyle = '#111827'
        ctx.font = '13px sans-serif'
        const jn = e.job?.name ?? '—'
        ctx.fillText(jn.length > 13 ? jn.slice(0, 12) + '…' : jn, PAD + 98, ry + 16)

        // Description
        if (e.description) {
          ctx.fillStyle = '#9ca3af'
          ctx.font = '11px sans-serif'
          const desc = e.description.length > 17 ? e.description.slice(0, 16) + '…' : e.description
          ctx.fillText(desc, PAD + 98, ry + 32)
        }

        // Hours
        ctx.fillStyle = '#374151'
        ctx.font = '13px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`${e.hours % 1 === 0 ? e.hours : e.hours.toFixed(1)}h`, W - PAD - 66, ry + 16)
        ctx.textAlign = 'left'

        // Earnings
        ctx.fillStyle = '#4f46e5'
        ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`${currency}${earnings.toFixed(2)}`, W - PAD, ry + 16)
        ctx.textAlign = 'left'
      })
    }

    // Total row
    const TOTY = ROWSY + unpaid.length * ROW_H + 8
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, TOTY)
    ctx.lineTo(W - PAD, TOTY)
    ctx.stroke()

    ctx.fillStyle = '#111827'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText('Total', PAD, TOTY + 22)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#374151'
    ctx.fillText(`${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h`, W - PAD - 66, TOTY + 22)
    ctx.fillStyle = '#4f46e5'
    ctx.fillText(`${currency}${totalEarnings.toFixed(2)}`, W - PAD, TOTY + 22)
    ctx.textAlign = 'left'

    // Footer
    ctx.fillStyle = '#d1d5db'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`Prepared by ${userName} · WorkLog`, W / 2, H - 10)
    ctx.textAlign = 'left'

    canvas.toBlob(async (blob) => {
      if (!blob) { toast.error('Failed to create image'); setSavingImage(false); return }
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        toast.success('Image copied — paste it into a message!')
      } catch {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `worklog-summary-${new Date().toISOString().slice(0, 10)}.png`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Image downloaded!')
      }
      setSavingImage(false)
    }, 'image/png')
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Profile */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
        <form onSubmit={handleSubmit(saveProfile)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" className="h-11" {...register('full_name')} />
            {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="h-11 opacity-60" />
            <p className="text-xs text-gray-400">Email cannot be changed here</p>
          </div>
          <Button type="submit" disabled={isSubmitting} className="h-10 bg-indigo-600 hover:bg-indigo-700">
            {isSubmitting ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </div>

      {/* Preferences */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Preferences</h2>
        <form onSubmit={handleSubmit(saveProfile)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currency_symbol">Currency symbol</Label>
            <div className="flex gap-3 items-start">
              <Input
                id="currency_symbol"
                maxLength={3}
                placeholder="$"
                className="h-11 max-w-[80px]"
                {...register('currency_symbol')}
              />
              <div className="flex flex-col justify-center h-11">
                <p className="text-xs text-gray-400">e.g. $, &euro;, &pound;, &yen;</p>
              </div>
            </div>
            {errors.currency_symbol && <p className="text-xs text-red-500">{errors.currency_symbol.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting} className="h-10 bg-indigo-600 hover:bg-indigo-700">
            {isSubmitting ? 'Saving…' : 'Save preferences'}
          </Button>
        </form>
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
        <ThemeToggle />
      </div>

      {/* Export */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Export</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Download your data as CSV or generate a printable PDF report.
        </p>

        {/* Report job filter */}
        {jobs.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Report scope</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setReportJobId(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  reportJobId === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All jobs
              </button>
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setReportJobId(job.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    reportJobId === job.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: reportJobId === job.id ? 'white' : job.color }}
                  />
                  {job.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={exportCSV}
            disabled={exporting || printing || savingImage}
            variant="outline"
            className="h-10 gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>

          <Button
            onClick={exportReport}
            disabled={exporting || printing || savingImage}
            className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            {printing ? 'Generating…' : 'Export PDF'}
          </Button>

          <Button
            onClick={generateImage}
            disabled={exporting || printing || savingImage}
            variant="outline"
            className="h-10 gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            {savingImage ? 'Generating…' : 'Copy Image'}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          PDF and image show unpaid entries only. The PDF opens in a new tab — review it, then print or save as PDF. Copy Image copies a phone-ready summary to your clipboard to paste into a message.
        </p>
      </div>

      {/* Account */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Account</h2>
        <Separator className="mb-4" />
        <Button
          onClick={signOut}
          variant="outline"
          className="h-10 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:hover:bg-red-950"
        >
          Sign out
        </Button>
      </div>
    </motion.div>
  )
}
