import { CreditCard, Instagram, Mail, MapPin, Phone, Truck } from 'lucide-react'
import { useStore } from '../context/StoreContext.jsx'
import Brand from './Brand.jsx'

export default function Footer() {
  const { settings } = useStore()
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Brand />
        <p>{settings.slogan}</p>
      </div>
      <div>
        <h3><CreditCard size={16} /> Pagamento</h3>
        {(settings.payment_methods || []).map((method) => <p key={method}>{method}</p>)}
      </div>
      <div>
        <h3><Truck size={16} /> Entrega</h3>
        {(settings.delivery_methods || []).map((method) => <p key={method}>{method}</p>)}
      </div>
      <div>
        <h3>Contato</h3>
        {settings.phone && <a href={`tel:${settings.phone}`}><Phone size={15} /> {settings.phone}</a>}
        {settings.email && <a href={`mailto:${settings.email}`}><Mail size={15} /> {settings.email}</a>}
        {settings.address && <p><MapPin size={15} /> {settings.address}</p>}
        {settings.instagram_url && <a href={settings.instagram_url} target="_blank" rel="noreferrer"><Instagram size={15} /> Instagram</a>}
      </div>
      <small>© {new Date().getFullYear()} {settings.name}. Todos os direitos reservados.</small>
    </footer>
  )
}
