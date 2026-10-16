import { describe, expect, it } from 'vitest'
import { clipboardUrls } from './clipboardUrls'
describe('clipboard URLs', () => {
 it('trims a complete link and preserves signed query parameters', () => {
  expect(clipboardUrls(' https://cdn.example.org/image.jpg?token=abc&size=large ')).toBe('https://cdn.example.org/image.jpg?token=abc&size=large')
 })
 it('supports local assets without allowing protocol-relative or backslash URLs', () => {
  expect(clipboardUrls('/images/cover.png')).toBe('/images/cover.png')
  for(const value of ['//bad.example/image','/\\bad.example/image']) expect(()=>clipboardUrls(value)).toThrow()
 })
 it('rejects empty, incomplete, and executable clipboard contents', () => {
  for(const value of ['', 'not a URL', 'example.org', 'javascript:alert(1)', 'data:image/svg+xml,evil', 'file:///secret']) expect(()=>clipboardUrls(value)).toThrow()
 })
 it('rejects multiple links for a single field', () => expect(()=>clipboardUrls('https://a.example/a\nhttps://b.example/b')).toThrow())
 it('normalizes and deduplicates an explicit gallery list', () => expect(clipboardUrls('https://a.example/a\r\n\nhttps://b.example/b\nhttps://a.example/a',true)).toBe('https://a.example/a\nhttps://b.example/b'))
})
