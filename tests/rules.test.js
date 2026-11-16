// Local emulators only. Never connect these tests to production.
const { test, before, after, beforeEach } = require('node:test');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } = require('firebase/firestore');
const { readFileSync } = require('node:fs');
let env;
const adminEmail = require('node:vm').runInNewContext(readFileSync('config.js','utf8')+';window.SITE.adminEmail',{window:{}});
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-midas-community',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync('firestore.rules','utf8')}});});
after(async()=>{if(env)await env.cleanup();});
beforeEach(async()=>{await env.clearFirestore();});
function user(uid){return env.authenticatedContext(uid,{email:uid+'@example.com',auth_time:123});}
function admin(){return env.authenticatedContext('admin',{email:adminEmail,auth_time:123}).firestore();}
const message={from:'sender',to:'receiver',fromName:'Sender',text:'',ts:1,image:'data:image/jpeg;base64,test',imageName:'photo.jpg'};
const room={uid:'creator',name:'Creator',story:'',accent:'#f5c542',bg:'#0b0805',panel:'#17110a',text:'#f3e6c4',border:'#c8921b',btn:'#f5c542',gs:'sparkle',gc:'#ffd24a',ps:'paws',pc:'#e8b230',song:'',songTitle:'',ts:1};
async function seed(){await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();
  await setDoc(doc(db,'sponsors/page'),{kind:'creator',owner:'creator',name:'Artist',blurb:'Bio',link:'',img:'',ts:1});
  await setDoc(doc(db,'memberDirectory/creator'),{uid:'creator',email:'creator@example.com'});
  await setDoc(doc(db,'users/creator'),room);
  await setDoc(doc(db,'dms/message'),message);
});}
test('public creator read, owner-only content update, no ownership escalation',async()=>{
  await seed();await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(),'sponsors/page')));
  await assertSucceeds(updateDoc(doc(user('creator').firestore(),'sponsors/page'),{blurb:'Updated'}));
  await assertFails(updateDoc(doc(user('stranger').firestore(),'sponsors/page'),{blurb:'Hijack'}));
  await assertFails(updateDoc(doc(user('creator').firestore(),'sponsors/page'),{owner:'stranger'}));
  await assertFails(updateDoc(doc(user('creator').firestore(),'sponsors/page'),{kind:'sponsor'}));
});
test('only token email populates the admin-only directory; no role escalation',async()=>{
  await seed();const db=user('creator').firestore();
  await assertFails(getDoc(doc(db,'memberDirectory/creator')));
  await assertFails(setDoc(doc(db,'memberDirectory/creator'),{uid:'creator',email:'victim@example.com'}));
  await assertSucceeds(setDoc(doc(db,'memberDirectory/creator'),{uid:'creator',email:'creator@example.com'}));
  await assertSucceeds(getDoc(doc(admin(),'memberDirectory/creator')));
  await assertFails(setDoc(doc(db,'siteRoles/creator'),{role:'admin'}));
});
test('observed session log validates identity, auth time, immutable server timestamp',async()=>{
  const db=user('creator').firestore(),entry=doc(db,'loginHistory/creator_123');
  await assertSucceeds(getDoc(entry)); // Transaction can read an absent own-session record.
  await assertSucceeds(setDoc(entry,{uid:'creator',email:'creator@example.com',authTime:123,ts:serverTimestamp()}));
  await assertFails(updateDoc(entry,{ts:serverTimestamp()}));
  await assertFails(setDoc(doc(db,'loginHistory/creator_999'),{uid:'creator',email:'creator@example.com',authTime:999,ts:serverTimestamp()}));
  await assertFails(getDocs(collection(db,'loginHistory')));
  await assertFails(getDoc(doc(user('stranger').firestore(),'loginHistory/creator_123')));
  await assertSucceeds(getDocs(collection(admin(),'loginHistory')));
});
test('DM reads are participant-only and inline image validation is enforced',async()=>{
  await seed();const sender=user('sender').firestore();
  await assertSucceeds(getDoc(doc(user('receiver').firestore(),'dms/message')));
  await assertFails(getDoc(doc(user('stranger').firestore(),'dms/message')));
  await assertSucceeds(setDoc(doc(sender,'dms/image'),message));
  await assertSucceeds(setDoc(doc(sender,'dms/text'),{from:'sender',to:'receiver',fromName:'Sender',text:'Hello',ts:1}));
  await assertFails(setDoc(doc(sender,'dms/empty'),{from:'sender',to:'receiver',fromName:'Sender',text:'',ts:1}));
  await assertFails(setDoc(doc(sender,'dms/svg'),{...message,image:'data:image/svg+xml;base64,test'}));
  await assertFails(setDoc(doc(sender,'dms/oversize'),{...message,image:'data:image/jpeg;base64,'+'a'.repeat(900000)}));
  await assertFails(setDoc(doc(sender,'dms/forged'),{...message,from:'stranger'}));
});
test('email block restricts member data; member cannot remove it',async()=>{
  await seed();await assertSucceeds(setDoc(doc(admin(),'blockedEmails/receiver@example.com'),{value:'receiver@example.com',ts:1}));
  await assertFails(getDoc(doc(user('receiver').firestore(),'dms/message')));
  await assertFails(deleteDoc(doc(user('receiver').firestore(),'blockedEmails/receiver@example.com')));
});
test('room deletion requires admin and an exact atomic archive; admin can restore',async()=>{
  await seed();await assertFails(deleteDoc(doc(user('creator').firestore(),'users/creator')));
  const db=admin();await assertFails(deleteDoc(doc(db,'users/creator')));
  const batch=writeBatch(db);batch.set(doc(db,'roomArchive/creator'),{room,deletedAt:serverTimestamp()});batch.delete(doc(db,'users/creator'));
  await assertSucceeds(batch.commit());await assertSucceeds(setDoc(doc(db,'users/creator'),room));
  await assertFails(getDoc(doc(user('stranger').firestore(),'roomArchive/creator')));
});
