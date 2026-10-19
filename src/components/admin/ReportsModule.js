import { useRef, useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { bookingRequest, STATUS_LABELS } from '../../utils/bookingApi'

const money = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n / 100)
const today = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
export default function ReportsModule() {
  const { sessionUser } = useAdmin()
  if (sessionUser?.role !== 'admin') return <p role="alert">Administrator access required.</p>
  return <Reports key={sessionUser.id} />
}
function Reports() {
  const [from, setFrom] = useState(() => today().slice(0, 8) + '01')
  const [to, setTo] = useState(today)
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  async function generate(e) {
    e.preventDefault()
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setReport(null)
    try {
      const result = await bookingRequest(`/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      if (result.error) setError(result.error)
      else setReport(result)
    } finally { lock.current = false; setBusy(false) }
  }
  // ---- Bookings report ----
  const bookings = report?.bookings.map((r) => [STATUS_LABELS[r._id] || r._id, r.count, money(r.bookedCents)]) || []
  // ---- Occupancy report ----
  const occupancy = report?.occupancy.map((r) => [r.date, r.occupied ?? 'Not reported', r.rooms, r.percent === null ? '—' : r.percent + '%']) || []
  // ---- Revenue report ----
  const payments = report?.payments.map((r) => [r.date, r.kind, r.method, r.count, money(r.cents)]) || []
  // ---- Guests report ----
  const guests = report ? [['Unique booking account holders', report.uniqueGuestAccounts]] : []
  // ---- Check-in/out report ----
  const activity = report?.activity.map((r) => [r.date, r.checkIns, r.checkOuts]) || []
  const tables = [
    ['Bookings by scheduled arrival', ['Current status', 'Count', 'Booked value'], bookings],
    ['Payment activity', ['Date', 'Entry', 'Method', 'Count', 'Amount'], payments],
    ['Actual check-ins and check-outs', ['Date', 'Check-ins', 'Check-outs'], activity],
    ['Completed overnight occupancy', ['Night', 'Occupied rooms', 'Current room inventory', 'Occupancy'], occupancy],
    ['Guests by scheduled arrival', ['Metric', 'Count'], guests],
  ]
  function download() {
    const cell = (value) => '"' + String(value).replace(/^[=+@\t\r]/, "'$&").replaceAll('"', '""') + '"'
    const rows = [['Hotel report', report.from, report.to], ['Test transactions; no real money moved'],
      ['Recorded payments', money(report.paymentsCents)], ['Refunds', money(report.refundsCents)], ['Net payments', money(report.netCents)],
      ['Bookings use scheduled arrival dates; payments use recording dates; activity uses actual timestamps.'],
      ['Occupancy uses completed nights and current inventory. Guest count means booking account holders.'],
      ...tables.flatMap(([title, headers, body]) => [[], [title], headers, ...body])]
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `hotel-report-${report.from}-${report.to}.csv`
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <>
    <form onSubmit={generate} className="admin-row" style={{ gap: 12, flexWrap: 'wrap' }}>
      <label>From <input type="date" required value={from} disabled={busy} onChange={(e) => { setFrom(e.target.value); setReport(null) }} /></label>
      <label>To <input type="date" required value={to} disabled={busy} onChange={(e) => { setTo(e.target.value); setReport(null) }} /></label>
      <button className="admin-btn" disabled={busy}>{busy ? 'Generating…' : 'Generate report'}</button>
    </form>
    <p>Choose up to 90 days, including both dates. All dates use Philippine time.</p>
    {error && <p role="alert" className="acc-error">{error}</p>}
    {report && <>
      <p>Report: {report.from} to {report.to}. Generated {new Date(report.generatedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}.</p>
      <button className="admin-btn" onClick={download}>Download CSV</button>
      <div className="admin-stats">{[[report.paymentsCents, 'Recorded payments'], [report.refundsCents, 'Refunds'], [report.netCents, 'Net payments']].map(([amount, label]) => <div className="admin-stat" key={label}><b>{money(amount)}</b><span>{label}</span></div>)}</div>
      <p>Test transactions; no real money moved. Net payments are payments minus refunds, not earned revenue.</p>
      <p>Bookings use scheduled arrival dates and current statuses. Payments use recording dates, including refunds for cancelled bookings.</p>
      <p>Occupancy counts completed nights from actual check-in/out records, using current room inventory. Today and future nights are not reported.</p>
      <p>Guest count means unique account holders with confirmed, checked-in or checked-out bookings arriving in this range, not all accompanying guests.</p>
      {tables.map(([title, headers, rows]) => <section key={title}><h2 className="admin-h2">{title}</h2><div className="admin-table-wrap"><table className="admin-table">
        <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j}>{value}</td>)}</tr>)}
          {!rows.length && <tr><td colSpan={headers.length}>No records in this range.</td></tr>}</tbody>
      </table></div></section>)}
    </>}
  </>
}
