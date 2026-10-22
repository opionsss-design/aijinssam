'use strict';
(() => {
const $ = s => document.querySelector(s), lessons = window.LESSONS;
const CFG=window.SAILING, WORLD={w:CFG.width,h:CFG.height}, SPAWN={x:lessons[0].harbor.x,y:lessons[0].harbor.y+30}, KEY='trade-voyage-v1';
const fresh=()=>({version:1,coins:0,done:[],treasures:[],upgrades:[],inventory:[],delivery:'none',x:SPAWN.x,y:SPAWN.y,mapVersion:CFG.layoutVersion,music:false,sfx:true,name:'',prologueSeen:false,chapters:{},collectionReward:false,treasureReward:false,finale:{step:0,completed:false}});
let state=fresh(),storageOK=true;
try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.version===1){state={...state,...s};
if(s.mapVersion!==CFG.layoutVersion){
 const previous={x:Number.isFinite(s.x)?s.x:650,y:Number.isFinite(s.y)?s.y:925};
 const port=lessons.find(l=>Math.hypot(previous.x-l.legacy.x,previous.y-(l.legacy.y+l.legacy.r+90))<160);
 state.x=port?port.harbor.x+(previous.x-port.legacy.x)*CFG.islandScale:previous.x*CFG.spacingScale;
 state.y=port?port.harbor.y+(previous.y-port.legacy.y-port.legacy.r-90)*CFG.islandScale:previous.y*CFG.spacingScale;
 state.mapVersion=CFG.layoutVersion;
}
state.coins=Math.max(0,Number(state.coins)||0);for(const k of ['done','treasures','upgrades','inventory'])if(!Array.isArray(state[k]))state[k]=[];state.done=[...new Set(state.done.filter(n=>Number.isInteger(n)&&n>=0&&n<6))];}}catch{storageOK=false;}
// Preserve island awards while introducing resumable chapter/finale progress.
if(!state.chapters||typeof state.chapters!=='object'||Array.isArray(state.chapters))state.chapters={};
if(!state.finale||typeof state.finale!=='object')state.finale={step:0,completed:false};
state.finale.step=Math.max(0,Math.min(2,Math.floor(Number(state.finale.step)||0)));
state.finale.completed=state.finale.completed===true;
const canvas=$('#sea'),ctx=canvas.getContext('2d'),map=$('#map'),mc=map.getContext('2d');
const boat={x:Number.isFinite(state.x)?state.x:SPAWN.x,y:Number.isFinite(state.y)?state.y:SPAWN.y,vx:0,vy:0,angle:-Math.PI/2};
if(boat.x<CFG.boatRadius||boat.x>WORLD.w-CFG.boatRadius||boat.y<CFG.boatRadius||boat.y>WORLD.h-CFG.boatRadius||lessons.some(l=>Math.hypot(boat.x-l.x,boat.y-l.y)<l.r+CFG.boatRadius)){boat.x=SPAWN.x;boat.y=SPAWN.y;}
let vw=innerWidth,vh=innerHeight,dpr=1,zoom=1,cam={x:boat.x,y:boat.y},near=-1,last=0,time=0,saveTime=0,trailTime=0,trail=[],started=false,toastTimer;
let encounterIndex=-1,chapterStage='story',finalView=false;
const keys=new Set();let pointer=null,joy={x:0,y:0,id:null};
const treasures=Array.from({length:18},(_,i)=>({x:(180+(i*457%2150))*CFG.spacingScale,y:(220+(i*347%1750))*CFG.spacingScale})).filter(t=>!lessons.some(l=>Math.hypot(t.x-l.x,t.y-l.y)<l.r+CFG.boatRadius+50));
const decor=Array.from({length:160},(_,i)=>({x:(i*719+83)%WORLD.w,y:(i*431+67)%WORLD.h,p:i*1.73}));
function persist(){try{state.x=Math.round(boat.x);state.y=Math.round(boat.y);localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch{if(storageOK)toast('저장 공간을 사용할 수 없어요. 이번 플레이는 계속할 수 있어요.');storageOK=false;}}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3400);}
function hud(){ if(near>=0)$('#dock-info').textContent=state.done.includes(near)?'✓ 탐험 완료 · 다시 배워 볼까요?':lessons[near].goal;$('#coins').textContent=state.coins.toLocaleString();$('#cargo').textContent=state.inventory.length;$('#progress').textContent=state.done.length+' / 6';const next=lessons.findIndex((_,i)=>!state.done.includes(i));$('#quest-title').textContent=next<0?(state.finale.completed?'무역왕의 항해는 계속돼요!':'세계 무역 본부의 초대'):lessons[next].name+'으로!';$('#quest-text').textContent=state.delivery==='accepted'?'시작섬에서 전자 제품을 목재로 교환하세요.':state.delivery==='collected'?'목재를 자원 부족섬으로 가져다주세요.':next<0?(state.finale.completed?'모든 도전을 마쳤어요! 아이템 도감도 완성해 보세요.':'항해 메뉴에서 종합 미션에 도전해 보세요. 실패한 단계부터 이어 할 수 있어요.'):lessons[next].goal;}
function resize(){vw=innerWidth;vh=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=vw*dpr;canvas.height=vh*dpr;zoom=vw<650?.80:1.02;}
addEventListener('resize',resize);resize();
function resetInput(){keys.clear();pointer=null;joy={x:0,y:0,id:null};$('#stick').style.transform='';boat.vx=boat.vy=0;}
addEventListener('keydown',e=>{if($('#modal').open)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e'&&near>=0)openIsland(near);});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();persist();}});addEventListener('pagehide',persist);
canvas.addEventListener('pointerdown',e=>{if(!started||$('#modal').open)return;canvas.setPointerCapture(e.pointerId);pointer={x:e.clientX,y:e.clientY,id:e.pointerId};});
canvas.addEventListener('pointermove',e=>{if(pointer?.id===e.pointerId){pointer.x=e.clientX;pointer.y=e.clientY;}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>pointer=null);
$('#joystick').addEventListener('pointerdown',e=>{if($('#modal').open)return;joy.id=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);moveJoy(e);});
$('#joystick').addEventListener('pointermove',e=>{if(joy.id===e.pointerId)moveJoy(e);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('#joystick').addEventListener(event,()=>{joy={x:0,y:0,id:null};$('#stick').style.transform='';});
function moveJoy(e){const b=$('#joystick').getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2,len=Math.hypot(x,y),max=b.width*.32,k=Math.min(len,max)/(len||1);joy.x=x*k/max;joy.y=y*k/max;$('#stick').style.transform=`translate(${x*k}px,${y*k}px)`;}
let audio=null,musicTimer=null,noteIndex=0;
function audioInit(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function tone(freq,duration=.15,volume=.045,type='sine'){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function sfx(win=true){if(state.sfx){audioInit();tone(win?660:240,.18);if(win)setTimeout(()=>tone(880,.25),100);}}
function music(){clearInterval(musicTimer);if(state.music){audioInit();const notes=[261.6,329.6,392,523.2,440,392,329.6,293.7];musicTimer=setInterval(()=>{if(!document.hidden)tone(notes[noteIndex++%notes.length],.65,.018,'sine');},550);}}
function show(html){
 resetInput();$('#modal-content').innerHTML=html;
 $('#modal').classList.toggle('conversation',encounterIndex>=0);
 if(encounterIndex>=0)window.Voyage3D?.setScene('encounter',{npcIndex:encounterIndex,speaker:'npc'});
 decorateChapter();
 if(!$('#modal').open)$('#modal').showModal();
 $('#modal').scrollTop=0;
}

$('#close').onclick=()=>$('#modal').close();$('#modal').addEventListener('close',()=>{if(!started){started=true;audioInit();music();}encounterIndex=-1;finalView=false;delete document.body.dataset.finale;$('#modal').classList.remove('finale-panel');window.Voyage3D?.setScene('world');resetInput();persist();});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const b=e.target.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)e.target.close();}});
$('#enter').onclick=()=>{if(near>=0)openIsland(near);};
$('#menu').onclick=openMenu;$('#journal').onclick=openJournal;
// A playable conversation opens the adventure before the separate title screen.
const PROLOGUE=window.PROLOGUE;
let storyStep=0,typeTimer=null,typing=false;
function welcome(){if(state.prologueSeen)titleScreen();else prologue(0);}
function prologue(step=0){
 resetInput();started=false;storyStep=step;const line=PROLOGUE[step];
 document.body.classList.add('cinematic');$('#story-screen').hidden=false;
 window.Voyage3D?.setScene('prologue',{speaker:line.speaker});
 $('#story-screen').innerHTML=`<div class="story-top"><a class="story-brand">⚓ 세계 무역 탐험대</a><button id="skip-story" class="glass-button">이야기 건너뛰기 ↗</button></div><div class="chapter-label"><span>THE FIRST VOYAGE</span><h2>${line.tag}</h2></div><div class="character-names"><span class="${line.speaker==='hero'?'speaking':''}">하루<small>바다를 꿈꾸는 어린 항해사</small></span><span class="${line.speaker==='npc'?'speaking':''}">나루<small>세상을 잇는 무역 길잡이</small></span></div><article class="story-dialog"><div class="dialog-line"><span class="speaker-label">${line.name}</span><span class="story-count">${String(step+1).padStart(2,'0')} / 06</span></div><p id="story-text" aria-live="polite"></p><div class="dialog-bottom"><span class="story-dots">${PROLOGUE.map((_,i)=>`<i class="${i===step?'active':''}"></i>`).join('')}</span><div><button id="story-back" class="text-button" ${step===0?'disabled':''}>이전</button><button id="story-next" class="primary">${step===5?'항해 준비하기':'다음 이야기'} →</button></div></div></article><span class="story-caption">나라와 나라, 마음과 마음을 잇는 여행</span>`;
 clearInterval(typeTimer);let n=0;const typeStart=performance.now();typing=true;
 typeTimer=setInterval(()=>{const p=$('#story-text');if(!p){clearInterval(typeTimer);return;}n=Math.floor((performance.now()-typeStart)/15);p.textContent=line.text.slice(0,n);if(n>=line.text.length){clearInterval(typeTimer);typing=false;}},15);
 $('#story-next').onclick=()=>{audioInit();if(typing){clearInterval(typeTimer);typing=false;$('#story-text').textContent=line.text;return;}if(step<5)prologue(step+1);else{state.prologueSeen=true;persist();titleScreen();}};
 $('#story-back').onclick=()=>prologue(Math.max(0,step-1));
 $('#skip-story').onclick=()=>{state.prologueSeen=true;persist();titleScreen();};
}
function titleScreen(){
 clearInterval(typeTimer);typing=false;resetInput();started=false;
 document.body.classList.add('cinematic');$('#story-screen').hidden=false;
 window.Voyage3D?.setScene('title',{speaker:'hero'});
 $('#story-screen').innerHTML=`<div class="story-top"><a class="story-brand">⚓ TRADE VOYAGE</a><span class="title-chapter">초등 사회 · 국가 간 무역</span></div><section class="title-card"><span class="title-kicker">A LITTLE CAPTAIN. A BIG WORLD.</span><h1>무역왕의<br><em>항해</em><span>세계 무역 탐험대</span></h1><p>작은 호기심으로 시작하는 커다란 모험.<br>하루와 함께 여섯 섬의 이야기를 만나 보세요.</p><button id="start" class="primary title-start">${state.done.length?'이어서 항해하기':'모험 시작하기'} <span>⟶</span></button><button id="replay-story" class="text-button">▷ 프롤로그 다시 보기</button><div class="title-features"><span>⛵ 자유로운 항해</span><span>💬 캐릭터와 대화</span><span>🏝 여섯 섬의 배움</span></div></section><div class="title-character-tag">하루 & 나루<small>새로운 세상이 우리를 기다려요</small></div><div class="title-footer"><span>교과서 86~101쪽을 바탕으로 만든 학습 모험</span><span>방향키 · WASD · 터치 조이스틱</span></div>`;
 $('#replay-story').onclick=()=>prologue(0);
 $('#start').onclick=()=>{state.prologueSeen=true;started=true;persist();audioInit();music();resetInput();$('#story-screen').hidden=true;document.body.classList.remove('cinematic');window.Voyage3D?.setScene('world');if(!storageOK)toast('이 브라우저에서는 기록이 저장되지 않을 수 있어요.');if(state.done.length===6&&!state.finale.completed)finalIntro();};
}
function islandTalk(i,step=0){
 encounterIndex=i;chapterStage='story';finalView=false;
 const l=lessons[i],line=CHAPTER_STORIES[i][step];
 show(`<span class="modal-kicker">ISLAND ${i+1} / 6 · 이야기 ${step+1} / 3</span><h2>${l.icon} ${l.name}</h2><div class="conversation-speaker">${line[0]}</div><p class="spoken-text">${line[1]}</p><div class="story-dots">${CHAPTER_STORIES[i].map((_,k)=>`<i class="${k===step?'active':''}"></i>`).join('')}</div><button id="talk-next" class="primary">${step<2?'다음 이야기':'게임 시작하기'} →</button>`);
 window.Voyage3D?.setScene('encounter',{npcIndex:i,speaker:line[0]==='하루'?'hero':'npc'});
 $('#talk-next').onclick=()=>{sfx();if(step<2)islandTalk(i,step+1);else beginIsland(i);};
}
function openMenu(){encounterIndex=-1;show(`<span class="modal-kicker">CAPTAIN'S CABIN</span><h2>선장실</h2><p>나만의 배를 꾸미고, 항해 기록을 확인해요.</p><b>🪙 보유 코인 <span id="shop-coins">${state.coins}</span></b><div id="shop"></div><div class="settings"><button id="music">배경음악 ${state.music?'켜짐':'꺼짐'}</button><button id="sfx">효과음 ${state.sfx?'켜짐':'꺼짐'}</button><button id="view-journal">학습 일지</button><button id="replay-prologue">프롤로그 다시 보기</button><button id="collection-book">아이템 도감</button>${state.done.length===6?'<button id="finale-launch">종합 미션 '+(state.finale.completed?'다시 도전':'이어 하기')+'</button>':''}${state.finale.completed?'<button id="cert">인증서 보기</button>':''}</div><footer>상품 보관함: ${state.inventory.length?state.inventory.map(i=>({electronics:'📱 교환용 전자 제품',wood:'🪵 목재',stamp0:'🍜 수출 라면',stamp1:'🍌 수입 바나나',stamp2:'🪵 목재 기념품',stamp3:'📱 전자 제품',stamp4:'🌾 밀',stamp5:'🤝 협력 휘장','golden-compass':'🧭 황금 나침반'}[i]||'상품')).join(' · '):'아직 없어요. 섬 미션으로 모아 보세요.'}<br>저장은 기기·브라우저별로 유지됩니다. 공용 기기에서는 다음 학생을 위해 기록을 초기화하세요.</footer><div class="settings"><button id="reset">학습 기록 초기화</button></div><div id="reset-confirm"></div>`);renderShop();$('#collection-book').onclick=collectionBook;if($('#finale-launch'))$('#finale-launch').onclick=finalIntro;$('#music').onclick=()=>{state.music=!state.music;music();persist();openMenu();};$('#sfx').onclick=()=>{state.sfx=!state.sfx;sfx();persist();openMenu();};$('#view-journal').onclick=openJournal;$('#replay-prologue').onclick=()=>{$('#modal').close();requestAnimationFrame(()=>prologue(0));};if($('#cert'))$('#cert').onclick=certificate;$('#reset').onclick=()=>{$('#reset-confirm').innerHTML='<p>코인, 상품, 완료 기록이 모두 지워져요. 새 탐험을 시작할까요?</p><button id="really-reset">네, 처음부터 시작</button>';$('#really-reset').onclick=()=>{state=fresh();boat.x=SPAWN.x;boat.y=SPAWN.y;boat.angle=-Math.PI/2;cam={x:boat.x,y:boat.y};persist();hud();music();$('#modal').close();toast('새 탐험을 시작해요!');};};}
function renderShop(){const items=[['sail','🟠 산호빛 돛','밝은 주황색 돛으로 바꿔요.',100],['hull','🔷 바다빛 선체','선체를 청록색으로 꾸며요.',150],['flag','🚩 탐험대 깃발','돛대에 특별한 깃발을 달아요.',200]];$('#shop').innerHTML=items.map(([id,name,desc,cost])=>`<div class="shop-row"><div><b>${name}</b><p>${desc}</p></div><button data-buy="${id}" ${state.upgrades.includes(id)||state.coins<cost?'disabled':''}>${state.upgrades.includes(id)?'장착 완료':cost+' 코인'}</button></div>`).join('');document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const item=items.find(i=>i[0]===b.dataset.buy);if(!item||state.coins<item[3]||state.upgrades.includes(item[0]))return;state.coins-=item[3];state.upgrades.push(item[0]);persist();hud();sfx();renderShop();$('#shop-coins').textContent=state.coins;toast('새 장식이 배에 적용됐어요!');});}
function openJournal(){encounterIndex=-1;show(`<span class="modal-kicker">EXPLORER'S JOURNAL</span><h2>여섯 섬의 무역 이야기</h2><p>섬 번호는 추천 순서예요. 항해는 자유롭게 할 수 있어요.<br>섬에 바로 이동하는 기능은 없어요. 미니맵을 보고 직접 찾아가 보세요.</p><div class="island-list">${lessons.map((l,i)=>`<article class="island-card"><span class="tag">${state.done.includes(i)?'✓ 학습 완료':'0'+(i+1)+' · 미탐험'}</span><h3>${l.icon} ${l.name}</h3><p>${state.done.includes(i)?l.summary:l.goal}</p><small class="tag">교과서 ${l.page} · ${i===5?'협력 휘장':l.reward+' 코인'}</small></article>`).join('')}</div><footer>갈등섬의 상황과 게임 속 국가는 교과서 개념을 적용한 가상 사례예요. 섬에서 얻는 상품은 학습용 보상이에요.</footer>`);}
function npc(l){return `<span class="modal-kicker">ISLAND ${lessons.indexOf(l)+1} / 6 · 교과서 ${l.page}</span><h2>${l.icon} ${l.name}</h2><div class="npc"><span class="avatar npc-avatar">${l.avatar}</span><p><b>💬 ${l.npc}</b><br>${l.intro}</p></div>`;}
function openIsland(i){if(!started)return;resetInput();islandTalk(i);}
function beginIsland(i){chapterStage='game';const l=lessons[i];sfx();if(i===0&&state.delivery==='accepted'){show(npc(l)+'<h3>자원 부족섬에서 왔군요!</h3><p>시작섬은 숲이 풍부하지만 전자 제품을 만들 기술이 부족해요. 가져온 전자 제품을 목재와 바꾸면 두 섬 모두 필요한 것을 얻어요.</p><button id="exchange" class="primary">📱 전자 제품 1개 ↔ 🪵 목재 1개 교환</button>');$('#exchange').onclick=()=>{if(state.delivery!=='accepted')return;state.inventory=state.inventory.filter(x=>x!=='electronics');state.inventory.push('wood');state.delivery='collected';persist();hud();sfx();show('<div class="success"><div class="reward">📱 ⇄ 🪵</div><h2>서로 필요한 것을 얻었어요!</h2><p>이제 목재를 싣고 자원 부족섬으로 돌아가세요.</p><button id="sail-back" class="primary">바다로 돌아가기</button></div>');$('#sail-back').onclick=()=>$('#modal').close();};return;}
if(state.done.includes(i)){show(npc(l)+`<div class="summary">✓ ${l.summary}</div><p>이 섬의 보상은 이미 받았어요. 학습 일지에서도 내용을 다시 볼 수 있어요.</p><button id="review" class="primary">한 번 더 학습하기</button>${state.done.length===6?'<button id="certificate">종합 미션으로</button>':''}`);$('#review').onclick=()=>launch(i,true);if($('#certificate'))$('#certificate').onclick=finalIntro;return;}launch(i,false);}
function launch(i,review=false){
 chapterStage='game';finalView=false;
 const l=lessons[i],progress=chapterProgress(i);
 if(!review&&progress.gameDone){if(progress.quizStep>=8)awardIsland(i);else quiz(i,progress.quizStep,false);return;}
 if(i===5&&!review&&state.done.filter(x=>x<5).length<5){show(npc(l)+'<div class="summary">먼저 다른 다섯 섬을 완료해 주세요.</div>');return;}
 if(i===0)routeGame(i,review);
 else if(i===4)negotiationGame(i,review);
 else if(l.type==='sort')sortMission(i,review);
 else if(l.type==='resource')resource(i,review);
 else match(i,review);
}
function quiz(i,step=0,review=false){
 chapterStage='quiz';const l=lessons[i],q=l.questions[step];
 show(`<span class="modal-kicker">${l.name} · 배움 확인</span><h2>퀴즈 ${step+1} / 8</h2><progress class="quiz-progress" value="${step}" max="8" aria-label="퀴즈 진행"></progress><h3>${q.q}</h3><div class="choices">${q.options.map((o,k)=>`<button data-answer="${k}">${String.fromCharCode(65+k)}. ${o}</button>`).join('')}</div><div class="hint" id="hint" role="status"></div>`);
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{
  if(Number(b.dataset.answer)!==q.answer){$('#hint').textContent='💡 '+q.hint;sfx(false);return;}
  document.querySelectorAll('[data-answer]').forEach(x=>x.disabled=true);
  if(!review){chapterProgress(i).quizStep=step+1;persist();}
  sfx();$('#hint').textContent='✓ 잘 생각했어요! '+q.hint;
  const next=document.createElement('button');next.id='quiz-next';next.className='primary';next.textContent=step<7?'다음 퀴즈 →':'배움 마무리하기 →';
  next.onclick=()=>step<7?quiz(i,step+1,review):awardIsland(i,review);$('#modal-content').append(next);
 });
}
function sortMission(i,review){const l=lessons[i];let selected=null,placed=new Set(),drag=null;show(npc(l)+`<div id="cards" class="goods">${l.cards.map((c,k)=>`<button class="good" data-card="${k}">${c.text}</button>`).join('')}</div><div class="warehouse-row"><div class="warehouse" data-zone="export" role="button" tabindex="0" aria-label="수출 창고"><b>📤 수출 창고</b><small>우리나라 → 다른 나라</small></div><div class="warehouse" data-zone="import" role="button" tabindex="0" aria-label="수입 창고"><b>📥 수입 창고</b><small>다른 나라 → 우리나라</small></div></div><div id="hint" class="hint" role="status">카드를 끌거나, 카드와 창고를 차례로 누르세요. 0 / ${l.cards.length}</div>`);
function pick(k){selected=k;document.querySelectorAll('[data-card]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.card)===k));}
function put(zone){if(selected===null)return;const c=l.cards[selected];if(c.answer!==zone.dataset.zone){$('#hint').textContent='💡 우리나라를 기준으로, 물건이 나가는지 들어오는지 살펴보세요.';sfx(false);return;}if(placed.has(selected))return;placed.add(selected);const node=document.createElement('div');node.className='placed';node.textContent=c.text;zone.append(node);$(`[data-card="${selected}"]`).remove();selected=null;sfx();$('#hint').textContent=`✓ 잘 분류했어요! ${placed.size} / ${l.cards.length}`;if(placed.size===l.cards.length){const btn=document.createElement('button');btn.className='primary';btn.textContent='분류 완료! 배움 정리 →';btn.onclick=()=>miniGameComplete(i,review);$('#modal-content').append(btn);}}
document.querySelectorAll('[data-card]').forEach(b=>{b.onclick=()=>pick(Number(b.dataset.card));b.addEventListener('pointerdown',e=>{pick(Number(b.dataset.card));b.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,ghost:null};});b.addEventListener('pointermove',e=>{if(!drag)return;if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){drag.ghost=document.createElement('div');drag.ghost.className='drag-ghost';drag.ghost.textContent=b.textContent;document.body.append(drag.ghost);}if(drag.ghost){drag.ghost.style.left=e.clientX+12+'px';drag.ghost.style.top=e.clientY+12+'px';}document.querySelectorAll('[data-zone]').forEach(z=>z.classList.toggle('over',within(e,z)));});b.addEventListener('pointerup',e=>{const moved=!!drag?.ghost;drag?.ghost?.remove();drag=null;document.querySelectorAll('[data-zone]').forEach(z=>{z.classList.remove('over');if(moved&&within(e,z))put(z);});});b.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null;document.querySelectorAll('[data-zone]').forEach(z=>z.classList.remove('over'));});});document.querySelectorAll('[data-zone]').forEach(z=>{z.onclick=()=>put(z);z.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();put(z);}};});}
function within(e,z){const r=z.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
function resource(i,review){const l=lessons[i];if(state.delivery==='delivered'&&!review){miniGameComplete(i,false);return;}if(review){show(npc(l)+'<div class="summary">전자 제품 1개를 내주고 목재 1개를 받아요. 양쪽 섬 모두 필요한 물품을 얻는 교환을 다시 만들어 보세요.</div><button id="review-exchange" class="primary">📱 전자 제품 ↔ 🪵 목재 교환</button>');$('#review-exchange').onclick=()=>miniGameComplete(i,true);return;}if(state.delivery==='none'){show(npc(l)+'<div class="summary">의뢰 경로<br>📱 자원 부족섬 → 🌴 시작섬에서 교환 → 🪵 자원 부족섬으로 운반</div><p>교환용 전자 제품은 무료로 실어 드릴게요. 바다에서 시작섬을 찾아 항구로 들어가세요.</p><button id="accept" class="primary">의뢰 받기 · 전자 제품 싣기</button>');$('#accept').onclick=()=>{if(state.delivery!=='none')return;state.delivery='accepted';state.inventory.push('electronics');persist();hud();$('#modal').close();toast('📱 전자 제품을 실었어요. 시작섬으로 항해하세요!');};}else if(state.delivery==='accepted'){show(npc(l)+'<p>아직 목재가 없어요. 시작섬의 항구에 들어가 교환해 주세요. 미니맵의 ①이 시작섬이에요.</p>');}else if(state.delivery==='collected'){show(npc(l)+'<div class="reward">🪵</div><p>목재가 도착했어요! 이제 집을 수리할 수 있겠어요. 시작섬도 필요한 전자 제품을 얻었지요.</p><button id="deliver" class="primary">목재 전달하고 의뢰 완료</button>');$('#deliver').onclick=()=>{if(state.delivery!=='collected')return;state.inventory=state.inventory.filter(x=>x!=='wood');state.delivery='delivered';miniGameComplete(i,false);};}}
function match(i,review){const l=lessons[i];show(npc(l)+`<div class="trade-row">${l.pairs.map((p,k)=>`<label>${p.label}<select data-pair="${k}" aria-label="${p.label}">${l.options.map(o=>`<option value="${o.value}">${o.text}</option>`).join('')}</select></label>`).join('')}</div><div id="hint" class="hint" role="status"></div><button id="check-plan" class="primary">${i===5?'상생의 교역 계획 실행':'교역 상대 확인'} →</button>`);$('#check-plan').onclick=()=>{const selects=[...document.querySelectorAll('[data-pair]')];const wrong=selects.findIndex((s,k)=>s.value!==l.pairs[k].answer);if(wrong>=0){$('#hint').textContent=i===5?'💡 '+(wrong+1)+'번째 항로를 살펴보세요. 보내는 물건을 실제로 필요로 하는 나라에 보내야 해요.':'💡 '+(wrong+1)+'번째 나라가 부족한 물건은 무엇인가요? 그 물건을 잘 만드는 나라를 찾아보세요.';selects[wrong].focus();sfx(false);return;}miniGameComplete(i,review);};}
function confetti(){const box=$('#confetti');box.replaceChildren();for(let i=0;i<45;i++){const p=document.createElement('i');p.className='confetto';p.style.left=Math.random()*100+'%';p.style.background=['#f3c65e','#6ccb99','#ff9976','#f9f5d8'][i%4];p.style.animationDelay=Math.random()*.5+'s';box.append(p);}setTimeout(()=>box.replaceChildren(),3300);}
function awardIsland(i,review=false){
 chapterStage='reward';const l=lessons[i],already=state.done.includes(i);let bonus=[];
 if(!already&&!review){state.done.push(i);state.coins+=l.reward;if(!state.inventory.includes('stamp'+i))state.inventory.push('stamp'+i);bonus=claimCollections();persist();hud();}
 sfx();confetti();
 show(`<div class="success"><span class="modal-kicker">CHAPTER COMPLETE · 퀴즈 8 / 8</span><div class="reward">🎉</div><h2>${l.name} 탐험 완료!</h2><p>${already||review?'복습 완료! 보상은 처음 완료할 때 한 번 받아요.':`🪙 +${l.reward} 코인 · ${COLLECTIBLES[i]} 획득`}</p>${bonus.map(t=>`<div class="collection-bonus">${t}</div>`).join('')}<div class="summary">${l.summary}</div><p class="tiny">교과서 ${l.page}</p><button id="continue" class="primary">${state.done.length===6?'세계 무역 본부로 출발 →':'다음 항해로 출발 →'}</button></div>`);
 $('#continue').onclick=()=>state.done.length===6?finalIntro():$('#modal').close();
}
function certificate(){if(!state.finale.completed){finalIntro();return;}finalView=false;encounterIndex=-1;show(`<div class="certificate"><span class="modal-kicker">WORLD TRADE EXPLORERS</span><div class="reward">🏅</div><h2>무역왕 인증서</h2><input id="captain-name" placeholder="선장 이름을 입력하세요" maxlength="20" aria-label="인증서 선장 이름"><p>위 탐험가는 여섯 섬의 항해와 학습을 마치고<br>수출과 수입, 무역의 필요성,<br>경쟁과 상호 의존의 의미를 탐구하였으므로<br><b>세계 무역 탐험대의 무역왕</b>으로 인증합니다.</p><p>⛵ 특별 보상 · 황금 범선<br>학습 완료 6 / 6</p><small>무역왕의 항해: 세계 무역 탐험대</small></div><div class="settings"><button id="print" class="primary">인증서 인쇄 / PDF 저장</button><button id="back-sea">황금 범선 타러 가기</button></div>`);$('#captain-name').value=state.name;$('#captain-name').oninput=e=>{state.name=e.target.value;persist();};$('#print').onclick=()=>window.print();$('#back-sea').onclick=()=>$('#modal').close();}
// Chapter presentation, persistent learning checkpoints and collection rewards.
const COLLECTIBLES=['🍜 수출 라면','🍌 수입 바나나','🪵 목재 기념품','📱 전자 제품','🌾 밀','🤝 협력 휘장'];
function chapterProgress(i){
 let p=state.chapters[i];if(!p||typeof p!=='object')p=state.chapters[i]={gameDone:false,quizStep:0};
 p.quizStep=Math.max(0,Math.min(8,Math.floor(Number(p.quizStep)||0)));return p;
}
function decorateChapter(){
 const modal=$('#modal'),content=$('#modal-content');modal.classList.toggle('finale-panel',finalView);
 if(!finalView)delete document.body.dataset.finale;
 modal.dataset.stage=chapterStage;
 if(encounterIndex<0||finalView)return;
 const nav=document.createElement('nav');nav.className='chapter-nav';nav.setAttribute('aria-label','섬 학습 진행');
 nav.innerHTML=`<button id="chapter-map">◀ 지도</button><ol>${[['story','이야기'],['game','게임'],['quiz','퀴즈 8개']].map(([key,label])=>`<li ${chapterStage===key?'aria-current="step"':''}>${label}</li>`).join('')}</ol>`;
 const visual=document.createElement('figure');visual.className='chapter-illustration';
 visual.style.backgroundImage=getComputedStyle($('#storybook-scene')).backgroundImage;
 const crop=document.createElement('span');crop.className='chapter-hero';const image=document.createElement('img');image.src=$('.illustrated-actor.hero img').src;image.alt='지도를 보며 탐험하는 어린 항해사 하루';image.onerror=()=>image.hidden=true;crop.append(image);visual.append(crop);
 const caption=document.createElement('figcaption');caption.textContent=lessons[encounterIndex].goal;visual.append(caption);
 content.prepend(nav,visual);$('#chapter-map').onclick=()=>modal.close();
}
function miniGameComplete(i,review=false){
 if(!review){chapterProgress(i).gameDone=true;persist();}
 sfx();chapterStage='game';show(npc(lessons[i])+'<div class="summary">🎯 게임 성공! 이제 퀴즈 8개로 배운 내용을 확인해요.</div><button id="start-quiz" class="primary">퀴즈 시작하기 →</button>');
 $('#start-quiz').onclick=()=>quiz(i,review?0:chapterProgress(i).quizStep,review);
}
function routeGame(i,review){
 const cards=[['🇰🇷 한국 → 🇧🇷 브라질','라면을 팔아요.',true],['🏠 우리 동네 → 옆 동네','국내산 사과를 팔아요.',false],['🇫🇷 프랑스 → 🇰🇷 한국','한국이 치즈를 사 와요.',true],['🧒 친구 → 친구','연필을 빌려요.',false],['🇰🇷 한국 → 🇺🇸 미국','영화 이용권을 팔아요.',true]],selected=new Set();
 show(npc(lessons[i])+'<h3>🗺️ 무역 항로를 열어라!</h3><p>다섯 항로 중 무역이 이루어지는 항로 3개를 골라 주세요. 다시 누르면 선택을 취소해요.</p><div class="route-board">'+cards.map(([route,item],k)=>`<button data-route="${k}" aria-pressed="false"><b>${route}</b><small>${item}</small></button>`).join('')+'</div><div id="hint" class="hint" role="status">선택한 항로 0 / 3</div><button id="route-check" class="primary">선택한 항로 열기 →</button>');
 document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{const k=Number(b.dataset.route);if(selected.has(k))selected.delete(k);else selected.add(k);b.setAttribute('aria-pressed',String(selected.has(k)));$('#hint').textContent=`선택한 항로 ${selected.size} / 3`;});
 $('#route-check').onclick=()=>{if(selected.size!==3||cards.some((c,k)=>selected.has(k)!==c[2])){$('#hint').textContent='💡 나라 사이에서 물건이나 서비스를 사고파는 항로를 골라요. 국내 거래와 빌려 주기는 구별해 보세요.';sfx(false);return;}miniGameComplete(i,review);};
}
function negotiationGame(i,review){
 show(npc(lessons[i])+'<h3>⚖️ 모두 웃는 협상 테이블</h3><div class="negotiation-board"><article>🧑‍🌾 생산자<br><b>60코인 이상</b>이면 안전하게 생산할 수 있어요.</article><article>🧑‍🍳 구매자<br><b>80코인 이하</b>로 구매할 수 있어요.</article></div><label class="price-slider">거래 가격 <output id="price-output">40</output> 코인<input id="trade-price" type="range" min="40" max="100" value="40" step="5"></label><label class="safety-check"><input id="safety-agreement" type="checkbox"> 물품의 안전 기준과 품질을 함께 확인해요.</label><div id="hint" class="hint" role="status"></div><button id="negotiate" class="primary">협상안 제안하기 →</button>');
 $('#trade-price').oninput=e=>$('#price-output').value=e.target.value;
 $('#negotiate').onclick=()=>{const price=Number($('#trade-price').value);if(price<60||price>80||!$('#safety-agreement').checked){$('#hint').textContent='💡 두 사람이 모두 받아들일 수 있는 가격 범위를 찾아요. 안전과 품질에 대한 약속도 필요해요.';sfx(false);return;}miniGameComplete(i,review);};
}
function claimCollections(){
 const messages=[];
 if(!state.collectionReward&&lessons.every((_,i)=>state.inventory.includes('stamp'+i))){state.collectionReward=true;state.coins+=500;if(!state.inventory.includes('golden-compass'))state.inventory.push('golden-compass');messages.push('🎁 기념품 6종 수집 완료! +500코인 · 황금 나침반 획득');}
 if(!state.treasureReward&&treasures.length&&treasures.every((_,i)=>state.treasures.includes(i))){state.treasureReward=true;state.coins+=300;messages.push('💎 바다 보물상자 전체 수집! +300코인 · 보물 탐험가 칭호 획득');}
 return messages;
}
function collectionBook(){
 finalView=false;encounterIndex=-1;const bonus=claimCollections();persist();hud();
 show(`<span class="modal-kicker">TREASURE COLLECTION</span><h2>🎒 탐험대 아이템 도감</h2><p>섬의 게임과 퀴즈를 마치면 기념품을 얻어요.</p><div class="collection-grid">${COLLECTIBLES.map((item,i)=>`<article class="${state.inventory.includes('stamp'+i)?'collected':''}"><span>${state.inventory.includes('stamp'+i)?item:'🔒 아직 발견하지 못했어요'}</span><small>${lessons[i].name}</small></article>`).join('')}</div><div class="collection-bonus">기념품 ${lessons.filter((_,i)=>state.inventory.includes('stamp'+i)).length} / 6<br>${state.collectionReward?'🧭 황금 나침반 · 500코인 보상 획득 완료':'6종 완성 보상: 500코인 + 황금 나침반'}</div><div class="summary">💎 바다 보물상자 ${treasures.filter((_,i)=>state.treasures.includes(i)).length} / ${treasures.length}<br>${state.treasureReward?'보물 탐험가 · 300코인 보상 획득 완료':'모두 찾으면 300코인 + 보물 탐험가 칭호'}</div>${bonus.map(t=>`<p>${t}</p>`).join('')}`);
}
function setFinalScene(view,island){
 document.body.dataset.finale=view;window.Voyage3D?.setScene('encounter',{npcIndex:island,speaker:'npc'});
 const visual=$('.finale-visual');if(visual)visual.style.backgroundImage=getComputedStyle($('#storybook-scene')).backgroundImage;
}
function finalIntro(){
 if(state.done.length<6)return;
 encounterIndex=5;finalView=true;chapterStage='finale';
 show(`<div class="finale-visual"><span>WORLD TRADE HEADQUARTERS</span></div><span class="modal-kicker">새로운 장면 · 세계 무역 본부</span><h2>🌐 마지막 항로를 연결하라!</h2><p>하루가 모은 여섯 섬의 배움으로 세계 무역 위기를 해결해요. 항로 복구 → 공급 위기 해결 → 협력 선언, 세 단계에 도전하세요.</p><div class="summary">${state.finale.completed?'종합 미션을 다시 즐길 수 있어요. 보상은 중복 지급되지 않아요.':`저장된 진행: ${state.finale.step} / 3단계 완료. 실패해도 그 단계부터 다시 시작해요.`}</div><button id="final-start" class="primary">${state.finale.completed?'종합 미션 다시 도전':'종합 미션 '+(state.finale.step?'이어 하기':'시작하기')} →</button>`);
 setFinalScene('intro',5);
 $('#final-start').onclick=()=>{if(state.finale.completed)state.finale.step=0;persist();finalMission();};
}
function finalMission(){
 if(state.done.length<6)return;
 encounterIndex=5;finalView=true;chapterStage='finale';const step=state.finale.step,task=FINAL_CHALLENGE[step];
 const activity=task.kind==='routes'?`<div class="trade-row">${task.rows.map((row,k)=>`<label>${row.label}<select data-final-route="${k}">${task.options.map(o=>`<option value="${o.value}">${o.text}</option>`).join('')}</select></label>`).join('')}</div><button id="final-submit" class="primary">항로 복구하기 →</button>`:`<div class="choices">${task.options.map((o,k)=>`<button data-final-answer="${k}">${o}</button>`).join('')}</div>`;
 show(`<div class="finale-visual"><span>FINAL MISSION ${step+1} / 3</span></div><span class="modal-kicker">종합 미션 · ${step+1} / 3</span><h2>${task.title}</h2><p>${task.intro}</p>${activity}`);setFinalScene('mission-'+step,task.scene);
 if(task.kind==='routes')$('#final-submit').onclick=()=>finalResult(task.rows.every((r,k)=>$(`[data-final-route="${k}"]`).value===r.answer));
 else document.querySelectorAll('[data-final-answer]').forEach(b=>b.onclick=()=>finalResult(Number(b.dataset.finalAnswer)===task.answer));
}
function finalResult(correct){
 const step=state.finale.step;if(!correct){sfx(false);finalView=true;show(`<div class="finale-visual"><span>다시 생각해 볼 시간</span></div><span class="modal-kicker">종합 미션 ${step+1} / 3 · 잠깐의 항로 점검</span><h2>괜찮아요! 이 단계부터 다시 도전해요.</h2><div class="summary">💡 ${FINAL_CHALLENGE[step].hint}</div><p>여섯 섬의 기록과 이미 통과한 ${step}개 단계는 유지돼요.</p><button id="final-retry" class="primary">${step+1}단계 다시 도전 →</button>`);setFinalScene('retry',4);$('#final-retry').onclick=finalMission;return;}
 sfx();if(step<2){state.finale.step++;persist();finalView=true;show(`<div class="finale-visual"><span>MISSION ${step+1} CLEAR</span></div><h2>✅ ${step+1}단계 해결!</h2><p>진행 상황을 저장했어요. 다음 현장으로 이동해요.</p><button id="final-next" class="primary">다음 장면으로 →</button>`);setFinalScene('checkpoint',5);$('#final-next').onclick=finalMission;}
 else finalSuccess();
}
function finalSuccess(){
 const first=!state.finale.completed;state.finale.completed=true;if(first)state.coins+=1000;persist();hud();sfx();confetti();finalView=true;encounterIndex=5;
 show(`<div class="finale-visual"><span>🌟 WORLD TRADE HERO 🌟</span></div><div class="success"><span class="modal-kicker">새로운 장면 · 탐험대의 귀환</span><h2>🎉 성공! 세계의 항로가 다시 연결됐어요!</h2><p>하루와 탐험대가 무역 위기를 해결했어요.<br>세 나라 모두 필요한 물건을 얻고 협력을 약속했어요.</p><div class="collection-bonus">${first?'🪙 +1,000코인 · 무역왕 칭호 · 황금 범선 획득!':'종합 미션 복습 완료! 보상은 처음 성공했을 때 받았어요.'}</div><button id="get-certificate" class="primary">무역왕 인증서 받기 →</button><button id="final-return">황금 범선 타러 가기</button></div>`);setFinalScene('success',0);$('#get-certificate').onclick=certificate;$('#final-return').onclick=()=>$('#modal').close();
}

