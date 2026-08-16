import { MessageCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import { onlyDigits } from '../utils/format.js'

export default function WhatsAppFloat() {
  const { settings } = useStore()
  const location = useLocation()
  if (location.pathname.startsWith('/admin')) return null
  const text = encodeURIComponent(`Olá, ${settings.name}! Vim pelo catálogo e gostaria de tirar uma dúvida.`)
  return (
    <a className="whatsapp-float" href={`https://wa.me/${onlyDigits(settings.whatsapp)}?text=${text}`} target="_blank" rel="noreferrer" aria-label="Falar com a Flip no WhatsApp">
      <MessageCircle />
    </a>
  )
}
