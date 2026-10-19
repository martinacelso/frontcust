export async function bookingRequest(path, body, method = 'POST') {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
        const options = { credentials: 'same-origin', signal: controller.signal }
        if (body !== undefined) {
            const response = await fetch('/api/auth/csrf', options)
            if (!response.ok) return { error: 'Please sign in again.', status: response.status }
            const token = await response.json()
            if (!token.csrfToken) return { error: 'Unable to verify your session.' }
            options.method = method
            options.headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': token.csrfToken }
            options.body = JSON.stringify(body)
        }
        const response = await fetch('/api' + path, options)
        const result = await response.json()
        return response.ok ? { ...result, ok: true } : { error: result.error || 'Request failed. Please refresh and try again.', status: response.status }
    } catch {
        return { error: body === undefined ? 'Unable to load data. Check the backend connection.' : 'The result could not be confirmed. Retry this action or check My bookings before starting another reservation.' }
    } finally { clearTimeout(timer) }
}

export function accountBooking(b) {
    return {
        id: b.id, type: b.type, in: b.checkIn, out: b.checkOut, g: b.adults + b.children,
        adults: b.adults, children: b.children, requests: b.requests,
        st: b.status, note: b.requests, total: b.totalCents / 100, roomCharge: b.totalCents / 100,
        paid: b.paidCents / 100, deposit: b.depositCents / 100, holdUntil: b.holdUntil,
        version: b.version, simulation: b.simulatedPayment, settlement: b.simulatedSettlement, refund: b.simulatedRefund,
        extras: [], disc: 0, refunded: (b.refundedCents || 0) / 100, archived: b.archived
    }
}
export const bookingStatus = (b, now = Date.now()) => b.st === 'pending-payment' && Date.parse(b.holdUntil) <= now ? 'expired' : b.st
export const STATUS_LABELS = { 'pending-payment': 'Awaiting payment', confirmed: 'Confirmed', 'checked-in': 'Checked in', 'checked-out': 'Checked out', cancelled: 'Cancelled', expired: 'Expired' }