// Procedural 2.5D graphics: all scenery is local, with no external asset dependency.
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function poly(points,color,stroke){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function line(x1,y1,x2,y2,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function text(t,x,y,size=13,color='#fff'){ctx.fillStyle=color;ctx.font=`400 ${size}px 'Jua', sans-serif`;ctx.textAlign='center';ctx.fillText(t,x,y);}
function palm(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(10,5,22,8,'#355e4225');ctx.strokeStyle='#9c7542';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(9,-28,2,-52);ctx.stroke();for(let a=0;a<6;a++){ctx.save();ctx.translate(2,-52);ctx.rotate(a*Math.PI/3);poly([[0,0],[16,-14],[35,-7],[19,-4]],a%2?'#29815b':'#399b65');ctx.restore();}ellipse(4,-48,4,4,'#c79952');ctx.restore();}
function house(x,y,color='#f2ead2',roof='#db8366',s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);poly([[0,0],[29,13],[58,0],[29,-14]],'#2a5f4425');poly([[-24,-5],[10,7],[10,-29],[-24,-41]],color);poly([[10,7],[34,-5],[34,-41],[10,-29]],'#c6cead');poly([[-30,-42],[5,-61],[40,-43],[10,-27]],roof);poly([[-30,-42],[10,-27],[5,-61]],'#f1aa78');poly([[-8,0],[2,3],[2,-17],[-8,-20]],'#6e9692');poly([[16,-17],[26,-21],[26,-32],[16,-28]],'#72adba');ctx.restore();}
function lighthouse(x,y){ellipse(x+5,y+5,24,10,'#305a5330');poly([[-15+x,y],[15+x,y],[11+x,y-67],[-11+x,y-67]],'#fff3dc');poly([[-13+x,y-28],[13+x,y-28],[12+x,y-43],[-12+x,y-43]],'#e57e61');poly([[-17+x,y-66],[17+x,y-66],[17+x,y-84],[-17+x,y-84]],'#4e8f98');poly([[-21+x,y-84],[x,y-99],[21+x,y-84]],'#e58f69');ellipse(x,y-75,9,5,'#fff4ad');}
function drawIsland(l,i){ctx.save();ctx.translate(l.x,l.y);const r=l.r;ellipse(6,15,r+55,r+40,'#74d8d323');ellipse(3,7,r+35,r+24,'#8edbd64a');ellipse(3,16,r+11,r+1,'#377f7766');ellipse(0,7,r+4,r,'#e5ce8f');ellipse(0,-2,r-8,r-15,'#f6e0a0');ellipse(-5,-12,r-24,r-30,l.color);ellipse(-30,-42,r*.48,r*.38,'#ffffff13');
// Dock extends from the southern coastline; approach from below.
ctx.fillStyle='#af7d4e';ctx.fillRect(-24,r-25,48,98);ctx.fillStyle='#d4a671';ctx.fillRect(-28,r-25,56,86);for(let yy=r-20;yy<r+61;yy+=10)line(-27,yy,27,yy,'#aa7952',2);for(const x of [-25,25]){line(x,r-20,x,r+70,'#825b40',5);ellipse(x,r+66,4,3,'#efc997');}
if(i===0){house(-25,-10);palm(-85,-16,1.1);palm(65,6,.9);palm(35,-65,.75);house(40,-34,'#f8e9c9','#77a59f',.65);}
if(i===1){house(-40,-25,'#f4dfb2','#df8b64',1.25);house(48,-43,'#f6e5bd','#5f93aa',.8);poly([[-99,3],[-68,12],[-68,-40],[-99,-50]],'#cfab70');poly([[-99,-50],[-68,-40],[-48,-49],[-79,-60]],'#e6c88c');line(80,15,80,-92,'#e5bd60',8);line(40,-90,112,-90,'#e5bd60',7);line(43,-90,43,-40,'#707f7a',2);palm(-100,-57,.6);}
if(i===2){poly([[-118,-18],[-62,-117],[5,-10]],'#849987');poly([[-62,-117],[-43,-79],[-67,-88],[-82,-82]],'#e1e4c6');poly([[-50,4],[16,-104],[91,9]],'#718e7d');poly([[16,-104],[45,-62],[19,-72],[-5,-68]],'#e2e7cd');house(51,43,'#eadfc4','#b16b4f',.8);house(-55,40,'#eae1c4','#7d9c9c',.65);}
if(i===3){house(-57,-6,'#f0e4bb','#b8786e',1.15);house(23,-42,'#f4e8ce','#7c9fa2',1.1);house(67,32,'#f1ddbc','#d99d58',.7);palm(-103,25,.8);ellipse(-5,35,21,12,'#d0d8b0');line(-5,31,-5,-5,'#e9e6ca',4);ellipse(-5,-13,14,15,'#71afb1');}
if(i===4){house(-58,10,'#d7d7be','#9d9d89',1.1);house(31,-12,'#e1ddc0','#ae8c75',1.2);poly([[20,-55],[37,-49],[37,-105],[20,-111]],'#c1c5ae');poly([[37,-49],[47,-55],[47,-111],[37,-105]],'#a4b39e');for(let j=0;j<3;j++)ellipse(32+j*15,-125-j*18,13+j*5,8+j*3,'#edf3df77');palm(-97,-40,.75);}
if(i===5){for(let x=-65;x<=65;x+=32){poly([[x,-3],[x+13,1],[x+13,-54],[x,-58]],'#f8eed0');poly([[x+13,1],[x+22,-5],[x+22,-60],[x+13,-54]],'#d3cbb1');}poly([[-82,-60],[10,-102],[97,-59],[8,-23]],'#edb764');poly([[-82,-60],[8,-23],[8,-35],[-82,-72]],'#d49b52');poly([[-75,10],[5,34],[88,8],[9,-17]],'#e7d8b0');palm(-105,20,.75);palm(100,20,.75);}
if(i===0||i===3)lighthouse(r-28,55);
ctx.setLineDash([6,7]);ctx.strokeStyle=near===i?'#fff5cc':'#e6fff788';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,r+CFG.harborOffset,70,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);text('⚓',0,r+CFG.harborOffset+5,19,'#f8ffdf');
// Floating labels use a shadow for legibility without covering scenery.
ctx.shadowColor='#11576c';ctx.shadowBlur=7;text((state.done.includes(i)?'✓ ':'0'+(i+1)+' ')+l.name,0,-r-30,25,'#fffde8');ctx.shadowBlur=0;text(state.done.includes(i)?'탐험 완료':l.reward?'🪙 '+l.reward:'협력 휘장',0,-r-3,18,'#e5fff3');ctx.restore();}
function drawBoat(){const gold=state.finale.completed;ctx.save();ctx.translate(boat.x,boat.y);ctx.scale(CFG.boatScale,CFG.boatScale);ellipse(4,11,23,15,'#0b586f44');ctx.rotate(boat.angle+Math.PI/2);ctx.translate(0,Math.sin(time*2.8)*1.5);poly([[-20,10],[-14,-22],[0,-39],[14,-22],[20,10],[11,28],[-11,28]],gold?'#b58b36':state.upgrades.includes('hull')?'#236e78':'#825437');poly([[-18,5],[-12,-23],[0,-37],[12,-23],[18,5],[9,19],[-9,19]],gold?'#e7c45d':state.upgrades.includes('hull')?'#55b2b1':'#c89359','#efc687');poly([[-11,3],[-8,-16],[0,-28],[8,-16],[11,3],[6,13],[-6,13]],gold?'#f4d77a':'#e3b67d');line(0,11,0,-40,'#76593f',3);line(-27,-10,25,-10,'#8b6a42',2);poly([[-25,-10],[-15,-41],[0,-48],[21,-12],[0,-2]],gold?'#ffe8a2':state.upgrades.includes('sail')?'#ef9472':'#fff7d8');poly([[0,-48],[21,-12],[0,-2]],gold?'#dfb64e':state.upgrades.includes('sail')?'#d76e58':'#e4e7c4');line(0,-51,0,-2,'#8d7247',2);if(state.upgrades.includes('flag')||gold){line(0,-49,0,-65,'#876840',2);poly([[1,-64],[19,-60],[1,-54]],gold?'#e3ab39':'#ed8660');}ctx.restore();}
function drawMap(){mc.clearRect(0,0,220,150);const sx=220/WORLD.w,sy=150/WORLD.h;mc.fillStyle='#9bd7d6';mc.fillRect(0,0,220,150);mc.strokeStyle='#fff4';mc.lineWidth=.5;for(let x=0;x<220;x+=22){mc.beginPath();mc.moveTo(x,0);mc.lineTo(x,150);mc.stroke();}for(let y=0;y<150;y+=15){mc.beginPath();mc.moveTo(0,y);mc.lineTo(220,y);mc.stroke();}lessons.forEach((l,i)=>{mc.fillStyle=state.done.includes(i)?'#3a9c6e':'#efdc97';mc.beginPath();mc.ellipse(l.x*sx,l.y*sy,l.r*sx,l.r*sy,0,0,7);mc.fill();mc.fillStyle='#275c5e';mc.font='12px Jua, sans-serif';mc.textAlign='center';mc.fillText(i+1,l.x*sx,l.y*sy+3);});mc.fillStyle='#fff';mc.strokeStyle='#177887';mc.lineWidth=1.5;mc.save();mc.translate(boat.x*sx,boat.y*sy);mc.rotate(boat.angle+Math.PI/2);mc.beginPath();mc.moveTo(0,-6);mc.lineTo(4,4);mc.lineTo(0,2);mc.lineTo(-4,4);mc.closePath();mc.fill();mc.stroke();mc.restore();mc.strokeStyle='#fff8';mc.strokeRect((cam.x-vw/zoom/2)*sx,(cam.y-vh*.65/zoom)*sy,vw/zoom*sx,vh/zoom*sy);}
function draw(){if(window.Voyage3D?.supported){window.Voyage3D.render({boat,cam,state,time,trail,treasures,near,zoom});drawMap();return;}ctx.setTransform(dpr,0,0,dpr,0,0);const gradient=ctx.createLinearGradient(0,0,vw,vh);gradient.addColorStop(0,'#299eb2');gradient.addColorStop(.55,'#209ab2');gradient.addColorStop(1,'#137f9f');ctx.fillStyle=gradient;ctx.fillRect(0,0,vw,vh);ctx.save();ctx.translate(vw/2,vh*.65);ctx.scale(zoom,zoom);ctx.translate(-cam.x,-cam.y);
ctx.strokeStyle='#89d4d350';ctx.lineWidth=1;ctx.strokeRect(5,5,WORLD.w-10,WORLD.h-10);
for(const d of decor){const wave=Math.sin(time*1.2+d.p);ctx.strokeStyle='#a8e7df33';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(d.x-13,d.y+wave*3);ctx.quadraticCurveTo(d.x,d.y+7+wave*3,d.x+13,d.y+wave*3);ctx.stroke();if(d.p%6<.25){const fx=d.x+Math.sin(time*.6+d.p)*35,fy=d.y+Math.cos(time*.4+d.p)*20;ellipse(fx,fy,7,2,'#8cdad04d');poly([[fx+6,fy],[fx+12,fy-4],[fx+12,fy+4]],'#8cdad04d');}}
for(const t of trail){ctx.strokeStyle=`rgba(224,255,244,${t.life*.22})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(t.x,t.y,8+(1-t.life)*27,5+(1-t.life)*15,0,0,7);ctx.stroke();}
for(let i=0;i<treasures.length;i++){if(state.treasures.includes(i))continue;const t=treasures[i],y=t.y+Math.sin(time*2+i)*3;ellipse(t.x+2,y+7,16,7,'#0c6c8033');poly([[t.x-12,y-7],[t.x+9,y-10],[t.x+15,y-3],[t.x-6,y+1]],'#dfb76b');poly([[t.x-12,y-7],[t.x-6,y+1],[t.x-6,y+13],[t.x-12,y+5]],'#8a613c');poly([[t.x-6,y+1],[t.x+15,y-3],[t.x+15,y+8],[t.x-6,y+13]],'#bf8646');line(t.x+4,y-6,t.x+4,y+9,'#ffe093',3);if(Math.sin(time*3+i)>.75)text('✦',t.x+21,y-12,13,'#fff3bb');}
// Painter's ordering makes the ship pass behind the islands' buildings.
const objects=lessons.map((l,i)=>({y:l.y+l.r*.45,draw:()=>drawIsland(l,i)}));objects.push({y:boat.y,draw:drawBoat});objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
for(let i=0;i<7;i++){const x=(time*18+i*363)%WORLD.w,y=180+i*243+Math.sin(time*.5+i)*35;ctx.strokeStyle='#f8ffedb8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-9,y+Math.sin(time*4+i)*3);ctx.quadraticCurveTo(x-4,y-5,x,y);ctx.quadraticCurveTo(x+4,y-5,x+9,y+Math.sin(time*4+i)*3);ctx.stroke();}ctx.restore();drawMap();}
function update(dt){time+=dt;if(!started||$('#modal').open){trail.forEach(t=>t.life-=dt*.5);trail=trail.filter(t=>t.life>0);return;}let dx=0,dy=0;if(keys.has('a')||keys.has('arrowleft'))dx--;if(keys.has('d')||keys.has('arrowright'))dx++;if(keys.has('w')||keys.has('arrowup'))dy--;if(keys.has('s')||keys.has('arrowdown'))dy++;
if(joy.id!==null){dx=joy.x;dy=joy.y;}else if(pointer){const hit=window.Voyage3D?.supported?window.Voyage3D.screenToWorld(pointer.x,pointer.y):null;dx=hit?hit.x-boat.x:(pointer.x-vw/2)/zoom+cam.x-boat.x;dy=hit?hit.y-boat.y:(pointer.y-vh*.65)/zoom+cam.y-boat.y;const d=Math.hypot(dx,dy);if(d<14){dx=dy=0;}else{dx=dx/d*Math.min(1,d/80);dy=dy/d*Math.min(1,d/80);}}
const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}const accel=1-Math.exp(-dt*5),speed=CFG.speed;boat.vx+=(dx*speed-boat.vx)*accel;boat.vy+=(dy*speed-boat.vy)*accel;boat.x=Math.max(CFG.boatRadius,Math.min(WORLD.w-CFG.boatRadius,boat.x+boat.vx*dt));boat.y=Math.max(CFG.boatRadius,Math.min(WORLD.h-CFG.boatRadius,boat.y+boat.vy*dt));
for(const l of lessons){let x=boat.x-l.x,y=boat.y-l.y,d=Math.hypot(x,y),min=l.r+CFG.boatRadius;if(d<min){if(d<.001){x=0;y=1;d=1;}boat.x=l.x+x/d*min;boat.y=l.y+y/d*min;const dot=boat.vx*x/d+boat.vy*y/d;if(dot<0){boat.vx-=dot*x/d;boat.vy-=dot*y/d;}}}
if(Math.hypot(boat.vx,boat.vy)>8){const target=Math.atan2(boat.vy,boat.vx);const delta=Math.atan2(Math.sin(target-boat.angle),Math.cos(target-boat.angle));boat.angle+=delta*Math.min(1,dt*7);trailTime+=dt;if(trailTime>.085){trail.push({x:boat.x-Math.cos(boat.angle)*24*CFG.boatScale,y:boat.y-Math.sin(boat.angle)*24*CFG.boatScale,life:1});trailTime=0;}}
trail.forEach(t=>t.life-=dt*.55);trail=trail.filter(t=>t.life>0);cam.x+=(boat.x-cam.x)*(1-Math.exp(-dt*3));cam.y+=(boat.y-cam.y)*(1-Math.exp(-dt*3));
let n=-1;lessons.forEach((l,i)=>{if(Math.hypot(boat.x-l.harbor.x,boat.y-l.harbor.y)<CFG.dockRadius)n=i;});if(n!==near){near=n;$('#dock').hidden=n<0;$('.quest').classList.toggle('compact',n>=0);if(n>=0){$('#dock-title').textContent=lessons[n].icon+' '+lessons[n].name;$('#dock-info').textContent=state.done.includes(n)?'✓ 탐험 완료 · 다시 배워 볼까요?':lessons[n].goal;}}
for(let i=0;i<treasures.length;i++){const t=treasures[i];if(!state.treasures.includes(i)&&Math.hypot(t.x-boat.x,t.y-boat.y)<CFG.boatRadius+17){state.treasures.push(i);state.coins+=25;const bonus=claimCollections();persist();hud();sfx();toast(bonus.length?bonus.join(' · '):'보물상자 발견! 🪙 +25 무역 코인');if(bonus.length)confetti();}}
saveTime+=dt;if(saveTime>4){persist();saveTime=0;}}
function frame(now){const dt=Math.min((now-last)/1000||.016,.05);last=now;update(dt);draw();requestAnimationFrame(frame);}hud();welcome();requestAnimationFrame(frame);
// Small, read-only state view for functional checks and classroom diagnostics.
window.TradeVoyage={getState:()=>JSON.parse(JSON.stringify(state)),getBoat:()=>({...boat}),getWorld:()=>({...WORLD}),getTreasures:()=>treasures.map(t=>({...t})),getNearbyIsland:()=>near};
})();
