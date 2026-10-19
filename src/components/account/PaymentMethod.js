import DigitInput from '../DigitInput'
const methods = ['GCash', 'Maya', 'Card', 'Bank Transfer']
export default function PaymentMethod({ value, onChange, details = {}, onDetailsChange, disabled = false }) {
  const field = (name, label, extra = {}) => <label style={{ display: 'grid', gap: 5 }}>
    {label}{['mobile', 'number', 'account', 'expiry', 'cvv'].includes(name)
      ? <DigitInput mode={({ mobile: 'phone', number: 'card', account: 'bank', expiry: 'expiry', cvv: 'cvv' })[name]} {...extra} value={details[name] || ''} onValueChange={(value) => onDetailsChange?.({ ...details, [name]: value })} autoComplete="off" />
      : <input value={details[name] || ''} onChange={(e) => onDetailsChange?.({ ...details, [name]: e.target.value })} autoComplete="off" {...extra} />}
  </label>
  return <fieldset disabled={disabled} style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16, margin: '16px 0' }}>
    <legend>Payment details</legend>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {methods.map((method) => <label key={method} style={{ padding: 8 }}>
        <input type="radio" name="booking-payment-method" checked={value === method} onChange={() => onChange(method)} /> {method}
      </label>)}
    </div>
    <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
      {['GCash', 'Maya'].includes(value) && field('mobile', `${value} mobile number`, { type: 'tel', inputMode: 'numeric', maxLength: 11, placeholder: '0911 222 1233' })}
      {['Card', 'Bank Transfer'].includes(value) && field('holder', 'Account holder name', { maxLength: 100 })}
      {value === 'Bank Transfer' && <>
        {field('bank', 'Bank name', { maxLength: 80, placeholder: 'Example Bank' })}
        {field('account', 'Bank account number', { inputMode: 'numeric', maxLength: 20 })}
      </>}
      {value === 'Card' && <>
        {field('number', 'Card number', { inputMode: 'numeric', maxLength: 19, placeholder: '4242 4242 4242 4242' })}
        {field('expiry', 'Expiry (MM/YY)', { inputMode: 'numeric', maxLength: 5, placeholder: '12/30' })}
        {field('cvv', 'Security code', { type: 'password', inputMode: 'numeric', maxLength: 4, placeholder: '123' })}
      </>}
    </div>
    <p><small>Payment information is recorded for this booking; no funds are transferred. Card numbers and security codes are not sent or saved.</small></p>
  </fieldset>
}
