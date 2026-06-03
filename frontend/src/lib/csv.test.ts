import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

const BOM = '﻿'

describe('toCsv', () => {
  it('prefixes a UTF-8 BOM', () => {
    const out = toCsv(['a'], [['1']])
    expect(out.startsWith(BOM)).toBe(true)
  })

  it('joins header and rows with CRLF', () => {
    const out = toCsv(['a', 'b'], [['1', '2'], ['3', '4']])
    expect(out).toBe(`${BOM}a,b\r\n1,2\r\n3,4`)
  })

  it('quotes fields containing commas', () => {
    const out = toCsv(['x'], [['a,b']])
    expect(out).toBe(`${BOM}x\r\n"a,b"`)
  })

  it('escapes embedded double quotes by doubling them', () => {
    const out = toCsv(['x'], [['she said "hi"']])
    expect(out).toBe(`${BOM}x\r\n"she said ""hi"""`)
  })

  it('quotes fields containing newlines', () => {
    const out = toCsv(['x'], [['line1\nline2']])
    expect(out).toBe(`${BOM}x\r\n"line1\nline2"`)
  })

  it('renders null and undefined as empty cells', () => {
    const out = toCsv(['a', 'b', 'c'], [[null, undefined, '']])
    expect(out).toBe(`${BOM}a,b,c\r\n,,`)
  })

  it('renders numbers without quoting', () => {
    const out = toCsv(['n'], [[42], [3.5]])
    expect(out).toBe(`${BOM}n\r\n42\r\n3.5`)
  })

  it('does not quote a plain string', () => {
    const out = toCsv(['x'], [['plain']])
    expect(out).toBe(`${BOM}x\r\nplain`)
  })
})
