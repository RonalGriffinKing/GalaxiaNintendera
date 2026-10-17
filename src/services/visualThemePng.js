// Add UTF-8 iTXt metadata without decoding, resizing or repainting PNG pixels.
export function pngWithThemeMetadata(dataUrl, manifest) {
  if(!dataUrl.startsWith('data:image/png;base64,')) throw new Error('Se esperaba una imagen PNG.')
  const bytes=Uint8Array.from(atob(dataUrl.split(',')[1]),c=>c.charCodeAt(0))
  const text=new TextEncoder().encode(JSON.stringify(manifest))
  if(text.length>250000) throw new Error('La instantánea del tema es demasiado grande.')
  const prefix=new TextEncoder().encode('galaxia.visualTheme\0\0\0\0\0')
  const payload=new Uint8Array(prefix.length+text.length);payload.set(prefix);payload.set(text,prefix.length)
  const chunk=new Uint8Array(payload.length+12),view=new DataView(chunk.buffer)
  view.setUint32(0,payload.length);chunk.set(new TextEncoder().encode('iTXt'),4);chunk.set(payload,8)
  let crc=0xffffffff
  for(const byte of chunk.subarray(4,chunk.length-4)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  view.setUint32(chunk.length-4,(crc^0xffffffff)>>>0)
  const source=new DataView(bytes.buffer)
  let end=8
  while(end+12<=bytes.length){const length=source.getUint32(end);if(end+length+12>bytes.length)throw new Error('PNG incompleto.');if(String.fromCharCode(...bytes.subarray(end+4,end+8))==='IEND')break;end+=length+12}
  if(end+12>bytes.length)throw new Error('PNG sin cierre.')
  const output=new Uint8Array(bytes.length+chunk.length);output.set(bytes.subarray(0,end));output.set(chunk,end);output.set(bytes.subarray(end),end+chunk.length)
  let binary='';for(let i=0;i<output.length;i+=8192)binary+=String.fromCharCode(...output.subarray(i,i+8192))
  return 'data:image/png;base64,'+btoa(binary)
}
