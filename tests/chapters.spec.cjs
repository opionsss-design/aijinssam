const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const BASE=process.env.GAME_URL||'http://127.0.0.1:8000';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  fs.mkdirSync('artifacts',{recursive:true});const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
  await context.addInitScript(()=>{const seed=sessionStorage.getItem('fixture-state');if(seed){localStorage.setItem('trade-voyage-v1',seed);sessionStorage.removeItem('fixture-state');}});
  const read=()=>page.evaluate(()=>TradeVoyage.getState());
  async function start(){await page.goto(BASE);if(await page.locator('#skip-story').count())await page.locator('#skip-story').click();await page.locator('#start').click();}
  async function dock(i){await page.evaluate(i=>{const s=TradeVoyage.getState(),l=LESSONS[i];s.x=l.harbor.x;s.y=l.harbor.y;sessionStorage.setItem('fixture-state',JSON.stringify(s));},i);await start();if(await page.locator('#final-start').count())await page.locator('#close').click();await page.locator('#enter').click();assert.equal(await page.locator('.chapter-illustration').count(),1);for(let n=0;n<3;n++)await page.locator('#talk-next').click();}
  async function quizzes(i,from=0){for(let step=from;step<8;step++){
   assert((await page.locator('#modal-content h2').innerText()).includes(`${step+1} / 8`));const answer=await page.evaluate(({i,step})=>LESSONS[i].questions[step].answer,{i,step});
   if(step===from){await page.locator(`[data-answer="${(answer+1)%3}"]`).click();assert((await page.locator('#hint').innerText()).includes('💡'));assert(!(await read()).done.includes(i));}
   await page.locator(`[data-answer="${answer}"]`).click();await page.locator('#quiz-next').click();
  }assert((await read()).done.includes(i));}
  await start();assert.deepEqual(await page.evaluate(()=>LESSONS.map(l=>l.questions.length)),[8,8,8,8,8,8]);
  // Controls remain free sailing.
  const x=await page.evaluate(()=>TradeVoyage.getBoat().x);await page.keyboard.down('d');await page.waitForFunction(x=>TradeVoyage.getBoat().x>x+50,x);await page.keyboard.up('d');
  await dock(0);await page.screenshot({path:'artifacts/chapter-route-game.png'});await page.locator('#route-check').click();assert((await page.locator('#hint').innerText()).includes('💡'));
  for(const n of [0,2,4])await page.locator(`[data-route="${n}"]`).click();await page.locator('#route-check').click();assert.equal((await read()).done.length,0,'minigame alone does not award island');await page.locator('#start-quiz').click();
  // Save/reload inside the quiz; the minigame and earlier questions stay passed.
  for(let n=0;n<3;n++){const a=await page.evaluate(n=>LESSONS[0].questions[n].answer,n);await page.locator(`[data-answer="${a}"]`).click();await page.locator('#quiz-next').click();}
  await dock(0);await quizzes(0,3);assert.equal((await read()).coins,100);await page.locator('#continue').click();
  await dock(1);await page.locator('[data-card="0"]').click();await page.locator('[data-zone="import"]').click();assert((await page.locator('#hint').innerText()).includes('💡'));
  for(const [k,z] of [[0,'export'],[1,'import'],[2,'export'],[3,'import']]){await page.locator(`[data-card="${k}"]`).click();await page.locator(`[data-zone="${z}"]`).click();}
  await page.getByText('분류 완료! 배움 정리').click();await page.locator('#start-quiz').click();await quizzes(1);await page.locator('#continue').click();
  await dock(2);await page.locator('#accept').click();await dock(0);await page.locator('#exchange').click();await page.locator('#sail-back').click();await dock(2);await page.locator('#deliver').click();await page.locator('#start-quiz').click();await quizzes(2);await page.locator('#continue').click();
  await dock(3);for(const [k,v] of ['forest','tech','tropic'].entries())await page.locator(`[data-pair="${k}"]`).selectOption(v);await page.locator('#check-plan').click();await page.locator('#start-quiz').click();await quizzes(3);await page.locator('#continue').click();
  await dock(4);await page.locator('#negotiate').click();assert((await page.locator('#hint').innerText()).includes('💡'));await page.locator('#trade-price').fill('70');await page.locator('#safety-agreement').check();await page.locator('#negotiate').click();await page.locator('#start-quiz').click();await quizzes(4);await page.locator('#continue').click();
  await dock(5);for(const [k,v] of ['b','a','c'].entries())await page.locator(`[data-pair="${k}"]`).selectOption(v);await page.locator('#check-plan').click();await page.locator('#start-quiz').click();await quizzes(5);
  let state=await read();assert.equal(state.coins,1500,'island rewards plus 500 collection bonus');assert.equal(state.collectionReward,true);assert(state.inventory.includes('golden-compass'));assert.equal(state.finale.completed,false,'golden ship requires final mission');
  await page.locator('#continue').click();assert.equal(await page.evaluate(()=>document.body.dataset.finale),'intro');await page.screenshot({path:'artifacts/finale-intro.png'});await page.locator('#final-start').click();
  // Failure in stage 1 only retries stage 1.
  await page.locator('#final-submit').click();assert.equal(await page.evaluate(()=>document.body.dataset.finale),'retry');assert.equal((await read()).done.length,6);await page.locator('#final-retry').click();
  for(const [k,v] of ['c','a','b'].entries())await page.locator(`[data-final-route="${k}"]`).selectOption(v);await page.locator('#final-submit').click();await page.locator('#final-next').click();
  await page.locator('[data-final-answer="0"]').click();assert.equal((await read()).finale.step,1);await page.screenshot({path:'artifacts/finale-retry.png'});
  // Reload at failure and resume directly at this stage, preserving all islands.
  await start();assert((await page.locator('.summary').innerText()).includes('1 / 3'));await page.locator('#final-start').click();assert.equal(await page.locator('[data-final-route]').count(),0);await page.locator('[data-final-answer="1"]').click();await page.locator('#final-next').click();await page.locator('[data-final-answer="0"]').click();
  state=await read();assert.equal(state.finale.completed,true);assert.equal(state.coins,2500);await page.screenshot({path:'artifacts/finale-success.png'});await page.locator('#get-certificate').click();await page.locator('#captain-name').fill('무역왕 하루');await page.locator('#back-sea').click();
  // Replaying finale and opening collections cannot pay twice.
  await page.locator('#menu').click();await page.locator('#collection-book').click();assert.equal((await read()).coins,2500);await page.locator('#close').click();await page.locator('#menu').click();await page.locator('#finale-launch').click();await page.locator('#final-start').click();for(const [k,v] of ['c','a','b'].entries())await page.locator(`[data-final-route="${k}"]`).selectOption(v);await page.locator('#final-submit').click();await page.locator('#final-next').click();await page.locator('[data-final-answer="1"]').click();await page.locator('#final-next').click();await page.locator('[data-final-answer="0"]').click();assert.equal((await read()).coins,2500);
  // Last treasure triggers 25 + 300, then remains claimed after reload.
  await page.locator('#final-return').click();await page.evaluate(()=>{const s=TradeVoyage.getState(),all=TradeVoyage.getTreasures();s.treasures=all.slice(0,-1).map((_,i)=>i);s.x=all.at(-1).x;s.y=all.at(-1).y;sessionStorage.setItem('fixture-state',JSON.stringify(s));});await start();await page.waitForFunction(()=>TradeVoyage.getState().treasureReward===true);assert.equal((await read()).coins,2825);await start();assert.equal((await read()).coins,2825);
  await context.close();
  // Real touch drag and the illustrated story on a phone.
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.addInitScript(()=>{localStorage.setItem('trade-voyage-v1',JSON.stringify({version:1,mapVersion:2,prologueSeen:true,x:2730,y:1312.5}));});const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));await mp.goto(BASE);await mp.locator('#start').tap();await mp.locator('#enter').tap();await mp.screenshot({path:'artifacts/chapter-story-mobile.png'});for(let n=0;n<3;n++)await mp.locator('#talk-next').tap();
  await mp.screenshot({path:'artifacts/chapter-sort-mobile.png'});
  await mp.locator('[data-zone="export"]').scrollIntoViewIfNeeded();const card=await mp.locator('[data-card="0"]').boundingBox(),zone=await mp.locator('[data-zone="export"]').boundingBox();assert(card.y>0&&zone.y+30<844,'card and warehouse are visible for touch drag');
  const cdp=await mobile.newCDPSession(mp);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:card.x+20,y:card.y+15}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:zone.x+30,y:zone.y+30}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mp.waitForTimeout(100);assert.equal(await mp.locator('[data-card="0"]').count(),0);
  assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.close();assert.deepEqual(errors,[]);
  console.log('PASS: 6 illustrated stories, 6 minigames, 48 quizzes, saved quiz progress, resource voyage, collection and treasure bonuses, final scene changes, retry checkpoint after reload, final reward idempotency, certificate and mobile touch drag.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
