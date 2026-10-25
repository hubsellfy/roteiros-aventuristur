import { describe, it, expect } from 'vitest'
import { formatPoiName } from './formatPoiName'

describe('formatPoiName', () => {
  it('FE-UTIL-POINAME-001: turns an Instagram-style handle into a readable name', () => {
    expect(formatPoiName('flower.and.coffee')).toBe('Flower and Coffee')
    expect(formatPoiName('padaria_do_ze')).toBe('Padaria do Ze')
  })

  it('FE-UTIL-POINAME-002: capitalises a name typed all in one case', () => {
    expect(formatPoiName('safari beer cafe')).toBe('Safari Beer Cafe')
    expect(formatPoiName('SAFARI BEER CAFÉ')).toBe('Safari Beer Café')
  })

  it('FE-UTIL-POINAME-003: leaves a name with its own mixed capitalisation alone', () => {
    expect(formatPoiName('Safari Beer Café')).toBe('Safari Beer Café')
    expect(formatPoiName("McDonald's")).toBe("McDonald's")
    expect(formatPoiName('Divino Café & Restaurante - Buffet Livre')).toBe('Divino Café & Restaurante - Buffet Livre')
  })

  it('FE-UTIL-POINAME-004: copes with empty values', () => {
    expect(formatPoiName(null)).toBe('')
    expect(formatPoiName('  ')).toBe('')
  })
})
