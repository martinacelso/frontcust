import { localDate, validDate } from './validation.js'

export function checkInBookingError(booking, today = localDate()) {
  if (!booking || booking.st !== 'confirmed') return 'Only a confirmed reservation can be checked in.'
  if (!validDate(booking.in) || !validDate(booking.out) || booking.in >= booking.out) return 'Correct the reservation dates first.'
  if (today < booking.in) return 'Check-in is not available before the arrival date.'
  if (today >= booking.out) return 'This reservation has ended. Update its dates before checking in.'
  return ''
}

export function checkInError(booking, room, bookings, today = localDate()) {
  const bookingError = checkInBookingError(booking, today)
  if (bookingError) return bookingError
  if (!room) return 'Select a room first.'
  if (room.status !== 'available') return 'Choose a clean, available room.'
  if (room.type !== booking.type) return 'Choose the reserved room type. Change the reservation first for a different type.'
  if (bookings.some((b) => b.id !== booking.id && b.room === room.id &&
      (b.st === 'checked-in' || (b.st === 'confirmed' && b.in < booking.out && b.out > booking.in)))) {
    return 'This room is already assigned to another guest for this stay.'
  }
  return ''
}

export function checkOutError(booking, balance) {
  if (!booking || booking.st !== 'checked-in') return 'Only a checked-in guest can be checked out.'
  if (!Number.isFinite(balance)) return 'The balance is invalid. Review the bill first.'
  if (Math.round(balance * 100) > 0) return 'Settle the outstanding balance before checkout.'
  return ''
}

export function cancelError(booking) {
  return booking?.st === 'confirmed' ? '' : 'Only a confirmed reservation can be cancelled.'
}

export function billingActionError(booking) {
  return booking && ['confirmed', 'checked-in'].includes(booking.st)
    ? '' : 'Choose an active reservation. Cancelled and checked-out bills cannot be changed.'
}

export function deleteRoomError(room, bookings) {
  if (!room) return 'This room no longer exists.'
  if (room.status === 'occupied') return 'An occupied room cannot be deleted.'
  if (bookings.some((b) => b.room === room.id)) return 'This room has reservation history. Keep it to preserve those records.'
  return ''
}

export function roomStatusError(room, status, bookings, today = localDate()) {
  if (!room) return 'This room no longer exists.'
  if (!['available', 'dirty', 'maintenance', 'occupied'].includes(status)) return 'Choose a valid room status.'
  const occupied = bookings.some((b) => b.room === room.id && b.st === 'checked-in')
  if (occupied && status !== 'occupied') return 'Check out the guest before changing the occupied room status.'
  if (!occupied && status === 'occupied') return 'Use the Check in button to mark a room occupied.'
  if (status === 'maintenance' && bookings.some((b) => b.room === room.id && b.st === 'confirmed' && b.out > today)) return 'Reassign upcoming reservations before placing this room in maintenance.'
  return ''
}
