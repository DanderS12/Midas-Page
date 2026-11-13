# Midas-Page
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>The Midas Room</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Lora:wght@400;600&display=swap">
<style>
:root{--bg:#0b0805;--panel:#17110a;--gold:#f5c542;--gold2:#c8921b;--gold3:#fff1b0;--text:#f3e6c4;--muted:#b9a273;color-scheme:dark;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*,*:before,*:after{box-sizing:inherit}
body{margin:0;background:radial-gradient(ellipse at top,#2a1c06 0,var(--bg) 60%);color:var(--text);font-family:Lora,Georgia,serif;min-height:100vh}
#glitter{position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.wrap{position:relative;z-index:1;max-width:980px;margin:0 auto;padding:20px 16px 110px}
h1,h2,h3,nav a,button,.btn{font-family:Cinzel,Georgia,serif}
.gold{background:linear-gradient(90deg,var(--gold2),var(--gold3),var(--gold),var(--gold2));background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 5s linear infinite}
@keyframes shine{to{background-position:200% 0}}
header{position:relative;text-align:center;padding:18px clamp(104px,22vw,190px) 6px}
.corner{position:absolute;top:8px;left:0;width:clamp(90px,20vw,170px);aspect-ratio:2/3;object-fit:cover;object-position:top;border:2px solid var(--gold2);border-radius:10px;box-shadow:0 0 22px rgba(245,197,66,.5);cursor:zoom-in}
h1{font-size:clamp(2rem,7vw,3.6rem);margin:0;letter-spacing:.08em}
.sub{color:var(--muted);font-style:italic;margin:4px 0 0}
nav{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:18px 0 22px;position:sticky;top:env(safe-area-inset-top,0px);padding:8px 0;background:linear-gradient(var(--bg),rgba(11,8,5,.85));z-index:5}
nav a{color:var(--gold);text-decoration:none;border:1px solid var(--gold2);padding:8px 16px;border-radius:999px;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase}
nav a.on,nav a:hover{background:linear-gradient(135deg,var(--gold2),var(--gold));color:#1a1204}
.card{background:linear-gradient(160deg,#1f1609,var(--panel));border:1px solid var(--gold2);border-radius:14px;padding:18px;margin-bottom:18px;box-shadow:0 0 24px rgba(245,197,66,.12),inset 0 0 30px rgba(245,197,66,.04)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.ph{position:relative;border:2px solid var(--gold2);border-radius:10px;overflow:hidden;background:#000;box-shadow:0 0 14px rgba(245,197,66,.25)}
.ph img{display:block;width:100%;aspect-ratio:1;object-fit:cover;cursor:zoom-in}
.ph p{margin:0;padding:8px 10px;font-size:.85rem;color:var(--gold3)}
button,.btn{background:linear-gradient(135deg,var(--gold2),var(--gold),var(--gold3));color:#1a1204;border:0;border-radius:8px;padding:10px 18px;font-weight:700;letter-spacing:.06em;cursor:pointer;font-size:.9rem;text-decoration:none;display:inline-block}
button.del{background:#5a1010;color:#ffd7d7;padding:5px 10px;font-size:.75rem}
.ph button.del{position:absolute;top:6px;right:6px}
input,textarea{width:100%;background:#0e0a04;color:var(--text);border:1px solid var(--gold2);border-radius:8px;padding:10px;font:inherit;margin-bottom:10px}
label{display:block;color:var(--gold);font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;margin:10px 0 4px}
.cm{border-bottom:1px solid #3a2a0c;padding:10px 0}.cm b{color:var(--gold)}.cm small{color:var(--muted);margin-left:8px}
.cm p{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
.center{text-align:center}.muted{color:var(--muted)}.note{font-size:.82rem;color:var(--muted)}
.disc{width:150px;height:150px;border-radius:50%;margin:10px auto 18px;background:conic-gradient(var(--gold2),var(--gold3),var(--gold),var(--gold2),var(--gold3),var(--gold2));border:6px solid #1a1204;box-shadow:0 0 40px rgba(245,197,66,.5);position:relative}
.disc:after{content:"";position:absolute;inset:42%;border-radius:50%;background:var(--bg)}
.disc.spin{animation:spin 4s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
audio{width:100%;margin:12px 0}
#gate{position:fixed;inset:0;z-index:50;background:radial-gradient(ellipse at center,#2a1c06,#050302);display:flex;align-items:center;justify-content:center;padding:20px}
#gate .card{max-width:380px;width:100%;text-align:center}
#lb{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:40;display:none;align-items:center;justify-content:center;padding:16px}
#lb img{max-width:100%;max-height:100%;border:3px solid var(--gold2);border-radius:8px}
.err{color:#ff9d9d;min-height:1.2em;font-size:.85rem}
#bar{position:fixed;left:0;right:0;bottom:0;z-index:20;display:none;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));background:linear-gradient(#17110a,#0b0805);border-top:1px solid var(--gold2);box-shadow:0 -6px 24px rgba(245,197,66,.2)}
#bar span{font-family:Cinzel,Georgia,serif;color:var(--gold);font-size:.85rem}
#bar audio{flex:1 1 220px;max-width:420px;margin:0}
@media (prefers-reduced-motion:reduce){.gold,.disc.spin{animation:none}}
</style>
</head>
<body>
<canvas id="glitter"></canvas>

<div id="gate"><div class="card">
  <h1 class="gold" style="font-size:2.2rem">The Midas Room</h1>
  <p class="sub">Everything here turns to gold.</p>
  <label for="gp">Password</label>
  <input id="gp" type="password" autocomplete="off" placeholder="Enter the password">
  <div class="err" id="gerr"></div>
  <button id="gbtn">Enter</button>
</div></div>

<div id="lb"><img alt=""></div>
<div id="bar"><span id="bt"></span><audio id="au" controls loop preload="auto"></audio></div>

<div class="wrap">
  <header><img class="corner" id="cr" src="/_blob/bfed15895538fb657433ee42c93e9a5b" alt="Golden portrait" onclick="document.getElementById('lb').querySelector('img').src=this.src;document.getElementById('lb').style.display='flex'"><h1 class="gold">The Midas Room</h1><p class="sub">A private gallery of golden moments</p></header>
  <nav id="nav">
    <a href="#home">Gallery</a><a href="#comic">Comic</a><a href="#story">Story</a><a href="#give">Donate</a><a href="#admin">Admin</a>
  </nav>
  <main id="view"></main>
</div>

<script>
(function(){
var PW="gold";
var state={photos:[],comments:[],comics:[],settings:{}};
var db=null,assets=null,view=document.getElementById("view");
var isAdmin=false;

function h(tag,attrs,kids){var e=document.createElement(tag);for(var k in (attrs||{})){if(k==="text")e.textContent=attrs[k];else if(k.slice(0,2)==="on")e.addEventListener(k.slice(2),attrs[k]);else e.setAttribute(k,attrs[k]);}(kids||[]).forEach(function(c){if(c)e.appendChild(c);});return e;}
function store(k,v){try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v);}catch(e){return null;}}
function lstore(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}

/* ---------- gate ---------- */
var gate=document.getElementById("gate");
function tryGate(){
  if(document.getElementById("gp").value===PW){store("midas-in","1");gate.style.display="none";}
  else document.getElementById("gerr").textContent="That is not the golden word.";
}
document.getElementById("gbtn").onclick=tryGate;
document.getElementById("gp").addEventListener("keydown",function(e){if(e.key==="Enter")tryGate();});
if(store("midas-in")==="1")gate.style.display="none";
isAdmin=store("midas-admin")==="1";

/* ---------- lightbox ---------- */
var lb=document.getElementById("lb");
lb.onclick=function(){lb.style.display="none";};
function zoom(u){lb.querySelector("img").src=u;lb.style.display="flex";}

/* ---------- routing ---------- */
function route(){
  var r=(location.hash||"#home").slice(1);
  if(["home","comic","story","give","admin"].indexOf(r)<0)r="home";
  document.querySelectorAll("#nav a").forEach(function(a){a.classList.toggle("on",a.getAttribute("href")==="#"+r);});
  view.innerHTML="";
  ({home:pHome,comic:pComic,story:pStory,give:pGive,admin:pAdmin})[r]();
  setSong({home:1,comic:2,story:3,give:4,admin:5}[r]||0);
  var cr=document.getElementById("cr");
  var pics={give:["e84e93d36ecdc2f7ab66ae4ac2f14a39","50% 12%"],story:["cc85f2227d5091e9154517e1f238c744","22% 18%"],comic:["d24070e478f488b6b1bd844020346dd2","30% 12%"]};
  var pk=pics[r]||["bfed15895538fb657433ee42c93e9a5b","top"];
  cr.src="/_blob/"+pk[0];
  cr.style.objectPosition=pk[1];
}
window.addEventListener("hashchange",route);

/* ---------- gallery + comments ---------- */
function pHome(){
  var c=h("div",{"class":"card"},[h("h2",{"class":"gold",text:"The Gallery"})]);
  var g=h("div",{"class":"grid"});
  var ps=state.photos.slice().sort(function(a,b){return b.ts-a.ts;});
  if(!ps.length)c.appendChild(h("p",{"class":"muted",text:"No photos yet. The owner can add some from the Admin page."}));
  ps.forEach(function(p){
    var d=h("div",{"class":"ph"},[h("img",{src:p.url,alt:p.cap||"Photo",onclick:function(){zoom(p.url);}})]);
    if(p.cap)d.appendChild(h("p",{text:p.cap}));
    if(isAdmin)d.appendChild(h("button",{"class":"del",text:"Delete",onclick:function(){delPhoto(p);}}));
    g.appendChild(d);
  });
  c.appendChild(g);view.appendChild(c);

  var cc=h("div",{"class":"card"},[h("h2",{"class":"gold",text:"Comments"})]);
  var nm=h("input",{placeholder:"Your name",maxlength:"40"});nm.value=lstore("midas-name")||"";
  var tx=h("textarea",{placeholder:"Leave a golden word…",rows:"3",maxlength:"500"});
  var er=h("div",{"class":"err"});
  cc.appendChild(nm);cc.appendChild(tx);cc.appendChild(er);
  cc.appendChild(h("button",{text:"Post comment",onclick:function(){
    var t=tx.value.trim();if(!t)return;
    if(!db){er.textContent="Comments need you to be signed in to claude.ai.";return;}
    lstore("midas-name",nm.value);
    var id="c"+Date.now()+Math.random().toString(36).slice(2,6);
    db.collection("comments").doc(id).set({name:nm.value.trim()||"Guest",text:t,ts:Date.now()}).then(function(){tx.value="";er.textContent="";}).catch(function(e){er.textContent="Could not post: "+(e&&e.message||"error");});
  }}));
  var list=h("div",{style:"margin-top:14px"});
  state.comments.slice().sort(function(a,b){return b.ts-a.ts;}).forEach(function(m){
    var row=h("div",{"class":"cm"},[h("b",{text:m.name}),h("small",{text:new Date(m.ts).toLocaleString()}),h("p",{text:m.text})]);
    if(isAdmin)row.appendChild(h("button",{"class":"del",text:"Delete",onclick:function(){db.collection("comments").doc(m.id).delete();}}));
    list.appendChild(row);
  });
  if(!state.comments.length)list.appendChild(h("p",{"class":"muted",text:"No comments yet. Be the first."}));
  cc.appendChild(list);view.appendChild(cc);
}
function delPhoto(p){
  if(!confirm("Delete this photo for good?"))return;
  db.collection("photos").doc(p.id).delete().then(function(){if(assets&&p.aid)assets.delete(p.aid).catch(function(){});});
}

/* ---------- music (one song per page, looping) ---------- */
var au=document.getElementById("au"),bar=document.getElementById("bar"),bt=document.getElementById("bt");
au.loop=true;
var unlocked=false,lastN=-1;
function unlock(){
  if(unlocked)return;
  if(au.getAttribute("data-u")&&au.paused){au.play().then(function(){unlocked=true;}).catch(function(){});}
  else unlocked=true;
}
["pointerdown","pointerup","click","touchend","keydown"].forEach(function(e){addEventListener(e,unlock,{passive:true});});
function setSong(n){
  var nav=n!==lastN;lastN=n;
  var url=n?state.settings["song"+n]:"";
  if(!url){au.pause();bar.style.display="none";return;}
  bar.style.display="flex";
  bt.textContent="♪ "+(state.settings["title"+n]||(n===1?"Gallery song":"Comic song"))+" (on loop)";
  var changed=au.getAttribute("data-u")!==url;
  if(changed){au.src=url;au.setAttribute("data-u",url);}
  if(unlocked&&(changed||nav)){au.play().catch(function(){});}
  else if(!unlocked){au.play().catch(function(){});}
}

/* ---------- comic ---------- */
function pComic(){
  var c=h("div",{"class":"card"},[h("h2",{"class":"gold",text:"The Comic"})]);
  var cs=state.comics.slice().sort(function(a,b){return a.ts-b.ts;});
  if(!cs.length)c.appendChild(h("p",{"class":"muted",text:"No comic pages yet. The owner can add them from the Admin page."}));
  cs.forEach(function(p,i){
    var d=h("div",{"class":"ph",style:"margin-bottom:16px"},[h("img",{src:p.url,alt:"Comic page "+(i+1),style:"aspect-ratio:auto;object-fit:contain",onclick:function(){zoom(p.url);}})]);
    d.appendChild(h("p",{text:"Page "+(i+1)+(p.cap?" - "+p.cap:"")}));
    if(isAdmin)d.appendChild(h("button",{"class":"del",text:"Delete",onclick:function(){
      if(!confirm("Delete this comic page for good?"))return;
      db.collection("comics").doc(p.id).delete().then(function(){if(assets&&p.aid)assets.delete(p.aid).catch(function(){});});
    }}));
    c.appendChild(d);
  });
  view.appendChild(c);
}

/* ---------- story ---------- */
function pStory(){
  var T=[
    "Long ago, in the land of Phrygia, there lived a king named Midas. He had a grand palace, rose gardens that smelled sweeter than any other, and more treasure than he could count. Yet the thing Midas loved most in the world was gold.",
    "One day, some of his servants found an old man asleep in the rose garden. He was Silenus, the loyal friend and teacher of Dionysus, the god of wine. Midas treated him kindly, fed him, and feasted with him for ten days before leading him safely home.",
    "Dionysus was so grateful that he offered Midas any reward he wished. Midas did not even stop to think. \u201cLet everything I touch turn to gold,\u201d he said. Dionysus warned him with a sad smile, but he granted the wish.",
    "At first it felt wonderful. A twig turned to gold in his hand. A stone gleamed like a sun. Whole rooms of his palace shone as he walked through them, and Midas laughed with joy. Then he grew hungry. The bread became a golden brick. The wine turned to molten metal and burned his lips. Even the grapes hardened in his mouth.",
    "Then his beloved daughter ran to hug him, and in an instant she was a golden statue. Midas understood at last what he had asked for. All the treasure in the world could not give him back one warm hug.",
  ];
  var c=h("div",{"class":"card"},[h("h2",{"class":"gold",text:"The Story of King Midas"}),h("p",{"class":"sub",text:"A very old Greek myth, retold"})]);
  T.forEach(function(t){c.appendChild(h("p",{text:t,style:"line-height:1.75;font-size:1.05rem"}));});
  c.appendChild(h("p",{"class":"center gold",style:"font-family:Cinzel,serif;font-size:1.3rem;margin-top:20px",text:"The End"}));
  view.appendChild(c);
}

/* ---------- donate ---------- */
function pGive(){
  var u=state.settings.donate,c=h("div",{"class":"card center"},[h("h2",{"class":"gold",text:"Share the Gold"}),
    h("p",{text:state.settings.donmsg||"If you enjoy this room, you can leave a gift. Every coin is appreciated."})]);
  if(u&&/^https:\/\//i.test(u))c.appendChild(h("a",{"class":"btn",href:u,target:"_blank",rel:"noopener noreferrer",text:"Donate"}));
  else c.appendChild(h("p",{"class":"muted",text:"The donation link has not been set up yet."}));
  view.appendChild(c);
}

/* ---------- admin ---------- */
function saveSettings(patch){
  Object.assign(state.settings,patch);
  if(!db)return Promise.reject({message:"not signed in"});
  return db.doc("settings/site").set(state.settings);
}
function pAdmin(){
  if(!isAdmin){
    var er=h("div",{"class":"err"}),pw=h("input",{type:"password",placeholder:"Admin password"});
    var go=function(){if(pw.value===PW){isAdmin=true;store("midas-admin","1");route();}else er.textContent="Wrong password.";};
    pw.addEventListener("keydown",function(e){if(e.key==="Enter")go();});
    view.appendChild(h("div",{"class":"card center"},[h("h2",{"class":"gold",text:"Admin Login"}),pw,er,h("button",{text:"Log in",onclick:go})]));
    return;
  }
  var c=h("div",{"class":"card"},[h("h2",{"class":"gold",text:"Admin"}),
    h("button",{"class":"del",text:"Log out",onclick:function(){isAdmin=false;store("midas-admin","");route();}})]);
  var msg=h("div",{"class":"note"});
  function say(t){msg.textContent=t;}

  c.appendChild(h("label",{text:"Add photos"}));
  var fi=h("input",{type:"file",accept:"image/*",multiple:"multiple"});
  var cap=h("input",{placeholder:"Caption (optional)"});
  c.appendChild(fi);c.appendChild(cap);
  c.appendChild(h("button",{text:"Upload photos",onclick:async function(){
    if(!assets||!db){say("Uploading needs you to be the signed-in owner on claude.ai.");return;}
    for(var i=0;i<fi.files.length;i++){
      try{say("Uploading "+(i+1)+" of "+fi.files.length+"…");
        var r=await assets.upload(fi.files[i]);
        var id="p"+Date.now()+i;
        await db.collection("photos").doc(id).set({url:r.url,aid:r.id,cap:cap.value,ts:Date.now()+i});
      }catch(e){say("Upload failed: "+(e&&e.message||"error"));return;}
    }
    fi.value="";cap.value="";say("Done! Photos added.");
  }}));

  c.appendChild(h("label",{text:"Add comic pages (uploaded in order)"}));
  var cf=h("input",{type:"file",accept:"image/*",multiple:"multiple"});
  c.appendChild(cf);
  c.appendChild(h("button",{text:"Upload comic pages",onclick:async function(){
    if(!assets||!db){say("Uploading needs you to be the signed-in owner on claude.ai.");return;}
    for(var i=0;i<cf.files.length;i++){
      try{say("Uploading page "+(i+1)+" of "+cf.files.length+"…");
        var r=await assets.upload(cf.files[i]);
        await db.collection("comics").doc("k"+Date.now()+i).set({url:r.url,aid:r.id,ts:Date.now()+i});
      }catch(e){say("Upload failed: "+(e&&e.message||"error"));return;}
    }
    cf.value="";say("Done! Comic pages added.");
  }}));

  [1,2,3,4,5].forEach(function(n){
    c.appendChild(h("label",{text:["Gallery","Comic","Story","Donate","Admin"][n-1]+" page song title"}));
    var t=h("input",{placeholder:"Song "+n});t.value=state.settings["title"+n]||"";
    var f=h("input",{type:"file",accept:"audio/*,video/mp4,video/webm"});
    c.appendChild(t);c.appendChild(f);
    c.appendChild(h("button",{text:"Save song "+n,onclick:async function(){
      try{var p={};p["title"+n]=t.value;
        if(f.files[0]){say("Uploading song…");var r=await assets.upload(f.files[0]);p["song"+n]=r.url;}
        await saveSettings(p);say("Song "+n+" saved.");
      }catch(e){say("Could not save: "+(e&&e.message||"error")+". If the file type was refused, try an .mp4 or .webm version of the song.");}
    }}));
  });

  c.appendChild(h("label",{text:"Donation link (https://…)"}));
  var dl=h("input",{placeholder:"https://your-donation-page"});dl.value=state.settings.donate||"";
  var dm=h("input",{placeholder:"Message above the donate button"});dm.value=state.settings.donmsg||"";
  c.appendChild(dl);c.appendChild(dm);
  c.appendChild(h("button",{text:"Save donation info",onclick:function(){
    if(dl.value&&!/^https:\/\//i.test(dl.value)){say("The link must start with https://");return;}
    saveSettings({donate:dl.value.trim(),donmsg:dm.value}).then(function(){say("Saved.");}).catch(function(e){say("Could not save: "+(e&&e.message||"error"));});
  }}));
  c.appendChild(h("p",{"class":"note",text:"Delete buttons now show on the Gallery page next to every photo and comment. To share the site, use Share in claude.ai and invite people; the site stays private until you do."}));
  c.appendChild(msg);view.appendChild(c);
}

/* ---------- data ---------- */
function snap(s){return s.docs.map(function(d){var o=d.data();o.id=d.id;return o;});}
function loaded(){
  db.doc("settings/site").onSnapshot(function(s){state.settings=(s.exists&&s.data())||{};route();});
  db.collection("photos").onSnapshot(function(s){state.photos=snap(s);route();});
  db.collection("comics").onSnapshot(function(s){state.comics=snap(s);route();});
  db.collection("comments").onSnapshot(function(s){state.comments=snap(s);if(document.activeElement.tagName!=="TEXTAREA"&&document.activeElement.tagName!=="INPUT")route();});
}
(async function(){
  try{
    if(window.claude&&claude.use){
      db=await claude.use("db");assets=await claude.use("assets");
      if(db)loaded();
    }
  }catch(e){}
})();

/* ---------- glitter ---------- */
var cv=document.getElementById("glitter"),cx=cv.getContext("2d"),W,H,dots=[];
function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;}
size();addEventListener("resize",size);
var still=matchMedia("(prefers-reduced-motion:reduce)").matches;
for(var i=0;i<90;i++)dots.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2+.6,vy:Math.random()*.5+.15,vx:(Math.random()-.5)*.3,ph:Math.random()*6.28,sp:Math.random()*.05+.02});
function tick(){
  cx.clearRect(0,0,W,H);
  dots.forEach(function(d){
    d.ph+=d.sp;if(!still){d.y+=d.vy;d.x+=d.vx+Math.sin(d.ph)*.2;}
    if(d.y>H+5){d.y=-5;d.x=Math.random()*W;}if(d.x<-5)d.x=W+5;if(d.x>W+5)d.x=-5;
    var a=.35+.65*Math.abs(Math.sin(d.ph));
    cx.fillStyle="rgba(255,"+(200+Math.floor(a*50))+",90,"+a+")";
    cx.shadowColor="#f5c542";cx.shadowBlur=8;
    cx.beginPath();
    cx.moveTo(d.x,d.y-d.r*2.2);cx.lineTo(d.x+d.r,d.y);cx.lineTo(d.x,d.y+d.r*2.2);cx.lineTo(d.x-d.r,d.y);cx.closePath();cx.fill();
  });
  requestAnimationFrame(tick);
}
tick();
route();
})();
</script>
</body>
</html>
