const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {readFileSync,mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
mkdirSync('artifacts',{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const url=(process.env.GAME_URL||'http://127.0.0.1:8000')+'/standalone-3d.html';
  await page.route(url,route=>route.fulfill({contentType:'text/html; charset=utf-8',body:readFileSync(resolve(__dirname,'../../무역왕의_항해_3D_바로실행.html'))}));
  await page.goto(url);
  await page.waitForFunction(()=>Voyage3D.supported&&document.querySelector('#story-text').textContent===PROLOGUE[0].text);
  await page.screenshot({path:'artifacts/prologue.png'});
  await page.locator('#story-next').click();await page.waitForFunction(()=>document.querySelector('#story-text').textContent===PROLOGUE[1].text);await page.screenshot({path:'artifacts/hero-prologue.png'});
  await page.locator('#skip-story').click();await page.screenshot({path:'artifacts/title.png'});
  await page.locator('#start').click();await page.waitForFunction(()=>TradeVoyage.getNearbyIsland()===0);await page.screenshot({path:'artifacts/ocean.png'});
  await page.locator('#enter').click();await page.locator('#talk-next').click();await page.screenshot({path:'artifacts/conversation.png'});await page.locator('#talk-next').click();await page.screenshot({path:'artifacts/quiz.png'});
  assert.equal(await page.locator('[data-answer]').count(),3);assert(requests.every(u=>u===url||u.startsWith('data:')),'standalone runs entirely offline');assert.deepEqual(errors,[]);
  console.log('PASS: downloaded single-file HTML runs 3D prologue, title, sailing and NPC quiz as one local document without external resource requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
