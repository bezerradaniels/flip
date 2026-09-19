import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWhatsAppUrl, calculateCouponDiscount, formatPhone, getDiscountedProductPrice, getProductPrice, onlyDigits, slugify, toWhatsAppNumber, validatePhone } from './format.js'

test('slugify normaliza acentos e espaços', () => {
  assert.equal(slugify('Copo Térmico 500 ml'), 'copo-termico-500-ml')
})

test('getProductPrice respeita o preço da variação', () => {
  assert.equal(getProductPrice({ price: 59.9 }, { price_override: 64.9 }), 64.9)
  assert.equal(getProductPrice({ price: 59.9 }, { price_override: null }), 59.9)
})

test('cupom percentual altera o preço exibido e o total', () => {
  const coupon = { type: 'percentage', value: 10 }
  assert.equal(getDiscountedProductPrice(59.9, coupon), 53.91)
  assert.equal(calculateCouponDiscount(119.8, coupon), 11.98)
})

test('cupom fixo é limitado ao total e não distorce preços unitários do catálogo', () => {
  const coupon = { type: 'fixed', value: 20 }
  assert.equal(getDiscountedProductPrice(59.9, coupon), 59.9)
  assert.equal(calculateCouponDiscount(15, coupon), 15)
})

test('onlyDigits remove a máscara do WhatsApp', () => {
  assert.equal(onlyDigits('+55 (77) 98634-0542'), '5577986340542')
})

test('buildWhatsAppUrl inclui o resumo do pedido sem montar query inválida', () => {
  const url = buildWhatsAppUrl('5577999999999', {
    storeName: 'Flip', customerName: 'Ana', customerPhone: '(77) 99999-9999', total: 20, discount: 0,
    items: [{ name: 'Copo', variantName: 'Verde', quantity: 2, unitPrice: 10 }],
  })
  assert.match(url, /^https:\/\/wa\.me\/5577999999999\?text=/)
  assert.match(decodeURIComponent(url), /2x Copo \(Verde\)/)
})

test('formatPhone aplica a máscara de celular e fixo', () => {
  assert.equal(formatPhone('77986345421'), '(77) 98634-5421')
  assert.equal(formatPhone('7734811234'), '(77) 3481-1234')
  assert.equal(formatPhone('5577986345421'), '(77) 98634-5421')
  assert.equal(formatPhone('779'), '(77) 9')
  assert.equal(formatPhone(''), '')
})

test('validatePhone aceita números válidos e explica os inválidos', () => {
  assert.equal(validatePhone('(77) 98634-5421'), '')
  assert.equal(validatePhone('+55 77 98634-5421'), '')
  assert.equal(validatePhone('(77) 3481-1234'), '')
  assert.equal(validatePhone('', { required: true }), 'Informe o número com DDD.')
  assert.equal(validatePhone(''), '')
  assert.match(validatePhone('7798634'), /incompleto/)
  assert.match(validatePhone('42354252436524'), /longo demais/)
  assert.match(validatePhone('557798634542'), /fixo/)
  assert.match(validatePhone('77886345421'), /Celular/)
  assert.match(validatePhone('07986345421'), /DDD/)
})

test('toWhatsAppNumber adiciona o código do país', () => {
  assert.equal(toWhatsAppNumber('(77) 98634-5421'), '5577986345421')
  assert.equal(toWhatsAppNumber('5577986345421'), '5577986345421')
  assert.equal(toWhatsAppNumber(''), '')
})
