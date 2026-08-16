import { CreditCard, Instagram, Link as LinkIcon, Mail, MapPin, MessageCircle, Phone, Truck } from 'lucide-react'
import { useStore } from '../context/StoreContext.jsx'
import { onlyDigits } from '../utils/format.js'

export default function AboutPage() {
  const { settings } = useStore()
  return (
    <main className="about-page internal-page">
      <section className="about-card about-card--intro">
        {settings.logo_url ? <img src={settings.logo_url} alt="" /> : <span className="about-logo">F</span>}
        <span className="kicker">Sobre a {settings.name}</span>
        <h1>{settings.slogan}</h1>
        <p>{settings.about}</p>
        {settings.instagram_url && <a href={settings.instagram_url} target="_blank" rel="noreferrer"><Instagram size={18} /> Siga nossas novidades</a>}
      </section>
      <section className="about-card">
        <h2>Contato</h2>
        <div className="about-list">
          {settings.phone && <p><Phone /> {settings.phone}</p>}
          {settings.whatsapp && <a href={`https://wa.me/${onlyDigits(settings.whatsapp)}`} target="_blank" rel="noreferrer"><MessageCircle /> {settings.phone || settings.whatsapp}</a>}
          {settings.email && <a href={`mailto:${settings.email}`}><Mail /> {settings.email}</a>}
          {settings.address && <p><MapPin /> {settings.address}</p>}
        </div>
      </section>
      <section className="about-card">
        <h2>Formas de pagamento</h2>
        <div className="about-grid-list">{(settings.payment_methods || []).map((item) => <p key={item}><CreditCard /> {item}</p>)}</div>
      </section>
      <section className="about-card">
        <h2>Formas de entrega</h2>
        <div className="about-list">{(settings.delivery_methods || []).map((item) => <p key={item}><Truck /> {item}</p>)}</div>
        <small><LinkIcon size={14} /> Prazos e valores são combinados durante o atendimento.</small>
      </section>
    </main>
  )
}
