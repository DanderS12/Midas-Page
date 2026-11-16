const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const classic = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m => !m[1].includes('type="module"') && !m[1].includes('src='))[0][2];
function app() {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: true, addEventListener() {} });
  w.requestAnimationFrame = () => 1;w.cancelAnimationFrame = () => {};
  const ctx = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
  w.HTMLCanvasElement.prototype.getContext = () => ctx;
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();w.HTMLMediaElement.prototype.pause = () => {};w.HTMLMediaElement.prototype.load = () => {};
  w.URL.createObjectURL = () => 'blob:test';w.URL.revokeObjectURL = () => {};
  w.eval(classic.replace('\nroute();\n})();', `
    window.testing={state:state,route:route,pDM:pDM,pStory:pStory,pCreator:pCreator,pAdmin:pAdmin,
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
test('image-only DM uploads attachment then publishes message, retaining captured recipient', async () => {
  const a=app(),writes=[];a.api.setup({uid:'sender'},false,{...adapter,collection:n=>({...adapter.collection(),doc:id=>({set:async data=>writes.push({n,id,data})})})});
  a.api.state.users=[{id:'sender',name:'Sender'},{id:'recipient',name:'Receiver'}];a.api.recipient('recipient');
  a.w.FB={dmUpload:async (file,from,to,id)=>({imagePath:`dm/${from}/${to}/${id}`,imageType:file.type,imageBytes:file.size,imageName:file.name}),dmRemove:async()=>{},dmImage:async()=>new a.w.Blob()};
  a.doc.querySelector('#view').innerHTML='';a.api.pDM();const input=a.doc.querySelector('input[type="file"]');Object.defineProperty(input,'files',{value:[new a.w.File(['image'],'photo.png',{type:'image/png'})]});
  button(a.doc,'Send').click();await new Promise(r=>setImmediate(r));
  const message=writes.find(x=>x.n==='dms');assert.ok(message);assert.equal(message.data.to,'recipient');assert.equal(message.data.text,'');assert.match(message.data.imagePath,/^dm\/sender\/recipient\//);a.close();
});
test('storage adapter rejects invalid and oversized images before uploading', async () => {
  const a=app(),uploads=[];
  a.w.SITE={firebase:{apiKey:'test-only'}};
  for(const name of ['initializeApp','getFirestore','getAuth','getStorage','getFunctions'])a.w[name]=()=>({});
  a.w.ref=(_,path)=>path;a.w.uploadBytes=async (...args)=>uploads.push(args);
  const moduleSource=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('type="module"'))[2].replace(/^import .*;$/gm,'').replace('dispatchEvent(new Event("fb-ready"));','');
  a.w.eval(moduleSource);
  for(const file of [{type:'image/png',size:10*1024*1024+1},{type:'image/svg+xml',size:5},{type:'image/png',size:0}])await assert.rejects(a.w.FB.dmUpload(file,'a','b','id'));
  assert.equal(uploads.length,0);
  const result=await a.w.FB.dmUpload({type:'image/png',size:10*1024*1024,name:'image.png'},'a','b','id');
  assert.equal(uploads.length,1);assert.equal(result.imageBytes,10*1024*1024);a.close();
});
test('touch admin shortcut needs two taps; desktop shortcut opens login only', () => {
  for (const pointerType of ['touch','mouse']) {
    const a=app(),shortcut=a.doc.querySelector('#admin-access');
    function tap(){const e=new a.w.Event('pointerup');Object.defineProperty(e,'pointerType',{value:pointerType});shortcut.dispatchEvent(e);}
    tap();if(pointerType==='touch'){assert.equal(a.w.location.hash,'');tap();}
    assert.equal(a.w.location.hash,'#admin');a.api.route();assert.match(a.doc.querySelector('#view').textContent,/Admin Login/);assert.equal(button(a.doc,'Block'),undefined);a.close();
  }
});
