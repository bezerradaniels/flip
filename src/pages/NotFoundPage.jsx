import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="not-found internal-page">
      <span>404</span><h1>Essa página deu uma voltinha.</h1><p>Mas o catálogo continua logo ali.</p>
      <Link className="button button--primary" to="/"><ArrowLeft size={18} /> Voltar ao início</Link>
    </main>
  )
}
