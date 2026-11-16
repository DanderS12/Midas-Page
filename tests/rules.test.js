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
test('only the recipient can mark a DM read, without changing its content',async()=>{
  await seed();await assertSucceeds(updateDoc(doc(user('receiver').firestore(),'dms/message'),{read:true}));
  await assertFails(updateDoc(doc(user('sender').firestore(),'dms/message'),{read:true}));
  await assertFails(updateDoc(doc(user('receiver').firestore(),'dms/message'),{read:true,text:'tampered'}));
});
test('member blocks prevent new contact in either direction and cannot be removed by the target',async()=>{
  await seed();await assertSucceeds(setDoc(doc(user('receiver').firestore(),'memberBlocks/receiver/blocked/sender'),{target:'sender',ts:1}));
  await assertFails(setDoc(doc(user('sender').firestore(),'dms/new'),message));
  await assertFails(setDoc(doc(user('receiver').firestore(),'dms/reverse'),{...message,from:'receiver',to:'sender'}));
  await assertFails(setDoc(doc(user('sender').firestore(),'friends/sender_receiver'),{from:'sender',to:'receiver',status:'pending',ts:1}));
  await assertFails(setDoc(doc(user('sender').firestore(),'wall/post'),{from:'sender',to:'receiver',fromName:'Sender',text:'Hello',ts:1}));
  await assertFails(deleteDoc(doc(user('sender').firestore(),'memberBlocks/receiver/blocked/sender')));
  await assertFails(getDoc(doc(user('sender').firestore(),'memberBlocks/receiver/blocked/sender')));
  await assertSucceeds(deleteDoc(doc(user('receiver').firestore(),'memberBlocks/receiver/blocked/sender')));
  await assertSucceeds(setDoc(doc(user('sender').firestore(),'dms/after'),message));
});
test('reports are admin-readable only and message references must belong to the reporter',async()=>{
  await seed();const report={reporter:'receiver',target:'sender',messageId:'message',reason:'Unwanted contact',status:'open',ts:1};
  await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'users/sender'),{...room,uid:'sender'}));
  await assertSucceeds(setDoc(doc(user('receiver').firestore(),'reports/one'),report));
  await assertFails(getDoc(doc(user('sender').firestore(),'reports/one')));
  await assertFails(getDoc(doc(user('receiver').firestore(),'reports/one')));
  await assertSucceeds(getDoc(doc(admin(),'reports/one')));
  await assertFails(setDoc(doc(user('stranger').firestore(),'reports/forged'),{...report,reporter:'stranger'}));
  await assertFails(updateDoc(doc(user('receiver').firestore(),'reports/one'),{status:'resolved'}));
  await assertSucceeds(updateDoc(doc(admin(),'reports/one'),{status:'resolved'}));
});
test('announcement expiration is numeric and admin-only',async()=>{
  await assertSucceeds(setDoc(doc(admin(),'announcements/news'),{text:'News',ts:1,expiresAt:2000}));
  await assertFails(setDoc(doc(admin(),'announcements/invalid'),{text:'News',ts:1,expiresAt:'tomorrow'}));
  await assertFails(setDoc(doc(user('sender').firestore(),'announcements/forged'),{text:'News',ts:1,expiresAt:0}));
});
test('new room creation requires an atomic unique-name reservation',async()=>{
  await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'settings/site'),{namesReady:true}));
  const first=user('first').firestore(),second=user('second').firestore();
  await assertFails(setDoc(doc(first,'users/first'),{...room,uid:'first',name:'Unique Name'}));
  const batch=writeBatch(first);batch.set(doc(first,'displayNames/unique name'),{uid:'first'});batch.set(doc(first,'users/first'),{...room,uid:'first',name:'Unique Name'});await assertSucceeds(batch.commit());
  const duplicate=writeBatch(second);duplicate.set(doc(second,'displayNames/unique name'),{uid:'second'});duplicate.set(doc(second,'users/second'),{...room,uid:'second',name:'UNIQUE NAME'});await assertFails(duplicate.commit());
  await assertFails(updateDoc(doc(first,'users/first'),{name:'Unreserved'}));
  await assertFails(deleteDoc(doc(second,'displayNames/unique name')));
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(),'displayNames/unique name')));
  await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(),'displayNames')));
});
test('legacy profile edits preserve their name without forcing an automatic rename',async()=>{
  await seed();await assertSucceeds(updateDoc(doc(user('creator').firestore(),'users/creator'),{about:'My new bio'}));
  await assertFails(updateDoc(doc(user('creator').firestore(),'users/creator'),{name:'Unclaimed'}));
});
test('assigned creator may customize website button but cannot change page ownership',async()=>{
  await seed();const page=doc(user('creator').firestore(),'sponsors/page');
  await assertSucceeds(updateDoc(page,{link:'https://example.com',buttonLabel:'My shop',buttonBg:'#112233',buttonColor:'#ffffff',buttonShape:'pill'}));
  await assertFails(updateDoc(page,{buttonBg:'red;position:fixed'}));
  await assertFails(updateDoc(page,{buttonShape:'script'}));
  await assertFails(updateDoc(page,{owner:'stranger'}));
  await assertFails(updateDoc(doc(user('stranger').firestore(),'sponsors/page'),{buttonLabel:'Hijack'}));
});
