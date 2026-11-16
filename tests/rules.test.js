// Run only against local emulators: see SETUP.md. Never connect these tests to production.
const { test, before, after, beforeEach } = require('node:test');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc } = require('firebase/firestore');
const { ref, uploadBytes, getBytes } = require('firebase/storage');
const { readFileSync } = require('node:fs');
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId:'demo-midas-community',
    firestore:{host:'127.0.0.1',port:8080,rules:readFileSync('firestore.rules','utf8')},
    storage:{host:'127.0.0.1',port:9199,rules:readFileSync('storage.rules','utf8')} });
});
after(async () => { if(env)await env.cleanup(); });
beforeEach(async()=>{await env.clearFirestore();await env.clearStorage();});
function user(uid){return env.authenticatedContext(uid,{email:uid+'@example.com'});}
async function seed(){await env.withSecurityRulesDisabled(async ctx=>{
  await setDoc(doc(ctx.firestore(),'sponsors/page'),{kind:'creator',owner:'creator',name:'Artist',blurb:'Bio',link:'',img:'',ts:1});
  await setDoc(doc(ctx.firestore(),'memberDirectory/creator'),{email:'creator@example.com'});
  await setDoc(doc(ctx.firestore(),'loginHistory/entry'),{email:'creator@example.com',ts:1});
  await setDoc(doc(ctx.firestore(),'dms/message'),{from:'sender',to:'receiver',fromName:'Sender',text:'',ts:1,imagePath:'dm/sender/receiver/message',imageType:'image/png',imageBytes:1,imageName:'photo.png'});
});}
test('public creator read, owner content update, no owner reassignment',async()=>{
  await seed();await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(),'sponsors/page')));
  await assertSucceeds(updateDoc(doc(user('creator').firestore(),'sponsors/page'),{blurb:'Updated'}));
  await assertFails(updateDoc(doc(user('stranger').firestore(),'sponsors/page'),{blurb:'Hijack'}));
  await assertFails(updateDoc(doc(user('creator').firestore(),'sponsors/page'),{owner:'stranger'}));
  await assertFails(updateDoc(doc(user('creator').firestore(),'sponsors/page'),{kind:'sponsor'}));
});
test('directory and login history are admin-only and cannot be forged',async()=>{
  await seed();const ctx=user('creator').firestore();
  await assertFails(getDoc(doc(ctx,'memberDirectory/creator')));await assertFails(getDoc(doc(ctx,'loginHistory/entry')));
  await assertFails(setDoc(doc(ctx,'loginHistory/forged'),{ts:1}));await assertFails(setDoc(doc(ctx,'siteRoles/creator'),{role:'admin'}));
});
test('DM text or image required, participant reads only, forged attachment rejected',async()=>{
  await seed();await assertSucceeds(getDoc(doc(user('receiver').firestore(),'dms/message')));
  await assertFails(getDoc(doc(user('stranger').firestore(),'dms/message')));
  const base={from:'sender',to:'receiver',fromName:'Sender',text:'',ts:1};
  await assertFails(setDoc(doc(user('sender').firestore(),'dms/empty'),base));
  await assertFails(setDoc(doc(user('sender').firestore(),'dms/bad'),{...base,imagePath:'dm/other/receiver/bad',imageType:'image/png',imageBytes:1,imageName:'a.png'}));
  await assertSucceeds(setDoc(doc(user('sender').firestore(),'dms/text'),{...base,text:'Hello'}));
});
test('email block denies existing sessions and cannot be removed by the member',async()=>{
  await seed();await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'blockedEmails/receiver@example.com'),{value:'receiver@example.com'}));
  await assertFails(getDoc(doc(user('receiver').firestore(),'dms/message')));
  await assertFails(deleteDoc(doc(user('receiver').firestore(),'blockedEmails/receiver@example.com')));
});
test('storage image reads require message membership and uploads enforce 10 MiB',async()=>{
  await seed();const sender=user('sender').storage();
  await assertSucceeds(uploadBytes(ref(sender,'dm/sender/receiver/message'),new Uint8Array([1]),{contentType:'image/png'}));
  await assertSucceeds(getBytes(ref(user('receiver').storage(),'dm/sender/receiver/message')));
  await assertFails(getBytes(ref(user('stranger').storage(),'dm/sender/receiver/message')));
  await assertFails(uploadBytes(ref(sender,'dm/sender/receiver/oversize'),new Uint8Array(10*1024*1024+1),{contentType:'image/png'}));
  await assertFails(uploadBytes(ref(sender,'dm/sender/receiver/svg'),new Uint8Array([1]),{contentType:'image/svg+xml'}));
});
