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

  it('neutralizes a formula-injection payload starting with =', () => {
    const out = toCsv(['title'], [[`=cmd|'/c calc'!A1`]])
    expect(out).toBe(`${BOM}title\r\n"'=cmd|'/c calc'!A1"`)
  })

  it('neutralizes every formula trigger (+ - @ tab CR)', () => {
    for (const trigger of ['+', '-', '@', '\t', '\r']) {
      const out = toCsv(['x'], [[`${trigger}SUM(A1)`]])
      const field = out.slice(BOM.length).split('\r\n')[1]
      expect(field).toBe(`"'${trigger}SUM(A1)"`)
    }
  })

  it('never lets a formula cell reach the output with a bare leading trigger', () => {
    const out = toCsv(['a', 'b'], [['=WEBSERVICE("http://x")', 'safe']])
    // No field may begin (start-of-record or after a comma) with a bare `=`.
    expect(out).not.toMatch(/(^|,)=/m)
  })

  it('does not neutralize a negative number', () => {
    const out = toCsv(['amount'], [[-5], [-3.5]])
    expect(out).toBe(`${BOM}amount\r\n-5\r\n-3.5`)
  })

  it('leaves an interior = untouched and unquoted', () => {
    const out = toCsv(['x'], [['a=b']])
    expect(out).toBe(`${BOM}x\r\na=b`)
  })
})
