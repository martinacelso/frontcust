import { useLayoutEffect, useRef, useState } from 'react'
import { digitsOnly, formats, formatDigits, caretAfterDigits, replaceDigits } from '../utils/digitFormatting'
export default function DigitInput({ value, onValueChange, mode = 'phone', type = 'tel', ...props }) {
  const input = useRef(null), caret = useRef(null)
  const [revision, setRevision] = useState(0)
  const display = formatDigits(value, mode), { limit } = formats[mode]
  function commit(raw, position) {
    caret.current = position
    onValueChange(mode === 'expiry' ? formatDigits(raw, mode) : raw)
    setRevision((n) => n + 1)
  }
  useLayoutEffect(() => {
    if (caret.current === null || document.activeElement !== input.current) return
    const at = caretAfterDigits(display, caret.current)
    input.current.setSelectionRange(at, at); caret.current = null
  }, [display, revision])
  return <input {...props} ref={input} type={type} inputMode="numeric" value={display}
    maxLength={formatDigits('9'.repeat(limit), mode).length}
    onChange={(e) => {
      const raw = digitsOnly(e.target.value, limit)
      commit(raw, Math.min(raw.length, digitsOnly(e.target.value.slice(0, e.target.selectionStart)).length))
    }}
    onPaste={(e) => {
      e.preventDefault()
      const edit = replaceDigits(display, e.currentTarget.selectionStart, e.currentTarget.selectionEnd, e.clipboardData.getData('text'), limit)
      commit(edit.raw, edit.caret)
    }}
    onKeyDown={(e) => {
      const at = e.currentTarget.selectionStart, end = e.currentTarget.selectionEnd
      if (at !== end) return
      const back = e.key === 'Backspace' && at > 0 && /\D/.test(display[at - 1])
      const forward = e.key === 'Delete' && at < display.length && /\D/.test(display[at])
      if (!back && !forward) return
      e.preventDefault()
      const raw = digitsOnly(display), count = digitsOnly(display.slice(0, at)).length, remove = back ? count - 1 : count
      if (remove >= 0 && remove < raw.length) commit(raw.slice(0, remove) + raw.slice(remove + 1), back ? count - 1 : count)
    }} />
}
