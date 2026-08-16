import assert from 'node:assert/strict'
import test from 'node:test'
import { buildVariantCombinations, countVariantCombinations, getVariationGroups, VARIATION_PRESETS } from './variants.js'

test('gera o cruzamento entre cor, material e tamanho', () => {
  const groups = [
    { type: 'Cor', values: ['Preto', 'Branco'] },
    { type: 'Material', values: ['Madeira', 'Acrílico'] },
    { type: 'Tamanho', values: ['P', 'M'] },
  ]
  const variants = buildVariantCombinations(groups)

  assert.equal(countVariantCombinations(groups), 8)
  assert.equal(variants.length, 8)
  assert.deepEqual(variants[0].attributes, { Cor: 'Preto', Material: 'Madeira', Tamanho: 'P' })
  assert.equal(variants[0].name, 'Preto · Madeira · P')
})

test('preserva preço e estoque ao ampliar um cruzamento existente', () => {
  const variants = buildVariantCombinations(
    [{ type: 'Cor', values: ['Preto'] }, { type: 'Tamanho', values: ['P', 'M'] }],
    [{ name: 'Preto', attributes: { Cor: 'Preto' }, price_override: 49.9, stock: 3 }],
  )

  assert.equal(variants[0].price_override, 49.9)
  assert.equal(variants[1].stock, 3)
})

test('reconstrói os grupos a partir dos atributos salvos', () => {
  const product = {
    variation_type: 'Cor, Material',
    variants: [
      { attributes: { Cor: 'Preto', Material: 'Madeira' } },
      { attributes: { Cor: 'Branco', Material: 'Madeira' } },
    ],
  }

  assert.deepEqual(getVariationGroups(product), [
    { type: 'Cor', values: ['Preto', 'Branco'] },
    { type: 'Material', values: ['Madeira'] },
  ])
})

test('oferece personalizado como tipo sem misturar opções de tamanho', () => {
  const custom = VARIATION_PRESETS.find((preset) => preset.type === 'Personalizado')
  const size = VARIATION_PRESETS.find((preset) => preset.type === 'Tamanho')

  assert.deepEqual(custom.values, [])
  assert.equal(size.values.includes('Personalizado'), false)
})
