import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'

export default function Brand({ to = '/', compact = false }) {
  const { settings } = useStore()
  return (
    <Link className={`brand ${compact ? 'brand--compact' : ''}`} to={to} aria-label={`${settings.name}, página inicial`}>
      {settings.logo_url
        ? <img className="brand__logo" src={settings.logo_url} alt="" />
        : <span className="brand__mark" aria-hidden="true">F</span>}
      <span>{settings.name}</span>
    </Link>
  )
}
