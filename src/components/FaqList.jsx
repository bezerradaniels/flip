import { validFaqs } from '../seo/site.js'

// Perguntas frequentes em <details>: o texto fica no HTML (bom para buscadores
// e IAs) e o visitante abre só o que interessa.
export default function FaqList({ faqs, title = 'Perguntas frequentes', headingLevel = 'h2' }) {
  const items = validFaqs(faqs)
  if (!items.length) return null
  const Heading = headingLevel
  return (
    <section className="faq-section" aria-label={title}>
      <Heading>{title}</Heading>
      <div className="faq-list">
        {items.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
