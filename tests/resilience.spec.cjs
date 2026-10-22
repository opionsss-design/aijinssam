const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const errors=[];
 for(const viewport of [{width:320,height:568},{width:844,height:390},{width:768,height:1024}]){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8000');
  await page.locator('#skip-story').click();if(await page.locator('#skip-story').count())await page.locator('#skip-story').click();await page.locator('#start').click();await page.waitForTimeout(200);
  await page.keyboard.down('d');await page.waitForFunction(()=>TradeVoyage.getBoat().x>670,null,{timeout:20000});await page.keyboard.up('d');
  assert((await page.evaluate(()=>TradeVoyage.getBoat())).x>665,'story and title lead to navigation');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  await page.locator('#menu').click();await page.locator('#music').click();
  assert((await page.evaluate(()=>TradeVoyage.getState())).music);
  await page.locator('#music').click();await page.locator('#sfx').click();
  assert(!(await page.evaluate(()=>TradeVoyage.getState())).sfx);
  await context.close();
 }
 const context=await browser.newContext();
 await context.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('denied','SecurityError');};});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:8000');if(await page.locator('#skip-story').count())await page.locator('#skip-story').click();await page.locator('#start').click();await page.waitForTimeout(200);
 await page.keyboard.down('d');await page.waitForFunction(()=>TradeVoyage.getBoat().x>670,null,{timeout:20000});await page.keyboard.up('d');
 await page.locator('#menu').click();await page.locator('#sfx').click();
 assert((await page.evaluate(()=>TradeVoyage.getBoat())).x>665,'play survives blocked storage');
 assert.deepEqual(errors,[]);
 console.log('PASS: 320px phone, landscape phone, tablet, welcome dismissal, separate music/effect toggles, storage-denied fallback.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
