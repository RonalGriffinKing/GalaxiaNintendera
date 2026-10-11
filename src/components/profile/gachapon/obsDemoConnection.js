// Local visual gate only. Never grants access to data or real rewards.
async function digest(password,salt) {
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits'])
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256)
 return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('')
}
export async function createObsDemoConnection(password) {
 if(password.length<4||password.length>128)throw Error('Usa una clave de 4 a 128 caracteres.')
 const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')
 const data={version:1,salt,hash:await digest(password,salt),expires:Date.now()+12*60*60*1000}
 return btoa(JSON.stringify(data)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')
}
export async function verifyObsDemoConnection(token,password) {
 let data;try{data=JSON.parse(atob(token.replaceAll('-','+').replaceAll('_','/')))}catch{throw Error('Enlace no valido. Genera uno nuevo.')}
 if(data.version!==1||!/^[a-f0-9]{32}$/.test(data.salt)||!/^[a-f0-9]{64}$/.test(data.hash)||!Number.isFinite(data.expires))throw Error('Enlace no valido.')
 if(Date.now()>data.expires)throw Error('El enlace ha caducado. Genera otro.')
 if(password.length<4||password.length>128||await digest(password,data.salt)!==data.hash)throw Error('Clave incorrecta. Intentalo de nuevo.')
 return true
}
