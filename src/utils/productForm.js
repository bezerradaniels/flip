// Os campos do editor ficam em abas e o navegador só valida os da aba aberta;
// por isso os obrigatórios são conferidos aqui, indicando a aba com problema.
export function validateProductForm(form) {
  if ((form.name || '').trim().length < 2) return { section: 'general', message: 'Informe o título do produto (mínimo de 2 letras).' }
  if (!form.category_id) return { section: 'general', message: 'Selecione a categoria do produto.' }
  if (form.price === '' || !(Number(form.price) > 0)) return { section: 'price', message: 'Informe o preço de venda, maior que R$ 0,00.' }
  if (form.has_variations && (!form.variationGroups.length || !form.variants.length)) {
    return { section: 'stock', message: 'Selecione ao menos um tipo e uma opção de variação.' }
  }
  return null
}
