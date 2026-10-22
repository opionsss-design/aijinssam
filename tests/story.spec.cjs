const {chromium}=require('playwright');
const assert=require('node:assert/strict');
require('node:fs').mkdirSync('artifacts',{recursive:true});
const base=process.env.GAME_URL||'http://127.0.0.1:8000';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});

 async function firstIsland(p){
  await p.context().addInitScript(()=>{const fixture=sessionStorage.getItem('fixture-state');if(fixture){localStorage.setItem('trade-voyage-v1',fixture);sessionStorage.removeItem('fixture-state');}});
  await p.evaluate(()=>{const s=TradeVoyage.getState(),l=LESSONS[0];s.x=l.harbor.x;s.y=l.harbor.y;sessionStorage.setItem('fixture-state',JSON.stringify(s));});
  await p.reload();await p.locator('#start').click();await p.waitForFunction(()=>TradeVoyage.getNearbyIsland()===0);
 }
 const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(base);await page.waitForFunction(()=>Voyage3D.supported);
 await page.waitForFunction(()=>[...document.querySelectorAll('.illustrated-actor img')].every(i=>i.complete&&i.naturalWidth>1000));
 assert.equal(await page.getAttribute('body','data-scene'),'prologue');
 for(let i=0;i<6;i++){
  await page.waitForFunction(i=>document.querySelector('#story-text').textContent===PROLOGUE[i].text,i);
  if(i===1)assert((await page.locator('.speaker-label').innerText()).includes('하루'));
  if(i===2)assert((await page.locator('.speaker-label').innerText()).includes('나루'));
  await page.locator('#story-next').click();
 }
 assert.equal(await page.getAttribute('body','data-scene'),'title');
 assert((await page.evaluate(()=>TradeVoyage.getState())).prologueSeen);
 await page.screenshot({path:'artifacts/title.png'});
 await page.locator('#replay-story').click();await page.locator('#skip-story').click();await page.locator('#start').click();
 await page.waitForFunction(()=>Voyage3D.mode==='world'&&TradeVoyage.isAtHomePort());await firstIsland(page);
 const diag=await page.evaluate(()=>Voyage3D.getDiagnostics());assert.equal(diag.islands,6);assert(diag.triangles>10000);
 await page.screenshot({path:'artifacts/ocean.png'});
 await page.locator('#enter').click();assert.equal(await page.getAttribute('body','data-scene'),'encounter');
 assert((await page.locator('.conversation-speaker').innerText()).includes('하루'));
 await page.locator('#talk-next').click();assert((await page.locator('.conversation-speaker').innerText()).includes('나루'));
 await page.screenshot({path:'artifacts/conversation.png'});
 await page.locator('#talk-next').click();await page.locator('#talk-next').click();for(const k of [0,2,4])await page.locator(`[data-route="${k}"]`).click();await page.locator('#route-check').click();await page.locator('#start-quiz').click();await page.locator('[data-answer="0"]').click();assert((await page.locator('#hint').innerText()).includes('💡'));
 await page.screenshot({path:'artifacts/quiz.png'});
 await page.locator('#close').click();await page.waitForFunction(()=>document.body.dataset.scene==='world');assert.equal(await page.getAttribute('body','data-scene'),'world');
 await page.reload();assert.equal(await page.getAttribute('body','data-scene'),'title');
 assert(requests.every(u=>u.startsWith(base)||u.startsWith('data:')),'no external runtime requests');
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));
 await mp.goto(base);await mp.waitForFunction(()=>Voyage3D.supported);await mp.waitForTimeout(1400);await mp.screenshot({path:'artifacts/prologue-mobile.png'});
 await mp.locator('#skip-story').tap();await mp.screenshot({path:'artifacts/title-mobile.png'});await mp.locator('#start').tap();await firstIsland(mp);await mp.locator('#enter').tap();await mp.locator('#talk-next').tap();await mp.screenshot({path:'artifacts/conversation-mobile.png'});await mp.locator('#talk-next').tap();
 assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mp.locator('#talk-next').tap();assert(await mp.locator('[data-route="0"]').isVisible());await mp.locator('#close').tap();await mp.waitForFunction(()=>document.body.dataset.scene==='world');assert.equal(await mp.getAttribute('body','data-scene'),'world');
 const fallback=await browser.newContext();await fallback.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=new Proxy(HTMLCanvasElement.prototype.getContext,{apply(fn,self,args){return /webgl/.test(args[0])?null:Reflect.apply(fn,self,args);}});});const fp=await fallback.newPage();fp.on('pageerror',e=>errors.push(e.message));await fp.goto(base);await fp.locator('#skip-story').click();await fp.locator('#start').click();assert(!(await fp.evaluate(()=>Voyage3D.supported)));await firstIsland(fp);await fp.locator('#enter').click();await fp.locator('#talk-next').click();await fp.locator('#talk-next').click();await fp.locator('#talk-next').click();assert(await fp.locator('[data-route="0"]').isVisible());
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: full prologue, distinct title, replay, persisted introduction, storybook sailor illustrations and WebGL islands, NPC dialogue/quiz hints, mobile scenes, offline assets, non-WebGL fallback.');
})().catch(e=>{console.error(e);process.exit(1);});
