const methods = ['GCash', 'Maya', 'Card', 'Bank Transfer']
export default function PaymentMethod({ value, onChange, name = 'demo-payment-method', disabled = false }) {
  return <fieldset disabled={disabled} style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16, margin: '16px 0' }}>
    <legend>Demo payment method</legend>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {methods.map((method) => <label key={method} style={{ padding: 8 }}>
        <input type="radio" name={name} checked={value === method} onChange={() => onChange(method)} /> {method}
      </label>)}
    </div>
    <p><small>Demo only: no payment details are collected and no money is charged or transferred.</small></p>
  </fieldset>
}
