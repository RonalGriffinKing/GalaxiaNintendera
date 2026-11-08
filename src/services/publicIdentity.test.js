import { expect, it } from 'vitest'
import { safePublicName } from './publicIdentity'
it('keeps visible names and never substitutes an email for a public author label',()=>{
  expect(safePublicName('Alice')).toBe('Alice')
  expect(safePublicName('private@example.test','Alice')).toBe('Alice')
  expect(safePublicName(undefined,'private@example.test')).toBe('Usuario')
})
