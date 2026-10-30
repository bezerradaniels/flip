import assert from 'node:assert/strict'
import test from 'node:test'
import { validateProductForm } from './productForm.js'
import { friendlyError } from './saveErrors.js'

const validForm = { name: 'Caneca Rogai', category_id: 'cat-1', price: '14', has_variations: false, variationGroups: [], variants: [] }

test('produto completo passa na validação', () => {
  assert.equal(validateProductForm(validForm), null)
})

test('preço vazio ou zero leva à aba de preço', () => {
  assert.equal(validateProductForm({ ...validForm, price: '' }).section, 'price')
  assert.equal(validateProductForm({ ...validForm, price: '0' }).section, 'price')
})

test('título e categoria faltando levam à aba geral', () => {
  assert.equal(validateProductForm({ ...validForm, name: ' a ' }).section, 'general')
  assert.equal(validateProductForm({ ...validForm, category_id: '' }).section, 'general')
})

test('variações ligadas sem opções levam à aba de estoque', () => {
  assert.equal(validateProductForm({ ...validForm, has_variations: true }).section, 'stock')
})

test('slug duplicado vira mensagem com instrução', () => {
  const error = { code: '23505', message: 'duplicate key value violates unique constraint "products_slug_key"' }
  assert.match(friendlyError(error).message, /Já existe outro produto com este slug/)
})

test('erro desconhecido é mantido como veio', () => {
  const error = new Error('falha de rede')
  assert.equal(friendlyError(error), error)
})
