import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
let handler,fetchMock
const xuid='2533274792093122',token='Firebase_session_test_token_123456789',person={xuid,gamertag:'Player',gamerScore:'123'}
const reply=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...headers}})
const event=query=>({httpMethod:'GET',queryStringParameters:query,headers:{authorization:'Bearer '+token}})
beforeEach(async()=>{vi.resetModules();vi.stubEnv('OPENXBL_API_KEY','test-server-key');vi.stubEnv('FIREBASE_API_KEY','test-firebase-key');vi.stubEnv('FIREBASE_PROJECT_ID','test-project');fetchMock=vi.fn(async(url)=>{if(url.includes('accounts:lookup'))return reply({users:[{localId:'owner'}]});if(url.includes('firestore.googleapis.com'))return reply({fields:{socialLinks:{mapValue:{fields:{xbox:{mapValue:{fields:{xuid:{stringValue:xuid}}}}}}}}});if(url.includes('/search/'))return reply({content:{people:[person]}});if(url.endsWith('/account/'+xuid))return reply({content:{people:[person]}});if(url.endsWith('/presence/'+xuid))return reply({content:{xuid,state:'Offline'}});if(url.endsWith('/titles/'+xuid))return reply({content:{xuid,titles:[]}});throw Error('Unexpected destination')});vi.stubGlobal('fetch',fetchMock);handler=(await import('../../netlify/functions/xbox-profile.js')).handler})
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
const calls=()=>fetchMock.mock.calls.filter(call=>call[0].startsWith('https://api.xbl.io/v2'))
describe('Xbox server proxy',()=>{
 it('fails without Firebase configuration before sending requests',async()=>{vi.stubEnv('FIREBASE_API_KEY','');expect((await handler(event({uid:'owner'}))).statusCode).toBe(503);expect(fetchMock).not.toHaveBeenCalled()})
 it('requires a configured key and signed-in search',async()=>{delete process.env.OPENXBL_API_KEY;expect((await handler(event({gamertag:'Player'}))).statusCode).toBe(503);expect(fetchMock).not.toHaveBeenCalled();process.env.OPENXBL_API_KEY='test-server-key';expect((await handler({...event({gamertag:'Player'}),headers:{}})).statusCode).toBe(401);expect(calls()).toHaveLength(0)})
 it('rejects arbitrary URLs, XUIDs and invalid parameters',async()=>{for(const query of [{url:'https://evil.test'},{xuid},{gamertag:'../evil'},{uid:'../owner'},{gamertag:'Player',uid:'owner'}])expect((await handler(event(query))).statusCode).toBe(400);expect(fetchMock).not.toHaveBeenCalled()})
 it('validates the Firebase session before using the private key',async()=>{fetchMock.mockResolvedValueOnce(reply({},400));expect((await handler(event({gamertag:'Player'}))).statusCode).toBe(401);expect(calls()).toHaveLength(0)})
 it('previews, caches and deduplicates the fixed lookup paths',async()=>{const results=await Promise.all([handler(event({gamertag:'Player'})),handler(event({gamertag:'Player'}))]);expect(results.every(result=>result.statusCode===200)).toBe(true);expect(calls()).toHaveLength(3);expect(calls().map(call=>call[0]).sort()).toEqual(['/search/Player','/presence/'+xuid,'/titles/'+xuid].map(path=>'https://api.xbl.io/v2'+path).sort());expect(calls()[0][1].headers['X-Authorization']).toBe('test-server-key');expect(calls()[0][1].redirect).toBe('error');expect(results[0].body).not.toContain('test-server-key');expect(JSON.parse(results[0].body).playtime).toBeNull();await handler(event({gamertag:'Player'}));expect(calls()).toHaveLength(3)})
 it('only reads a publicly accessible saved link, rechecking Firebase even with cached Xbox data',async()=>{expect((await handler(event({uid:'owner'}))).statusCode).toBe(200);expect(calls()).toHaveLength(3);fetchMock.mockResolvedValueOnce(reply({},403));expect((await handler({...event({uid:'owner'}),headers:{}})).statusCode).toBe(403);expect(calls()).toHaveLength(3)})
 it('does not call OpenXBL when the profile has no saved link',async()=>{fetchMock.mockResolvedValueOnce(reply({fields:{}}));expect((await handler(event({uid:'owner'}))).statusCode).toBe(404);expect(calls()).toHaveLength(0)})
 it('honors provider throttling and never returns raw provider errors',async()=>{fetchMock.mockImplementation(async(url)=>url.includes('accounts:lookup')?reply({users:[{localId:'owner'}]}):reply({secret:'test-server-key'},429,{'Retry-After':'600'}));const first=await handler(event({gamertag:'Player'}));expect(first.statusCode).toBe(429);expect(first.body).not.toContain('test-server-key');await handler(event({gamertag:'Other'}));expect(calls()).toHaveLength(1)})
 it('keeps profile available when history or presence is private',async()=>{const base=fetchMock.getMockImplementation();fetchMock.mockImplementation((url,options)=>url.includes('/titles/')?Promise.resolve(reply({},403)):base(url,options));const result=await handler(event({gamertag:'Player'}));expect(result.statusCode).toBe(200);expect(JSON.parse(result.body).unavailable).toEqual(['history'])})
 it('restricts title diagnostics to the authenticated owner before any provider call',async()=>{
  expect((await handler({...event({uid:'owner',diagnostic:'images'}),headers:{}})).statusCode).toBe(401)
  expect((await handler(event({uid:'other',diagnostic:'images'}))).statusCode).toBe(403)
  expect((await handler(event({gamertag:'Player',diagnostic:'images'}))).statusCode).toBe(400)
  expect(calls()).toHaveLength(0)
 })
 it('returns original title samples only, strips credentials and reuses title cache',async()=>{
  const base=fetchMock.getMockImplementation()
  fetchMock.mockImplementation((url,options)=>url.includes('/titles/')?Promise.resolve(reply({content:{xuid,titles:[{type:'Game',titleId:1,name:'Missing',displayImage:'',images:[{url:'https://example.com/cover.jpg'}],token:'hidden'},{type:'Game',titleId:2,name:'Covered',displayImage:'https://example.com/2.jpg'},{type:'Game',titleId:3,name:'Private',titleHistory:{visible:false}}]}})):base(url,options))
  const result=await handler(event({uid:'owner',diagnostic:'images'}))
  expect(result.statusCode).toBe(200)
  const data=JSON.parse(result.body)
  expect(data.titleCount).toBe(2);expect(data.withImage.name).toBe('Covered');expect(data.withoutImage.images[0].url).toContain('cover.jpg')
  expect(result.body).not.toContain('hidden');expect(result.body).not.toContain('test-server-key');expect(result.body).not.toContain('Private')
  await handler(event({uid:'owner',diagnostic:'images'}));expect(calls()).toHaveLength(1)
 })

})
