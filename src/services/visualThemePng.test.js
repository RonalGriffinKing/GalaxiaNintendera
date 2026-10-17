import { describe, it, expect } from 'vitest'
import { pngWithThemeMetadata } from './visualThemePng'
import { DEFAULT_VISUAL_THEME, visualThemeExportManifest } from './visualThemes'
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII='
function chunks(url){const bytes=Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),output=[];for(let i=8;i<bytes.length;){const size=view.getUint32(i),type=String.fromCharCode(...bytes.subarray(i+4,i+8));output.push({type,data:bytes.slice(i+8,i+8+size)});i+=size+12}return output}
describe('theme PNG metadata',()=>{
 it('preserves the image payload and adds UTF-8 theme snapshot before IEND',()=>{
  const manifest={...visualThemeExportManifest(DEFAULT_VISUAL_THEME,true),note:'Configuración Épica'}
  const before=chunks(png),after=chunks(pngWithThemeMetadata(png,manifest))
  expect(after.filter(c=>c.type!=='iTXt')).toEqual(before)
  expect(after.at(-1).type).toBe('IEND')
  const text=new TextDecoder().decode(after.find(c=>c.type==='iTXt').data)
  expect(JSON.parse(text.slice('galaxia.visualTheme\0\0\0\0\0'.length))).toEqual(manifest)
 })
 it('rejects unsupported images and oversized metadata',()=>{
  expect(()=>pngWithThemeMetadata('data:image/jpeg;base64,abc',{})).toThrow()
  expect(()=>pngWithThemeMetadata(png,{data:'a'.repeat(250001)})).toThrow()
 })
})
