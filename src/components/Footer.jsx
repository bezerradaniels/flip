import { CreditCard, FileText, Instagram, Mail, MapPin, Phone, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { policies } from '../content/policies.js'
import { useStore } from '../context/StoreContext.jsx'
import { activeCategories, categoryPath, policyPath } from '../seo/site.js'
import Brand from './Brand.jsx'

export default function Footer() {
  const { settings, categories } = useStore()
  const categoryLinks = activeCategories({ categories })
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
      {categoryLinks.length > 0 && (
        <nav aria-label="Categorias">
          <h3>Categorias</h3>
          {categoryLinks.map((category) => <Link key={category.id} to={categoryPath(category)}>{category.name}</Link>)}
        </nav>
      )}
      <nav aria-label="Institucional">
        <h3><FileText size={16} /> Institucional</h3>
        <Link to="/sobre">Sobre a {settings.name}</Link>
        {policies.map((policy) => <Link key={policy.slug} to={policyPath(policy)}>{policy.title}</Link>)}
      </nav>
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
