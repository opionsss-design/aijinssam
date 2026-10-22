const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {readFileSync,mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
mkdirSync('artifacts',{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{

 async function firstIsland(p){
  await p.context().addInitScript(()=>{const fixture=sessionStorage.getItem('fixture-state');if(fixture){localStorage.setItem('trade-voyage-v1',fixture);sessionStorage.removeItem('fixture-state');}});
  await p.evaluate(()=>{const s=TradeVoyage.getState(),l=LESSONS[0];s.x=l.harbor.x;s.y=l.harbor.y;sessionStorage.setItem('fixture-state',JSON.stringify(s));});
  await p.reload();await p.locator('#start').click();await p.waitForFunction(()=>TradeVoyage.getNearbyIsland()===0);
 }
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const url=(process.env.GAME_URL||'http://127.0.0.1:8000')+'/standalone-3d.html';
  await page.route(url,route=>route.fulfill({contentType:'text/html; charset=utf-8',body:readFileSync(resolve(__dirname,'../../무역왕의_항해_3D_바로실행.html'))}));
  await page.goto(url);
  await page.waitForFunction(()=>Voyage3D.supported&&document.querySelector('#story-text').textContent===PROLOGUE[0].text);
  await page.screenshot({path:'artifacts/prologue.png'});
  await page.locator('#story-next').click();await page.waitForFunction(()=>document.querySelector('#story-text').textContent===PROLOGUE[1].text);await page.screenshot({path:'artifacts/hero-prologue.png'});
  await page.locator('#skip-story').click();await page.screenshot({path:'artifacts/title.png'});
  await page.locator('#start').click();await page.waitForFunction(()=>TradeVoyage.isAtHomePort());assert.equal(await page.evaluate(()=>HOME_PORT.country),'대한민국');await firstIsland(page);await page.screenshot({path:'artifacts/ocean.png'});
  await page.locator('#enter').click();await page.locator('#talk-next').click();await page.screenshot({path:'artifacts/conversation.png'});await page.locator('#talk-next').click();await page.locator('#talk-next').click();for(const k of [0,2,4])await page.locator(`[data-route="${k}"]`).click();await page.locator('#route-check').click();await page.locator('#start-quiz').click();await page.screenshot({path:'artifacts/quiz.png'});
  const islandArt=await page.evaluate(async()=>{
    const urls=LESSONS.map(l=>l.background).filter(Boolean);
    await Promise.all(urls.map(async url=>{const img=new Image();img.src=url;await img.decode();}));
    Voyage3D.setScene('encounter',{npcIndex:1,speaker:'npc'});
    return{count:urls.length,embedded:urls.every(url=>url.startsWith('data:image/png;base64,')),active:document.querySelector('#storybook-scene').style.backgroundImage.includes(urls[0])};
  });
  assert.deepEqual(islandArt,{count:5,embedded:true,active:true},'all new island images are embedded and decoded offline');
  assert.equal(await page.locator('[data-answer]').count(),3);assert(requests.every(u=>u===url||u.startsWith('data:')),'standalone runs entirely offline');assert.deepEqual(errors,[]);
  console.log('PASS: downloaded single-file HTML runs 3D prologue, title, sailing and NPC quiz as one local document without external resource requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
