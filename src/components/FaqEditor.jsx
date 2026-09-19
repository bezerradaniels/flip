import { CirclePlus, Trash2 } from 'lucide-react'
import { MAX_FAQS } from '../utils/faqs.js'

export default function FaqEditor({ value, onChange, disabled, hint }) {
  const faqs = value || []
  const update = (index, key, text) => onChange(faqs.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: text } : item)))
  const remove = (index) => onChange(faqs.filter((_, itemIndex) => itemIndex !== index))
  return (
    <div className="faq-editor">
      {hint && <p className="admin-hint">{hint}</p>}
      {faqs.map((item, index) => (
        <div className="faq-editor__item" key={index}>
          <label className="field"><span>Pergunta {index + 1}</span><input disabled={disabled} maxLength={200} value={item.question} onChange={(event) => update(index, 'question', event.target.value)} placeholder="Ex.: Qual é o prazo de envio?" /></label>
          <label className="field"><span>Resposta</span><textarea disabled={disabled} maxLength={1000} value={item.answer} onChange={(event) => update(index, 'answer', event.target.value)} placeholder="Responda de forma direta, em 1 a 3 frases." /></label>
          <button type="button" className="image-upload__remove" disabled={disabled} onClick={() => remove(index)}><Trash2 size={16} /> Remover pergunta</button>
        </div>
      ))}
      {faqs.length < MAX_FAQS && (
        <button type="button" className="button button--secondary faq-editor__add" disabled={disabled} onClick={() => onChange([...faqs, { question: '', answer: '' }])}>
          <CirclePlus size={16} /> Adicionar pergunta
        </button>
      )}
    </div>
  )
}
