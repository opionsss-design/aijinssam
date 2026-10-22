const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');fs.mkdirSync('artifacts',{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const errors=[];
  for(const viewport of [{width:1440,height:960},{width:390,height:844},{width:320,height:568},{width:844,height:390},{width:768,height:1024}]){
   const mobile=viewport.width<1000,ctx=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
   if(!mobile)await ctx.addInitScript(()=>localStorage.setItem('trade-voyage-v1',JSON.stringify({version:1,koreaDepartureSeen:true,coins:321,done:[0,1],treasures:[],upgrades:['sail'],inventory:['stamp0','stamp1'],delivery:'none',x:650,y:925,prologueSeen:false})));
   await page.goto(process.env.GAME_URL||'http://127.0.0.1:8000');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('#story-text').textContent===PROLOGUE[0].text);
   const size=await page.locator('#story-text').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert(size>=18);
   const speech=await page.locator('.story-dialog').boundingBox();assert(speech.y>=0&&speech.y+speech.height<=viewport.height+1,'prologue stays in viewport');
   if(!mobile)await page.screenshot({path:'artifacts/larger-prologue.png'});
   await page.locator('#skip-story').click();
   const type=await page.locator('.title-card h1').evaluate(e=>getComputedStyle(e).fontFamily);assert(type.includes('Jua'));
   assert(await page.locator('.title-card>p').isVisible(),'description stays visible');
   assert(await page.locator('.title-card>p').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=(!mobile?20:15));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
   if(!mobile)await page.screenshot({path:'artifacts/larger-title.png'});else if(viewport.width===390)await page.screenshot({path:'artifacts/larger-title-mobile.png'});
   await page.locator('#start').click();await page.waitForFunction(()=>TradeVoyage.getNearbyIsland()===0||TradeVoyage.isAtHomePort());
   const status=await page.evaluate(()=>({state:TradeVoyage.getState(),boat:TradeVoyage.getBoat(),l:LESSONS[0],world:TradeVoyage.getWorld(),diag:Voyage3D.getDiagnostics()}));
   assert.equal(status.world.w,5250);assert.equal(status.l.r,225);assert.equal(status.diag.boatScale,1.8);
   if(!mobile){assert.equal(status.state.coins,321);assert.deepEqual(status.state.done,[0,1]);assert.equal(status.state.mapVersion,2);assert(status.state.upgrades.includes('sail'));await page.screenshot({path:'artifacts/larger-ocean.png'});}else if(viewport.width===390)await page.screenshot({path:'artifacts/larger-ocean-mobile.png'});
   if(!mobile)assert(Math.hypot(status.boat.x-status.l.harbor.x,status.boat.y-status.l.harbor.y)<144,'restored old position follows new harbor');else assert(await page.evaluate(()=>TradeVoyage.isAtHomePort()),'new game starts in Korea');
   await ctx.close();console.log('PASS size, fonts and layout',viewport.width,viewport.height);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
 console.log('PASS: enlarged islands/ship, enlarged Korean text, five viewport sizes, and legacy-save migration without losing learning records.');
})().catch(e=>{console.error(e);process.exitCode=1;});
