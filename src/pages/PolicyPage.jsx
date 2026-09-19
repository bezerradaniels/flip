import { Link, useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { findPolicy, policies, POLICIES_UPDATED_AT } from '../content/policies.js'
import { useStore } from '../context/StoreContext.jsx'
import { policyPath } from '../seo/site.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function PolicyPage() {
  const { slug } = useParams()
  const { settings } = useStore()
  const policy = findPolicy(slug)
  if (!policy) return <NotFoundPage />

  return (
    <main className="internal-page policy-page">
      <Breadcrumbs items={[{ name: 'Início', path: '/' }, { name: policy.title, path: policyPath(policy) }]} />
      <article className="about-card policy-card">
        <span className="kicker">Políticas da {settings.name}</span>
        <h1>{policy.title}</h1>
        <p className="policy-card__summary">{policy.summary}</p>
        {policy.sections(settings).map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
            {(section.paragraphs || []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <small>Atualizado em {POLICIES_UPDATED_AT}.</small>
      </article>
      <nav className="policy-links" aria-label="Outras políticas">
        {policies.filter((item) => item.slug !== policy.slug).map((item) => <Link key={item.slug} to={policyPath(item)}>{item.title}</Link>)}
      </nav>
    </main>
  )
}
