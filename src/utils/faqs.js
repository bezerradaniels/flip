export const MAX_FAQS = 20

// Perguntas frequentes prontas para salvar: sem itens vazios e no máximo 20.
export const cleanFaqs = (faqs) => (Array.isArray(faqs) ? faqs : [])
  .map((item) => ({ question: String(item?.question || '').trim(), answer: String(item?.answer || '').trim() }))
  .filter((item) => item.question && item.answer)
  .slice(0, MAX_FAQS)
