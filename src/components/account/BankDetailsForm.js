export default function BankDetailsForm({ value, onChange, disabled = false }) {
  function update(field, fieldValue) {
    onChange({ ...value, [field]: fieldValue })
  }

  return <fieldset disabled={disabled} style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16, margin: '16px 0' }}>
    <legend>Bank transfer details</legend>
    <div style={{ display: 'grid', gap: 12 }}>
      <label>Bank name
        <input type="text" autoComplete="off" maxLength={100} required value={value.bankName}
          onChange={(event) => update('bankName', event.target.value)} />
      </label>
      <label>Account holder name
        <input type="text" autoComplete="off" maxLength={100} required value={value.accountHolder}
          onChange={(event) => update('accountHolder', event.target.value)} />
      </label>
      <label>Bank account number
        <input type="text" inputMode="numeric" autoComplete="off" maxLength={39} required value={value.accountNumber}
          onChange={(event) => update('accountNumber', event.target.value)} />
      </label>
    </div>
    <p><small>Demo only: these details are encrypted when stored. No bank transfer is verified and no money is charged or moved.</small></p>
  </fieldset>
}
