export const VARIATION_PRESETS = [
  { type: 'Cor', values: ['Preto', 'Branco', 'Vermelho', 'Verde', 'Azul', 'Amarelo', 'Rosa', 'Roxo', 'Laranja', 'Marrom', 'Dourado', 'Prata'] },
  { type: 'Tamanho', values: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Único'] },
  { type: 'Material', values: ['Papel', 'Vinil', 'Acrílico', 'MDF', 'Madeira', 'Cerâmica', 'Plástico', 'Metal', 'Tecido', 'Vidro'] },
  { type: 'Personalizado', values: [] },
]

export const MAX_VARIANT_COMBINATIONS = 120

const unique = (items) => [...new Set(items.filter(Boolean))]
const normalize = (value) => String(value || '').trim().toLocaleLowerCase('pt-BR')

export function getVariantAttributes(variant) {
  if (!variant?.attributes || Array.isArray(variant.attributes) || typeof variant.attributes !== 'object') return {}
  return Object.fromEntries(Object.entries(variant.attributes).filter(([type, value]) => type && value !== null && value !== undefined && String(value).trim()))
}

export function getVariantCombinationKey(variant) {
  const attributes = getVariantAttributes(variant)
  const entries = Object.entries(attributes)
  return entries.length
    ? entries.map(([type, value]) => `${type}:${value}`).join('|')
    : String(variant?.id || variant?.name || '')
}

function canonicalType(type) {
  return VARIATION_PRESETS.find((preset) => normalize(preset.type) === normalize(type))?.type || String(type || '').trim()
}

function parseTypeOrder(value) {
  return unique(String(value || '').split(/\s*(?:\||,|\+)\s*/).map(canonicalType))
}

export function getVariationGroups(product) {
  const variants = product?.variants || []
  const typeOrder = parseTypeOrder(product?.variation_type)
  const attributeTypes = unique(variants.flatMap((variant) => Object.keys(getVariantAttributes(variant))).map(canonicalType))
  const types = unique([...typeOrder.filter((type) => attributeTypes.includes(type)), ...attributeTypes])

  if (types.length) {
    return types.map((type) => ({
      type,
      values: unique(variants.map((variant) => getVariantAttributes(variant)[type]).map((value) => String(value || '').trim())),
    }))
  }

  const legacyType = typeOrder.length === 1 ? typeOrder[0] : ''
  if (legacyType && variants.length) {
    return [{ type: legacyType, values: unique(variants.map((variant) => variant.name?.trim())) }]
  }

  return []
}

export function countVariantCombinations(groups) {
  const activeGroups = groups.filter((group) => group.values.length)
  if (!activeGroups.length) return 0
  return activeGroups.reduce((total, group) => total * group.values.length, 1)
}

function combinationKey(attributes, typeOrder) {
  return typeOrder.map((type) => `${type}:${attributes[type] || ''}`).join('|')
}

function findTemplate(combination, typeOrder, variants) {
  const exactKey = combinationKey(combination, typeOrder)
  const exact = variants.find((variant) => combinationKey(getVariantAttributes(variant), typeOrder) === exactKey)
  if (exact) return exact

  return variants
    .map((variant) => {
      const attributes = getVariantAttributes(variant)
      const entries = Object.entries(attributes)
      const attributesMatch = entries.length && entries.every(([type, value]) => combination[type] === value)
      const legacyMatch = !entries.length && Object.values(combination).includes(variant.name)
      return { variant, score: attributesMatch ? entries.length : legacyMatch ? 1 : 0 }
    })
    .sort((a, b) => b.score - a.score)
    .find((item) => item.score)?.variant
}

export function buildVariantCombinations(groups, existingVariants = []) {
  const activeGroups = groups
    .map((group) => ({ type: canonicalType(group.type), values: unique(group.values.map((value) => String(value).trim())) }))
    .filter((group) => group.type && group.values.length)
  if (!activeGroups.length) return []

  const combinations = activeGroups.reduce(
    (current, group) => current.flatMap((combination) => group.values.map((value) => ({ ...combination, [group.type]: value }))),
    [{}],
  )
  const typeOrder = activeGroups.map((group) => group.type)

  return combinations.map((attributes) => {
    const template = findTemplate(attributes, typeOrder, existingVariants)
    return {
      id: template?.id,
      name: typeOrder.map((type) => attributes[type]).join(' · '),
      attributes,
      price_override: template?.price_override ?? '',
      stock: template?.stock ?? '',
    }
  })
}

export function hasStructuredVariants(variants = []) {
  return variants.some((variant) => Object.keys(getVariantAttributes(variant)).length)
}

export function findVariantForSelection(variants, currentVariant, type, value) {
  const desired = { ...getVariantAttributes(currentVariant), [type]: value }
  const desiredEntries = Object.entries(desired)
  return variants.find((variant) => {
    const attributes = getVariantAttributes(variant)
    return desiredEntries.every(([attributeType, attributeValue]) => attributes[attributeType] === attributeValue)
  }) || variants.find((variant) => getVariantAttributes(variant)[type] === value) || currentVariant
}
