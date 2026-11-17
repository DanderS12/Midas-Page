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
  w.eval(fs.readFileSync(require.resolve('../name-policy.js'),'utf8'));
  w.TextEncoder=TextEncoder;Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});
  w.matchMedia = () => ({ matches: true, addEventListener() {} });
  w.requestAnimationFrame = () => 1;w.cancelAnimationFrame = () => {};
  const ctx = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
  w.HTMLCanvasElement.prototype.getContext = () => ctx;
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();w.HTMLMediaElement.prototype.pause = () => {};w.HTMLMediaElement.prototype.load = () => {};
  w.URL.createObjectURL = () => 'blob:test';w.URL.revokeObjectURL = () => {};
  w.eval(classic.replace('\nroute();\n})();', `
    window.testing={state:state,route:route,pDM:pDM,pStory:pStory,pCreator:pCreator,pAdmin:pAdmin,pMyRoom:pMyRoom,ensurePageData:ensurePageData,pHome:pHome,photoGrid:photoGrid,storyPics:storyPics,savedImage:savedImage,pictureElement:pictureElement,pAlerts:pAlerts,pCassie:pCassie,pArcade:pArcade,arcadeAdmin:arcadeAdmin,arcadeURL:arcadeURL,groupedAlerts:groupedAlerts,creatorLink:creatorLink,sponsorBanner:sponsorBanner,pRooms:pRooms,memberSafety:memberSafety,renderDM:renderDM,markConversationRead:markConversationRead,updateMessageBadge:updateMessageBadge,activeAnnouncements:activeAnnouncements,refresh:refresh,adminCommunity:adminCommunity,directoryMember:directoryMember,entranceDigest:entranceDigest,themeOf:themeOf,THEMES:THEMES,applySite:applySite,
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
  sdk(a,{doc:(_,col,id)=>col+'/'+id,runTransaction:async(_,callback)=>callback({get:async path=>path.startsWith('users/')?{exists:()=>exists}:path.startsWith('displayNames/')?{exists:()=>false}:{exists:()=>true,data:()=>({room:{uid:'member',name:'Recovered'}})},set:(path,data)=>writes.push({path,data})})});
  await assert.rejects(a.w.FB.restoreRoom('member','Blank'),/already has a room/);assert.equal(writes.length,0);
  exists=false;await a.w.FB.restoreRoom('member','Blank');assert.equal(writes.find(w=>w.path==='users/member').data.name,'Recovered');a.close();
});
test('directory lookup normalizes email and explains missing old accounts',()=>{
  const a=app();a.api.state.directory=[{id:'creator',email:'creator@example.com'}];assert.equal(a.api.directoryMember(' CREATOR@EXAMPLE.COM ').id,'creator');assert.throws(()=>a.api.directoryMember('unknown@example.com'),/log in once/);a.close();
});
test('creator password reset is emailed to the creator, never set by admin',async()=>{
  const a=app(),emails=[];a.api.setup({uid:'admin'},true,adapter);a.api.state.directory=[{id:'creator',email:'creator@example.com'}];a.api.state.sponsors=[{id:'page',kind:'creator',owner:'creator',name:'Artist'}];a.w.FB={reset:async email=>emails.push(email)};
  a.doc.querySelector('#view').innerHTML='';a.api.pCreator('page');button(a.doc,'Send creator password reset email').click();await new Promise(r=>setImmediate(r));assert.equal(emails[0],'creator@example.com');assert.equal(a.doc.querySelector('input[autocomplete="new-password"]'),null);a.close();
});
function tabs(doc){return [...doc.querySelectorAll('[role=tab]')];}
function panelFor(doc,label){const tab=tabs(doc).find(t=>t.textContent===label);return doc.getElementById(tab.getAttribute('aria-controls'));}
test('Settings groups controls into five tabs and preserves drafts when switching',()=>{
  const a=app();a.api.setup({uid:'member',email:'member@example.com'},false,adapter);a.doc.querySelector('#view').innerHTML='';a.api.pMyRoom();
  assert.deepEqual(tabs(a.doc).map(t=>t.textContent),['Profile','Appearance','Music','Photos','Friends & status']);
  const profile=panelFor(a.doc,'Profile'),music=panelFor(a.doc,'Music'),photos=panelFor(a.doc,'Photos');
  const name=profile.querySelector('input[placeholder="Room name"]');name.value='My unsaved name';name.dispatchEvent(new a.w.Event('input',{bubbles:true}));
  assert.equal(profile.hidden,false);assert.equal(music.hidden,true);
  button(a.doc,'Music').click();assert.equal(profile.hidden,true);assert.equal(music.hidden,false);
  assert.ok(music.contains(button(a.doc,'Upload song')));assert.ok(photos.contains(button(a.doc,'Upload banner')));assert.ok(photos.contains(button(a.doc,'Upload photos')));
  button(a.doc,'Profile').click();assert.equal(profile.querySelector('input[placeholder="Room name"]'),name);assert.equal(name.value,'My unsaved name');
  a.api.refresh();assert.equal(a.doc.querySelector('input[placeholder="Room name"]'),name);
  const save=button(a.doc,'Save my room');assert.ok(save);assert.equal(save.closest('[role=tabpanel]'),null);a.close();
});
test('tab keyboard navigation updates focus, selection and panel visibility',()=>{
  const a=app();a.api.setup({uid:'member',email:'member@example.com'},false,adapter);a.doc.querySelector('#view').innerHTML='';a.api.pMyRoom();
  const first=tabs(a.doc)[0];first.focus();first.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(a.doc.activeElement.textContent,'Appearance');assert.equal(a.doc.activeElement.getAttribute('aria-selected'),'true');assert.equal(first.tabIndex,-1);
  a.doc.activeElement.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(a.doc.activeElement.textContent,'Friends & status');
  a.doc.activeElement.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(a.doc.activeElement,first);
  assert.equal([...a.doc.querySelectorAll('[role=tabpanel]')].filter(p=>!p.hidden).length,1);a.close();
});
test('admin tabs group all controls and keep feedback outside hidden panels',()=>{
  const a=app();a.api.setup({uid:'admin',email:'owner@example.com'},true,adapter);a.doc.querySelector('#view').innerHTML='';a.api.pAdmin();
  assert.deepEqual(tabs(a.doc).map(t=>t.textContent),['Photos & comics','Appearance','Entrance','Announcements','Members & rooms','Safety & 18+','Login history','Donations','Backups','Arcade Games']);
  for(const [tab,label] of [['Photos & comics','Upload comic pages'],['Appearance','Save site effects'],['Entrance','Change entrance password'],['Announcements','Publish announcement'],['Members & rooms','Restore / add room'],['Safety & 18+','Block email'],['Donations','Save donation info']])assert.ok(panelFor(a.doc,tab).contains(button(a.doc,label)),label);
  const status=a.doc.querySelector('#admin-feedback');assert.equal(status.closest('[role=tabpanel]'),null);
  button(a.doc,'Entrance').click();const input=a.doc.querySelector('[aria-label="New entrance password"]');input.value='draft';
  button(a.doc,'Donations').click();button(a.doc,'Entrance').click();assert.equal(input.value,'draft');
  // Selected section persists when the page is rebuilt without carrying unsaved data over.
  a.doc.querySelector('#view').innerHTML='';a.api.pAdmin();assert.equal(panelFor(a.doc,'Entrance').hidden,false);assert.equal(a.doc.querySelector('[aria-label="New entrance password"]').value,'');a.close();
});
test('Settings saves values from inactive tabs through the existing room write',async()=>{
  const a=app(),writes=[];a.api.setup({uid:'member',email:'member@example.com'},false,adapter);a.w.FB={saveProfile:async (id,data)=>writes.push({n:'users',id,data})};
  a.doc.querySelector('#view').innerHTML='';a.api.pMyRoom();a.doc.querySelector('input[placeholder="Room name"]').value='New room';
  button(a.doc,'Music').click();a.doc.querySelector('input[placeholder="Song title (optional)"]').value='My song';button(a.doc,'Photos').click();button(a.doc,'Save my room').click();await new Promise(r=>setImmediate(r));
  assert.equal(writes[0].n,'users');assert.equal(writes[0].data.name,'New room');assert.equal(writes[0].data.songTitle,'My song');a.close();
});
test('unread DM badge counts incoming unread messages except blocked members',()=>{
  const a=app();a.api.setup({uid:'me'},false,adapter);a.api.state.dmIn=[{id:'one',from:'friend'},{id:'two',from:'friend',read:true},{id:'three',from:'blocked'}];a.api.state.memberBlocks=[{id:'blocked'}];a.api.updateMessageBadge();assert.equal(a.doc.querySelector('#nav a[href="#dm"]').textContent,'💌 Messages (1)');a.close();
});
test('blocked conversation is hidden and cannot send a new message',async()=>{
  const a=app(),writes=[];a.api.setup({uid:'me'},false,{...adapter,collection:n=>({...adapter.collection(),doc:id=>({set:async d=>writes.push(d)})})});a.api.state.users=[{id:'friend',name:'Friend'}];a.api.state.memberBlocks=[{id:'friend'}];a.api.recipient('friend');a.doc.querySelector('#view').innerHTML='';a.api.pDM();assert.match(a.doc.querySelector('#view').textContent,/Previous messages are hidden/);assert.ok(button(a.doc,'Unblock member'));a.doc.querySelector('input[placeholder="Type a private message…"]').value='hello';button(a.doc,'Send').click();await new Promise(r=>setImmediate(r));assert.equal(writes.length,0);a.close();
});
test('member reports contain reference and reason, never copied message content',async()=>{
  const a=app(),writes=[];a.w.confirm=()=>true;a.api.setup({uid:'reporter'},false,{...adapter,collection:n=>({doc:id=>({set:async d=>writes.push({n,d})})})});a.doc.querySelector('#view').appendChild(a.api.memberSafety('target','message1'));a.doc.querySelector('[aria-label="Report reason"]').value='Unwanted contact';button(a.doc,'Submit report').click();await new Promise(r=>setImmediate(r));assert.equal(writes[0].n,'reports');assert.equal(writes[0].d.target,'target');assert.equal(writes[0].d.messageId,'message1');assert.equal(writes[0].d.reason,'Unwanted contact');assert.equal(writes[0].d.image,undefined);assert.equal(writes[0].d.text,undefined);a.close();
});
test('image selection previews locally, can be removed, and rejects oversize input',()=>{
  const a=app(),revoked=[];a.w.URL.revokeObjectURL=url=>revoked.push(url);a.api.setup({uid:'me'},false,adapter);a.api.state.users=[{id:'friend',name:'Friend'}];a.api.recipient('friend');a.doc.querySelector('#view').innerHTML='';a.api.pDM();const input=a.doc.querySelector('input[type=file]');let files=[new a.w.File(['png'],'image.png',{type:'image/png'})];Object.defineProperty(input,'files',{get:()=>files});input.dispatchEvent(new a.w.Event('change',{bubbles:true}));assert.ok(a.doc.querySelector('img[alt="Selected image preview"]'));button(a.doc,'Remove selected image').click();assert.equal(a.doc.querySelector('img[alt="Selected image preview"]'),null);assert.deepEqual(revoked,['blob:test']);files=[{type:'image/png',size:10*1024*1024+1,name:'huge.png'}];input.dispatchEvent(new a.w.Event('change'));assert.equal(a.doc.querySelector('img[alt="Selected image preview"]'),null);assert.match(a.doc.querySelector('#view').textContent,/Choose a JPG/);a.close();
});
test('message send displays compression then save phases and prevents duplicate sends',async()=>{
  const a=app();let finishCompression,finishSave,writes=0;a.api.setup({uid:'me'},false,{...adapter,collection:n=>({...adapter.collection(),doc:id=>({set:async()=>{if(n==='dms'){writes++;await new Promise(r=>finishSave=r);}}})})});a.w.FB={dmUpload:()=>new Promise(r=>finishCompression=r)};a.api.state.users=[{id:'friend',name:'Friend'}];a.api.recipient('friend');a.doc.querySelector('#view').innerHTML='';a.api.pDM();const input=a.doc.querySelector('input[type=file]');Object.defineProperty(input,'files',{value:[new a.w.File(['x'],'x.png',{type:'image/png'})]});button(a.doc,'Send').click();assert.match(a.doc.querySelector('#view').textContent,/Compressing image/);assert.equal(button(a.doc,'Send').disabled,true);finishCompression({image:'data:image/jpeg;base64,test',imageName:'x.jpg'});await new Promise(r=>setImmediate(r));assert.match(a.doc.querySelector('#view').textContent,/Saving message/);assert.equal(writes,1);finishSave();await new Promise(r=>setImmediate(r));assert.equal(button(a.doc,'Send').disabled,false);a.close();
});
test('room search matches display names without searching or displaying emails',()=>{
  const a=app();a.api.setup({uid:'me',email:'me@example.com'},false,adapter);a.api.state.users=[{id:'a',name:'Golden Artist'},{id:'b',name:'Musician'}];a.doc.querySelector('#view').innerHTML='';a.api.pRooms();const search=a.doc.querySelector('input[type=search]');search.value='ARTIST';search.dispatchEvent(new a.w.Event('input'));assert.equal(a.doc.querySelectorAll('.grid .card').length,1);assert.match(a.doc.querySelector('.grid').textContent,/Golden Artist/);search.value='@example.com';search.dispatchEvent(new a.w.Event('input'));assert.match(a.doc.querySelector('.grid').textContent,/No matching rooms/);a.close();
});
test('expired announcements disappear while permanent and future notices remain',()=>{
  const a=app();a.api.state.announcements=[{id:'expired',expiresAt:100},{id:'future',expiresAt:300},{id:'forever'}];assert.deepEqual(Array.from(a.api.activeAnnouncements(200),x=>x.id),['future','forever']);a.close();
});
test('announcement publishing rejects past expiry and writes future expiry',async()=>{
  const a=app(),writes=[];a.api.setup({uid:'admin'},true,{...adapter,collection:n=>({...adapter.collection(),doc:id=>({set:async d=>writes.push({n,d})})})});a.doc.querySelector('#view').innerHTML='';a.api.pAdmin();a.doc.querySelector('[aria-label="Announcement text"]').value='News';const expiry=a.doc.querySelector('[aria-label="Announcement expiry"]');expiry.value='2020-01-01T00:00';button(a.doc,'Publish announcement').click();await new Promise(r=>setImmediate(r));assert.equal(writes.length,0);assert.match(a.doc.querySelector('#admin-feedback').textContent,/future expiry/);expiry.value='2099-01-01T00:00';button(a.doc,'Publish announcement').click();await new Promise(r=>setImmediate(r));assert.equal(writes[0].n,'announcements');assert.equal(writes[0].d.expiresAt,new Date('2099-01-01T00:00').getTime());a.close();
});
test('unsaved page navigation asks before leaving and cancellation retains the editor',()=>{
  const a=app();let confirms=0;a.w.confirm=()=>{confirms++;return false;};a.api.setup({uid:'member',email:'member@example.com'},false,adapter);a.doc.querySelector('#view').innerHTML='';a.api.pMyRoom();const name=a.doc.querySelector('input[placeholder="Room name"]');name.value='Draft';name.dispatchEvent(new a.w.Event('input',{bubbles:true}));a.doc.querySelector('#nav a[href="#rooms"]').click();assert.equal(confirms,1);assert.equal(a.doc.querySelector('input[placeholder="Room name"]'),name);const e=new a.w.Event('beforeunload',{cancelable:true});a.w.dispatchEvent(e);assert.equal(e.defaultPrevented,true);a.close();
});
test('backup allowlist exports room content but never messages or account records',async()=>{
  const a=app(),requested=[];sdk(a,{collection:(_,name)=>name,getDocs:async name=>{requested.push(name);return {docs:[{id:'test',data:()=>({name:'example'})}]};}});const backup=await a.w.FB.exportContent();assert.equal(backup.format,'midas-content');assert.ok(requested.includes('users'));assert.ok(requested.includes('roomArchive'));for(const name of ['dms','loginHistory','memberDirectory','reports','blockedEmails','memberBlocks','nsfw'])assert.equal(requested.includes(name),false);a.close();
});
test('read marking occurs only for visible active conversation and unread incoming messages',async()=>{
  const a=app(),writes=[];let hidden=true;Object.defineProperty(a.doc,'hidden',{get:()=>hidden});a.w.history.replaceState(null,'','#dm');a.api.setup({uid:'me'},false,{...adapter,collection:n=>({doc:id=>({update:async d=>writes.push({n,id,d})})})});a.api.recipient('friend');a.api.state.dmIn=[{id:'new',from:'friend'},{id:'read',from:'friend',read:true},{id:'other',from:'other'}];a.api.markConversationRead();assert.equal(writes.length,0);hidden=false;a.api.markConversationRead();await new Promise(r=>setImmediate(r));assert.equal(writes.length,1);assert.equal(writes[0].id,'new');assert.equal(writes[0].d.read,true);a.close();
});
test('cancelling hash/back navigation restores the route without discarding the editor',()=>{
  const a=app();a.w.confirm=()=>false;a.api.setup({uid:'me',email:'me@example.com'},false,adapter);a.doc.querySelector('#view').innerHTML='';a.api.pMyRoom();const input=a.doc.querySelector('input[placeholder="Room name"]');input.value='Draft';input.dispatchEvent(new a.w.Event('input',{bubbles:true}));a.w.history.replaceState(null,'','#rooms');a.api.route();assert.equal(a.w.location.hash,'#home');assert.equal(a.doc.querySelector('input[placeholder="Room name"]'),input);a.close();
});
test('new themes are available year-round with valid colors and distinct palettes',()=>{
  const a=app();const keys=['midnightgold','royalvault','goldenmarble','neonmidas','artdeco'];
  for(const key of keys){const theme=a.api.THEMES[key];assert.ok(theme);assert.equal(theme.win,undefined);const resolved=a.api.themeOf(theme);for(const field of ['--bg','--panel','--text','--gold','--gold2'])assert.match(resolved.vars[field],/^#[0-9a-f]{6}$/i);}
  assert.equal(new Set(keys.map(k=>a.api.THEMES[k].bg)).size,5);a.api.state.settings.siteTheme='goldenmarble';a.api.applySite();assert.equal(a.doc.documentElement.style.getPropertyValue('--bg'),'#f4efe4');a.close();
});
test('Reduce effects toggles particles and persists visitor preference',()=>{
  const a=app(),toggle=a.doc.querySelector('#reduce-effects');toggle.click();assert.equal(a.w.localStorage.getItem('midas-reduce-effects'),'on');assert.equal(a.doc.body.classList.contains('reduce-effects'),true);assert.equal(toggle.getAttribute('aria-pressed'),'true');toggle.click();assert.equal(a.w.localStorage.getItem('midas-reduce-effects'),'off');a.close();
});
test('display-name policy normalizes whitespace/case and detects existing collisions',()=>{
  const names=require('../name-policy');assert.equal(names.key('  King   Midas  '),'king midas');assert.equal(names.valid('King Midas'),true);for(const value of ['a','x'.repeat(25),'name/path','name@example.com','👑'])assert.equal(names.valid(value),false);
  assert.equal(names.conflicts([{id:'a',name:'Midas'},{id:'b',name:' MIDAS '}]).length,1);assert.equal(names.conflicts([{name:'Midas'},{name:'Other'}]).length,0);
});
test('transaction rejects a reserved name and writes profile and reservation together',async()=>{
  const a=app(),writes=[];let claimed=true;
  sdk(a,{doc:(_,col,id)=>col+'/'+id,runTransaction:async(_,fn)=>fn({get:async path=>path==='settings/site'?{exists:()=>true,data:()=>({namesReady:true})}:path.startsWith('displayNames/')?{exists:()=>claimed,data:()=>({uid:'other'})}:{exists:()=>false},set:(path,data)=>writes.push({path,data}),delete:()=>{}})});
  await assert.rejects(a.w.FB.saveProfile('member',{uid:'member',name:'  Midas  '}),/taken/);assert.equal(writes.length,0);claimed=false;await a.w.FB.saveProfile('member',{uid:'member',name:'  Midas  '});assert.equal(writes[0].path,'displayNames/midas');assert.equal(writes[1].path,'users/member');assert.equal(writes[1].data.name,'Midas');a.close();
});
test('DM alerts group by sender, count unread messages and open marks all grouped IDs',async()=>{
  const a=app(),updates=[];a.api.setup({uid:'me'},false,{...adapter,collection:n=>({...adapter.collection(),doc:id=>({update:async d=>updates.push({id,d})})})});a.api.state.notifs=[{id:'a',type:'dm',from:'jay',fromName:'Jay',ts:1,read:false},{id:'b',type:'dm',from:'jay',fromName:'Jay',ts:2,read:false},{id:'c',type:'dm',from:'jay',fromName:'Jay',ts:3,read:true}];
  assert.equal(a.api.groupedAlerts().length,1);assert.equal(a.api.groupedAlerts()[0].count,2);a.doc.querySelector('#view').innerHTML='';a.api.pAlerts();assert.equal(a.doc.querySelectorAll('#view .cm').length,1);assert.match(a.doc.querySelector('#view').textContent,/2 new messages/);button(a.doc,'Open').click();await new Promise(r=>setImmediate(r));assert.deepEqual(updates.map(x=>x.id).sort(),['a','b','c']);a.close();
});
test('long conversations render a bounded window and build safety forms only on demand',()=>{
  const a=app();a.api.setup({uid:'me'},false,adapter);a.api.state.users=[{id:'jay',name:'Jay'}];a.api.state.dmIn=Array.from({length:500},(_,i)=>({id:String(i),from:'jay',to:'me',text:'Hello '+i,ts:i,read:true}));a.api.recipient('jay');a.doc.querySelector('#view').innerHTML='';a.api.pDM();assert.equal(a.doc.querySelectorAll('#view .cm').length,80);assert.equal(a.doc.querySelectorAll('.cm textarea').length,0);const first=a.doc.querySelector('.cm');a.api.renderDM();assert.equal(a.doc.querySelector('.cm'),first);button(a.doc,'Load older messages').click();assert.equal(a.doc.querySelectorAll('#view .cm').length,160);a.close();
});
test('member safety controls start closed behind an options summary',()=>{
  const a=app();a.api.setup({uid:'me'},false,adapter);const safety=a.api.memberSafety('jay');assert.equal(safety.tagName,'DETAILS');assert.equal(safety.open,false);assert.match(safety.querySelector('summary').textContent,/Member options/);assert.ok(safety.querySelector('[data-block-target]'));a.close();
});
test('creator external button allows only HTTPS and sanitizes all visual values',()=>{
  const a=app();assert.equal(a.api.creatorLink({link:'javascript:alert(1)'}),null);const good=a.api.creatorLink({link:'https://example.com',buttonLabel:'Shop',buttonBg:'#112233',buttonColor:'#ffffff',buttonShape:'pill'});assert.equal(good.textContent,'Shop');assert.match(good.getAttribute('style'),/border-radius:999px/);assert.equal(good.rel,'noopener noreferrer');const bad=a.api.creatorLink({link:'https://example.com',buttonBg:'red;position:fixed',buttonShape:'bad'});assert.doesNotMatch(bad.getAttribute('style'),/position/);assert.match(bad.getAttribute('style'),/border-radius:10px/);a.close();
});
test('creator button customization is saved with the existing owner edit path',async()=>{
  const a=app(),updates=[];a.api.setup({uid:'artist',email:'artist@example.com'},false,{...adapter,collection:n=>({doc:id=>({update:async data=>updates.push({n,id,data})})})});a.api.state.sponsors=[{id:'page',kind:'creator',owner:'artist',name:'Artist',blurb:'Bio',link:'',img:''}];a.doc.querySelector('#view').innerHTML='';a.api.pCreator('page');a.doc.querySelector('[aria-label="Creator link"]').value='https://example.com';a.doc.querySelector('[aria-label="Website button label"]').value='My shop';a.doc.querySelector('[aria-label="Website button shape"]').value='pill';button(a.doc,'Save creator page').click();await new Promise(r=>setImmediate(r));assert.equal(updates[0].data.buttonLabel,'My shop');assert.equal(updates[0].data.buttonShape,'pill');a.close();
});
test('sponsor pin stays until removed and supports safe top/bottom placement',async()=>{
  const a=app();a.api.state.settings.sponsorPin={text:'Sponsor news',position:'bottom',link:'https://example.com',label:'Sponsor'};assert.equal(a.api.sponsorBanner('top'),null);assert.match(a.api.sponsorBanner('bottom').textContent,/Sponsor news/);a.api.state.settings.sponsorPin=null;assert.equal(a.api.sponsorBanner('bottom'),null);a.close();
});
test('Cassie Lounge renders a distinct landing area linked to existing chat',()=>{
  const a=app();a.doc.querySelector('#view').innerHTML='';a.api.pCassie();assert.ok(a.doc.querySelector('.cassie-lounge'));assert.equal(a.doc.querySelectorAll('.lounge-web').length,2);assert.equal(a.doc.querySelector('.cassie-lounge a').hash,'#chat');assert.ok(a.doc.querySelector('#nav a[href="#cassie"]'));a.close();
});
test('music effects settings persist per browser with five supported modes',()=>{
  const a=app();a.api.setup({uid:'me',email:'me@example.com'},false,adapter);a.doc.querySelector('#view').innerHTML='';a.api.pMyRoom();const select=a.doc.querySelector('[aria-label="Music visual effect"]');assert.deepEqual([...select.options].map(x=>x.value),['glow','flames','bubbles','neon','off']);select.value='flames';select.dispatchEvent(new a.w.Event('change'));assert.equal(a.w.localStorage.getItem('midas-music-style'),'flames');assert.equal(a.doc.body.getAttribute('data-beat-style'),'flames');a.close();
});
test('Arcade Games page has the requested heading, optional pictures and safe outbound buttons',()=>{
  const a=app();a.api.state.arcade={links:[{id:'one',label:'Puzzle',url:'https://example.com/puzzle',image:'data:image/jpeg;base64,YQ=='},{id:'two',label:'Racing',url:'https://example.com/race',image:''},{id:'bad',label:'Unsafe',url:'javascript:alert(1)'}]};a.doc.querySelector('#view').innerHTML='';a.api.pArcade();assert.equal(a.doc.querySelector('#view h2').textContent,"Dander's Arcade Games");assert.equal(a.doc.querySelectorAll('.arcade-game').length,2);assert.equal(a.doc.querySelectorAll('.arcade-game img').length,1);assert.equal(a.doc.querySelectorAll('.arcade-symbol').length,1);assert.equal(a.doc.querySelector('.arcade-game').target,'_blank');assert.equal(a.doc.querySelector('.arcade-game').rel,'noopener noreferrer');assert.ok(a.doc.querySelector('#nav a[href="#arcade"]'));a.close();
});
test('Arcade starts with a useful empty state and URL validation refuses credentials and unsafe schemes',()=>{
  const a=app();a.doc.querySelector('#view').innerHTML='';a.api.pArcade();assert.match(a.doc.querySelector('#view').textContent,/Games are coming soon/);for(const value of ['javascript:alert(1)','http://example.com','https://','https://user:pass@example.com','data:text/html,test'])assert.equal(a.api.arcadeURL(value),null);assert.equal(a.api.arcadeURL(' https://example.com '),'https://example.com/');a.close();
});
test('non-admins cannot render arcade management',()=>{
  const a=app();a.api.setup({uid:'member'},false,adapter);const box=a.doc.createElement('div');a.api.arcadeAdmin(box);assert.equal(box.children.length,0);a.close();
});
test('admin can add, edit and delete image-free game links using the existing protected settings document',async()=>{
  const a=app(),writes=[];a.w.confirm=()=>true;a.api.setup({uid:'admin'},true,{...adapter,doc:path=>({set:async data=>writes.push({path,data})})});a.doc.querySelector('#view').innerHTML='';a.api.pAdmin();button(a.doc,'Add game button').click();a.doc.querySelector('[aria-label="Game 1 title"]').value='Puzzle';a.doc.querySelector('[aria-label="Game 1 title"]').dispatchEvent(new a.w.Event('input'));a.doc.querySelector('[aria-label="Game 1 website"]').value='https://example.com';a.doc.querySelector('[aria-label="Game 1 website"]').dispatchEvent(new a.w.Event('input'));button(a.doc,'Save arcade games').click();await new Promise(r=>setImmediate(r));assert.equal(writes[0].path,'settings/arcade');assert.equal(writes[0].data.links[0].label,'Puzzle');assert.equal(writes[0].data.links[0].image,'');a.doc.querySelector('[aria-label="Game 1 title"]').value='Puzzle updated';a.doc.querySelector('[aria-label="Game 1 title"]').dispatchEvent(new a.w.Event('input'));button(a.doc,'Save arcade games').click();await new Promise(r=>setImmediate(r));assert.equal(writes[1].data.links[0].label,'Puzzle updated');button(a.doc,'Delete game button').click();button(a.doc,'Save arcade games').click();await new Promise(r=>setImmediate(r));assert.equal(writes[2].data.links.length,0);a.close();
});
test('admin picture selection is compressed and may be removed without deleting the link',async()=>{
  const a=app(),writes=[];a.api.setup({uid:'admin'},true,{...adapter,doc:path=>({set:async data=>writes.push(data)})});a.w.FB={arcadeImage:async()=> 'data:image/jpeg;base64,YQ=='};a.api.state.arcade={links:[{id:'game',label:'Puzzle',url:'https://example.com',image:''}]};a.doc.querySelector('#view').innerHTML='';a.api.pAdmin();const file=a.doc.querySelector('[aria-label="Game 1 picture"]');Object.defineProperty(file,'files',{value:[new a.w.File(['x'],'image.png',{type:'image/png'})]});file.dispatchEvent(new a.w.Event('change'));await new Promise(r=>setImmediate(r));assert.ok(a.doc.querySelector('img[alt="Selected game picture"]'));button(a.doc,'Save arcade games').click();await new Promise(r=>setImmediate(r));assert.equal(writes[0].links[0].image,'data:image/jpeg;base64,YQ==');button(a.doc,'Remove picture').click();button(a.doc,'Save arcade games').click();await new Promise(r=>setImmediate(r));assert.equal(writes[1].links[0].image,'');assert.equal(writes[1].links[0].label,'Puzzle');a.close();
});
test('Arcade image adapter rejects oversized and invalid input before decoding',async()=>{
  const a=app();sdk(a);for(const file of [{type:'image/png',size:10*1024*1024+1},{type:'image/svg+xml',size:5},{type:'image/jpeg',size:0}])await assert.rejects(a.w.FB.arcadeImage(file));a.close();
});
test('Arcade admin enforces game count and refuses invalid website writes',async()=>{
  const a=app(),writes=[];a.api.setup({uid:'admin'},true,{...adapter,doc:path=>({set:async data=>writes.push(data)})});a.doc.querySelector('#view').innerHTML='';a.api.pAdmin();for(let i=0;i<9;i++)button(a.doc,'Add game button').click();assert.equal(a.doc.querySelectorAll('.arcade-editor-row').length,8);button(a.doc,'Save arcade games').click();await new Promise(r=>setImmediate(r));assert.equal(writes.length,0);assert.match(a.doc.querySelector('#editor-admin-arcade-panel').textContent,/valid https/);a.close();
});
test('Arcade galaxy decorations stay inside its box and are hidden from assistive technology',()=>{
  const a=app();a.doc.querySelector('#view').innerHTML='';a.api.pArcade();const box=a.doc.querySelector('.arcade-page');assert.equal(box.querySelectorAll('.arcade-paw').length,4);assert.equal(box.querySelector('.arcade-paws').getAttribute('aria-hidden'),'true');assert.equal(a.doc.querySelector('body > .arcade-paws'),null);assert.equal(box.querySelector('h2').textContent,"Dander's Arcade Games");a.close();
});
test('gold Arcade cracks are static, perimeter-scoped and do not intercept controls',()=>{
  const css=fs.readFileSync(require.resolve('../lounge.css'),'utf8');assert.match(css,/\.card\.arcade-page::after\{[^}]*pointer-events:none/);assert.match(css,/arcade-gold-cracks\.svg/);assert.match(css,/\.reduce-effects \.card\.arcade-page::after\{filter:none/);const art=fs.readFileSync(require.resolve('../media/arcade-gold-cracks.svg'),'utf8');assert.doesNotMatch(art,/<script|<animate|href=/);assert.match(art,/stroke="#ffc85a"/);
});
test('Arcade cracks react to measured audio and reset with reduced motion or stopped playback',()=>{
  const css=fs.readFileSync(require.resolve('../lounge.css'),'utf8');assert.match(css,/\.beat-active:not\(\.reduce-effects\) \.card\.arcade-page::after/);assert.match(css,/translateY\(calc\(var\(--beat-level,0\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.beat-active \.card\.arcade-page::after\{transform:none/);assert.match(html,/setProperty\("--beat-level",Math.max\(0,Math.min\(1,smooth\)\)/);assert.match(html,/setProperty\("--beat-level","0"\)/);
});
test('Midas loading screen ends on readiness and offers recovery on connection failure',()=>{
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/'}),w=dom.window;w.eval(fs.readFileSync(require.resolve('../loading.js'),'utf8'));const screen=w.document.querySelector('#midas-loading');assert.equal(screen.hidden,false);w.MidasLoading.failed();assert.equal(w.document.querySelector('#loading-actions').hidden,false);assert.match(w.document.querySelector('#loading-message').textContent,/could not connect/);w.MidasLoading.ready();assert.equal(screen.hidden,true);assert.equal(w.document.body.hasAttribute('aria-busy'),false);dom.window.close();
});
test('room and story pictures accept PNG/WebP/HTTPS records rather than silently skipping them',()=>{
  const a=app(),records=[{id:'png',img:'data:image/png;base64,YQ==',ts:1},{id:'webp',img:'data:image/webp;base64,YQ==',ts:2},{id:'url',url:'https://example.com/photo.jpg',ts:3}];
  for(const render of [a.api.photoGrid,a.api.storyPics]){const box=a.doc.createElement('div');render(box,records,false);assert.equal(box.querySelectorAll('img').length,3);assert.ok(box.querySelector('img[loading=eager]'));}
  a.close();
});
test('image source validation preserves GitHub project paths and rejects active content',()=>{
  const a=app();a.w.history.replaceState(null,'','/Midas-Page/');assert.equal(a.api.savedImage('photos/picture.jpg'),'https://example.test/Midas-Page/photos/picture.jpg');assert.equal(a.api.savedImage('data:image/gif;base64,YQ=='),'data:image/gif;base64,YQ==');for(const value of ['javascript:alert(1)','data:image/svg+xml;base64,YQ==','data:text/html;base64,YQ==','https://user:pass@example.com/x'])assert.equal(a.api.savedImage(value),null);a.close();
});
test('failed pictures show a retry control without deleting their record',()=>{
  const a=app(),box=a.api.pictureElement('https://example.com/a.jpg','Example',true);a.doc.querySelector('#view').appendChild(box);const image=box.querySelector('img');image.dispatchEvent(new a.w.Event('error'));assert.equal(image.hidden,true);assert.match(box.textContent,/record is still here/);box.querySelector('button').click();assert.equal(image.hidden,false);assert.equal(box.querySelector('.image-error'),null);a.close();
});
test('unsupported saved images show a visible explanation instead of disappearing',()=>{
  const a=app(),box=a.doc.createElement('div');a.api.storyPics(box,[{id:'bad',img:'data:image/svg+xml;base64,YQ==',ts:1}]);assert.equal(box.children.length,1);assert.match(box.textContent,/unsupported or missing source/);a.close();
});
test('startup snapshot refreshes coalesce into a single scheduled page render',async()=>{
  const a=app();let cleared=0;const view=a.doc.querySelector('#view'),observer=new a.w.MutationObserver(records=>{cleared+=records.filter(r=>r.removedNodes.length>0).length;});observer.observe(view,{childList:true});a.api.refresh();a.api.refresh();a.api.refresh();await new Promise(r=>setTimeout(r,130));observer.disconnect();assert.equal(cleared,1);a.close();
});
test('content subscriptions wait for the relevant route and are not duplicated',()=>{
  const a=app(),names=[];a.api.setup(null,false,{collection:name=>({onSnapshot:()=>{names.push(name);return ()=>{};}})});a.w.history.replaceState(null,'','#login');a.api.ensurePageData();assert.equal(names.length,0);a.w.history.replaceState(null,'','#home');a.api.ensurePageData();assert.deepEqual(names,['photos','comments','likes']);a.api.ensurePageData();assert.equal(names.length,3);a.w.history.replaceState(null,'','#comic');a.api.ensurePageData();assert.equal(names.at(-1),'comics');assert.equal(names.includes('stories'),false);a.close();
});
test('entrance blue flames are decorative and reduced-motion safe; lounge fire uses captured audio',()=>{
  const a=app();assert.equal(a.doc.querySelectorAll('#gate .entrance-flames i').length,6);assert.equal(a.doc.querySelector('.entrance-flames').getAttribute('aria-hidden'),'true');const css=fs.readFileSync(require.resolve('../lounge.css'),'utf8');assert.match(css,/\.reduce-effects \.entrance-flames i\{animation:none/);assert.match(css,/\.lounge-route \.beat-particle.flame/);assert.match(html,/classList.contains\('lounge-route'\)\?'flames'/);a.close();
});
