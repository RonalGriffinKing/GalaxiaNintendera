// Pure local contract. No Firebase/Auth imports, network, filesystem or publication side effects.
const ORIGIN = 'https://galaxianintendera.com';
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const EMAIL = /[^\s@]+@[^\s@]+/u;
const ENCODED_LABEL = /%[0-9a-f]{2}|\\|&(?:#\d+;|#x[0-9a-f]+;|commat;|amp;)/iu;
const policies = new WeakMap();
export const NEUTRAL_EFFECT = Object.freeze({special:false,effectColor:'#a855f7',saga:''});
export const PUBLIC_PROFILE_KEYS = Object.freeze(['publicSchemaVersion','displayName','handle','avatarUrl','avatarEffect']);
export class PublicContractError extends Error {
  constructor(code) { super(code); this.name='PublicContractError'; this.code=code; }
}
export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype,null].includes(Object.getPrototypeOf(value));
// Do not execute getters or coercion supplied by a malformed input.
export const ownValue = (record,key) => {
  if(!isRecord(record))return undefined;
  const descriptor=Object.getOwnPropertyDescriptor(record,key);
  return descriptor && Object.hasOwn(descriptor,'value') ? descriptor.value : undefined;
};
const exactKeys = (record,keys) => isRecord(record) && Reflect.ownKeys(record).length===keys.length
  && keys.every(key=>Object.hasOwn(record,key)&&Object.hasOwn(Object.getOwnPropertyDescriptor(record,key),'value'));
export function safePublicLabel(value,max) {
  if(typeof value!=='string'||CONTROL.test(value)||ENCODED_LABEL.test(value)||EMAIL.test(value))return '';
  const label=value.normalize('NFC').trim();
  return label && label.length<=max ? label : '';
}
export function canonicalAssetPath(value) {
  if(typeof value!=='string'||!value||value.length>2048)return '';
  let decoded=value;
  try {
    for(let i=0;i<4&&decoded.includes('%');i++)decoded=decodeURIComponent(decoded);
  } catch { return ''; }
  if(decoded.includes('%')||CONTROL.test(decoded)||/[?#@\s\\]/u.test(decoded)
    ||/(?:^|\/)\.{1,2}(?:\/|$)/u.test(decoded))return '';
  try {
    const url=decoded.startsWith('/assets/')?new URL(decoded,ORIGIN):new URL(decoded);
    if(url.origin!==ORIGIN||url.username||url.password||url.search||url.hash
      ||!/^\/assets\/[a-zA-Z0-9_./-]+$/u.test(url.pathname))return '';
    return url.pathname;
  } catch { return ''; }
}
// Only a future trusted writer supplies this reviewed manifest. A host/path prefix alone is not approval.
export function createTrustedAssetPolicy(entries) {
  if(!Array.isArray(entries)||entries.length>10000)throw new PublicContractError('invalid-asset-manifest');
  const assets=new Map();
  for(const entry of entries){
    if(!exactKeys(entry,['path','special','effectColor','saga']))throw new PublicContractError('invalid-asset-entry');
    const path=canonicalAssetPath(entry.path);
    if(!path||typeof entry.special!=='boolean'||typeof entry.effectColor!=='string'
      ||!/^#[a-fA-F0-9]{6}$/u.test(entry.effectColor)||typeof entry.saga!=='string'
      ||(entry.saga!==''&&safePublicLabel(entry.saga,80)!==entry.saga)||assets.has(path))throw new PublicContractError('invalid-asset-entry');
    assets.set(path,Object.freeze({special:entry.special,effectColor:entry.effectColor,saga:entry.saga}));
  }
  const policy=Object.freeze({});policies.set(policy,assets);return policy;
}
const EMPTY_ASSETS=createTrustedAssetPolicy([]);
const assetMap = policy => {
  const assets=policies.get(policy);
  if(!assets)throw new PublicContractError('untrusted-asset-policy');
  return assets;
};
export function assertPublicProfile(document,{assetPolicy=EMPTY_ASSETS}={}) {
  if(!exactKeys(document,PUBLIC_PROFILE_KEYS)||document.publicSchemaVersion!==1
    ||typeof document.displayName!=='string'||safePublicLabel(document.displayName,120)!==document.displayName
    ||!document.displayName||typeof document.handle!=='string'||!document.handle
    ||safePublicLabel(document.handle,60)!==document.handle||typeof document.avatarUrl!=='string'
    ||!exactKeys(document.avatarEffect,['special','effectColor','saga']))throw new PublicContractError('invalid-public-profile');
  const assets=assetMap(assetPolicy);
  const expected=document.avatarUrl===''?NEUTRAL_EFFECT:assets.get(document.avatarUrl);
  if(!expected||(document.avatarUrl!==''&&canonicalAssetPath(document.avatarUrl)!==document.avatarUrl)
    ||Object.keys(NEUTRAL_EFFECT).some(key=>document.avatarEffect[key]!==expected[key]))throw new PublicContractError('invalid-public-avatar');
  if(Object.isFrozen(document)&&Object.isFrozen(document.avatarEffect))return document;
  // Immutable allowlisted snapshot, never retain a mutable Firestore DTO reference for future writes.
  return Object.freeze({publicSchemaVersion:1,displayName:document.displayName,handle:document.handle,
    avatarUrl:document.avatarUrl,avatarEffect:expected});
}
export function projectPublicProfile(privateUser,options={}) {
  if(!isRecord(privateUser))throw new PublicContractError('invalid-private-profile');
  if(ownValue(privateUser,'isBlocked')!==false)return null;
  if(!isRecord(options)||Reflect.ownKeys(options).some(key=>!['equippedIcon','publishHandle','assetPolicy'].includes(key)))throw new PublicContractError('invalid-projection-options');
  const policy=ownValue(options,'assetPolicy') ?? EMPTY_ASSETS;
  const assets=assetMap(policy);
  const equipped=ownValue(options,'equippedIcon');
  if(equipped!==undefined&&!isRecord(equipped))throw new PublicContractError('invalid-equipped-icon');
  const path=canonicalAssetPath(ownValue(equipped,'src'));
  const effect=assets.get(path);
  const displayName=safePublicLabel(ownValue(privateUser,'displayName'),120)||safePublicLabel(ownValue(privateUser,'name'),120)||'Usuario de Galaxia';
  const handle=ownValue(options,'publishHandle')===true?safePublicLabel(ownValue(privateUser,'username'),60):'';
  const document=Object.freeze({publicSchemaVersion:1,displayName,handle:handle||'Usuario de Galaxia',
    avatarUrl:effect?path:'',avatarEffect:effect||NEUTRAL_EFFECT});
  assertPublicProfile(document,{assetPolicy:policy});return document;
}
