import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Você está em">
      <ol>
        {items.map((item, index) => (
          <li key={item.path || item.name}>
            {index < items.length - 1 ? <Link to={item.path}>{item.name}</Link> : <span aria-current="page">{item.name}</span>}
            {index < items.length - 1 && <ChevronRight size={14} aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </nav>
  )
}
