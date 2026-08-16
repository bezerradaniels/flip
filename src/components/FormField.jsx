export default function FormField({ label, optional = false, error, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span>{label} {optional && <em>(opcional)</em>}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  )
}
