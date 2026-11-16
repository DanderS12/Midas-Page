const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const classic = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m => !m[1].includes('type="module"') && !m[1].includes('src='))[0][2];
function app() {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/' });
  const w = dom.window;
  w.TextEncoder=TextEncoder;Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});
  w.matchMedia = () => ({ matches: true, addEventListener() {} });
  w.requestAnimationFrame = () => 1;w.cancelAnimationFrame = () => {};
  const ctx = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
  w.HTMLCanvasElement.prototype.getContext = () => ctx;
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();w.HTMLMediaElement.prototype.pause = () => {};w.HTMLMediaElement.prototype.load = () => {};
  w.URL.createObjectURL = () => 'blob:test';w.URL.revokeObjectURL = () => {};
  w.eval(classic.replace('\nroute();\n})();', `
    window.testing={state:state,route:route,pDM:pDM,pStory:pStory,pCreator:pCreator,pAdmin:pAdmin,adminCommunity:adminCommunity,directoryMember:directoryMember,entranceDigest:entranceDigest,
      entranceReady:function(){entranceReady=true;},
      setup:function(user,admin,adapter){me=user;isAdmin=admin;db=adapter;assets={upload:async function(){return {url:'data:image/jpeg;base64,test'};}};},
      recipient:function(uid){dmWith=uid;},roleClass:roleClass};
    route();
  })();`));
  return { w, doc: w.document, api: w.testing, close: () => w.close() };
}
function button(doc, label) { return [...doc.querySelectorAll('button')].find(x => x.textContent === label); }
const adapter = { collection: () => ({ onSnapshot: () => () => {}, doc: () => ({ set: async () => {}, update: async () => {} }) }), doc: () => ({ onSnapshot: () => () => {} }) };
test('all inline scripts parse and no public admin nav link remains', () => {
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) if (!m[1].includes('type="module"')) new (require('node:vm').Script)(m[2]);
  const a = app();assert.equal(a.doc.querySelector('#nav a[href="#admin"]'), null);assert.ok(a.doc.querySelector('#admin-access'));a.close();
});
test('custom Midas story is pinned last; King Midas remains distinct', () => {
  const a=app();a.api.state.stories=[{id:'custom',title:'Midas',ts:1},{id:'other',title:'Other story',ts:2}];a.api.setup(null,true,null);
  a.doc.querySelector('#view').innerHTML='';a.api.pStory();
  const tabs=[...a.doc.querySelectorAll('#view > div:first-child button')].map(x=>x.textContent);
  assert.equal(tabs[0],'👑 King Midas');assert.equal(tabs.at(-1),'Midas 🔒');assert.ok(tabs.indexOf('➕ Add story')<tabs.length-1);a.close();
});
test('creator page is public, editing requires owner or admin', () => {
  const a=app();a.api.state.sponsors=[{id:'page',kind:'creator',name:'Artist',blurb:'Public bio',owner:'creator'}];
  for(const [user,admin,canEdit] of [[null,false,false],[{uid:'stranger'},false,false],[{uid:'creator'},false,true],[{uid:'owner'},true,true]]){
    a.api.setup(user,admin,adapter);a.doc.querySelector('#view').innerHTML='';a.api.pCreator('page');
    assert.match(a.doc.querySelector('#view').textContent,/Public bio/);assert.equal(Boolean(a.doc.querySelector('details')),canEdit);
  }a.close();
});
test('role badges cannot grant admin access', () => {
  const a=app();a.api.setup({uid:'member'},false,adapter);a.api.state.roles=[{id:'member',role:'sponsor'}];
  assert.equal(a.api.roleClass('member'),'role-sponsor');a.doc.querySelector('#view').innerHTML='';a.api.pAdmin();assert.match(a.doc.querySelector('#view').textContent,/Admin Login/);assert.equal(button(a.doc,'Block'),undefined);a.close();
});
test('image-only DM stores compressed content in its participant-protected message', async () => {
  const a=app(),writes=[];a.api.setup({uid:'sender'},false,{...adapter,collection:n=>({...adapter.collection(),doc:id=>({set:async data=>writes.push({n,id,data})})})});
  a.api.state.users=[{id:'sender',name:'Sender'},{id:'recipient',name:'Receiver'}];a.api.recipient('recipient');
  a.w.FB={dmUpload:async file=>({image:'data:image/jpeg;base64,compressed',imageName:file.name})};
  a.doc.querySelector('#view').innerHTML='';a.api.pDM();const input=a.doc.querySelector('input[type="file"]');Object.defineProperty(input,'files',{value:[new a.w.File(['image'],'photo.png',{type:'image/png'})]});
  button(a.doc,'Send').click();await new Promise(r=>setImmediate(r));
  const message=writes.find(x=>x.n==='dms');assert.ok(message);assert.equal(message.data.to,'recipient');assert.equal(message.data.text,'');assert.equal(message.data.image,'data:image/jpeg;base64,compressed');assert.equal(message.data.imagePath,undefined);a.close();
});
test('image adapter rejects invalid/oversize input without using Storage or Functions', async () => {
  const a=app();a.w.SITE={firebase:{apiKey:'test-only'}};
  for(const name of ['initializeApp','getFirestore','getAuth'])a.w[name]=()=>({});
  const moduleSource=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('type="module"'))[2].replace(/^import .*;$/gm,'').replace('dispatchEvent(new Event("fb-ready"));','');
  a.w.eval(moduleSource);
  for(const file of [{type:'image/png',size:10*1024*1024+1},{type:'image/svg+xml',size:5},{type:'image/png',size:0}])await assert.rejects(a.w.FB.dmUpload(file));
  assert.equal(a.w.FB.call,undefined);assert.doesNotMatch(moduleSource,/getStorage|httpsCallable|getFunctions|uploadBytes/);a.close();
});
test('touch admin shortcut needs two taps; desktop shortcut opens login only', () => {
  for (const pointerType of ['touch','mouse']) {
    const a=app(),shortcut=a.doc.querySelector('#admin-access');
    function tap(){const e=new a.w.Event('pointerup');Object.defineProperty(e,'pointerType',{value:pointerType});shortcut.dispatchEvent(e);}
    tap();if(pointerType==='touch'){assert.equal(a.w.location.hash,'');tap();}
    assert.equal(a.w.location.hash,'#admin');a.api.route();assert.match(a.doc.querySelector('#view').textContent,/Admin Login/);assert.equal(button(a.doc,'Block'),undefined);a.close();
  }
});
function sdk(a,stubs={}){
  a.w.SITE={firebase:{apiKey:'test-only'},adminEmail:'owner@example.com'};
  for(const name of ['initializeApp','getFirestore','getAuth'])a.w[name]=()=>({});
  Object.assign(a.w,stubs);
  a.w.eval([...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('type="module"'))[2].replace(/^import .*;$/gm,'').replace('dispatchEvent(new Event("fb-ready"));',''));
}
test('entrance checks the saved courtesy hash locally without any callable function',async()=>{
  const a=app();a.api.entranceReady();const value=require('node:crypto').randomBytes(18).toString('hex');
  a.api.state.settings.entranceHash=await a.api.entranceDigest(value);
  a.doc.querySelector('#gp').value=value+'wrong';button(a.doc,'Enter').click();await new Promise(r=>setTimeout(r,30));
  assert.notEqual(a.doc.querySelector('#gate').style.display,'none');assert.match(a.doc.querySelector('#gerr').textContent,/not the golden word/);
  a.doc.querySelector('#gp').value=value;button(a.doc,'Enter').click();await new Promise(r=>setTimeout(r,30));
  assert.equal(a.doc.querySelector('#gate').style.display,'none');assert.equal(a.doc.querySelector('#gp').value,'');a.close();
});
test('10 MiB image input is compressed to JPEG before being stored',async()=>{
  const a=app();let encoded=0;
  a.w.Image=class{constructor(){this.width=2000;this.height=1000;}set src(value){queueMicrotask(()=>this.onload());}};
  a.w.HTMLCanvasElement.prototype.toDataURL=function(type){encoded++;assert.equal(type,'image/jpeg');assert.equal(this.width,900);return 'data:image/jpeg;base64,compressed';};
  sdk(a);const result=await a.w.FB.dmUpload({type:'image/png',size:10*1024*1024,name:'large.png'});
  assert.equal(result.image,'data:image/jpeg;base64,compressed');assert.equal(result.imageName,'large.png');assert.equal(encoded,1);a.close();
});
test('restore refuses to overwrite an existing room, otherwise restores an archive',async()=>{
  const a=app(),writes=[];let exists=true;
  sdk(a,{doc:(_,col,id)=>col+'/'+id,runTransaction:async(_,callback)=>callback({get:async path=>path.startsWith('users/')?{exists:()=>exists}:{exists:()=>true,data:()=>({room:{uid:'member',name:'Recovered'}})},set:(path,data)=>writes.push({path,data})})});
  await assert.rejects(a.w.FB.restoreRoom('member','Blank'),/already has a room/);assert.equal(writes.length,0);
  exists=false;await a.w.FB.restoreRoom('member','Blank');assert.equal(writes[0].data.name,'Recovered');a.close();
});
test('directory lookup normalizes email and explains missing old accounts',()=>{
  const a=app();a.api.state.directory=[{id:'creator',email:'creator@example.com'}];assert.equal(a.api.directoryMember(' CREATOR@EXAMPLE.COM ').id,'creator');assert.throws(()=>a.api.directoryMember('unknown@example.com'),/log in once/);a.close();
});
test('creator password reset is emailed to the creator, never set by admin',async()=>{
  const a=app(),emails=[];a.api.setup({uid:'admin'},true,adapter);a.api.state.directory=[{id:'creator',email:'creator@example.com'}];a.api.state.sponsors=[{id:'page',kind:'creator',owner:'creator',name:'Artist'}];a.w.FB={reset:async email=>emails.push(email)};
  a.doc.querySelector('#view').innerHTML='';a.api.pCreator('page');button(a.doc,'Send creator password reset email').click();await new Promise(r=>setImmediate(r));assert.equal(emails[0],'creator@example.com');assert.equal(a.doc.querySelector('input[autocomplete="new-password"]'),null);a.close();
});
