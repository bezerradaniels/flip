// Troca as mensagens técnicas do banco e do Storage por instruções que o
// administrador consegue seguir.
export function friendlyError(error) {
  const text = `${error?.message || ''} ${error?.details || ''}`
  const has = (part) => text.includes(part)
  let message = null
  if (has('products_slug_key')) message = 'Já existe outro produto com este slug. Altere o campo Slug (ex.: acrescente a cor ou o modelo).'
  else if (has('categories_slug_key')) message = 'Já existe outra categoria com este slug.'
  else if (has('categories_name_key')) message = 'Já existe uma categoria com este nome.'
  else if (has('products_name_check')) message = 'O título do produto precisa ter entre 2 e 160 letras.'
  else if (has('categories_name_check')) message = 'O nome da categoria precisa ter entre 2 e 80 letras.'
  else if (has('product_variants_name_check')) message = 'O nome de uma variação ficou muito longo. Use opções mais curtas.'
  else if (has('row-level security') || has('JWT expired') || error?.code === '42501') message = 'Sua sessão expirou ou não tem permissão de administrador. Saia e entre novamente no painel.'
  else if (/mime type|invalid_mime_type/i.test(text)) message = 'Formato de imagem não aceito. Use fotos em JPG, PNG ou WebP.'
  else if (/maximum allowed size|Payload too large|entity too large/i.test(text)) message = 'Uma das fotos é grande demais (máximo de 5 MB). Reduza a imagem e tente novamente.'
  return message ? Object.assign(new Error(message), { cause: error }) : error
}
