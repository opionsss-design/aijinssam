const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  fs.mkdirSync('artifacts',{recursive:true});
  const backgrounds=new Set(),errors=[];
  for(const viewport of [{width:1440,height:960},{width:390,height:844},{width:844,height:390},{width:768,height:1024}]){
   const context=await browser.newContext({viewport});const page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(()=>{const seed=sessionStorage.getItem('fixture-state');if(seed){localStorage.setItem('trade-voyage-v1',seed);sessionStorage.removeItem('fixture-state');}});
   await page.goto(process.env.GAME_URL||'http://127.0.0.1:8000');await page.locator('#skip-story').click();await page.locator('#start').click();
   for(let i=0;i<6;i++){
    await page.evaluate(i=>{const s=TradeVoyage.getState(),l=LESSONS[i];s.x=l.harbor.x;s.y=l.harbor.y;s.done=[0,1,2,3,4].filter(v=>v!==i);sessionStorage.setItem('fixture-state',JSON.stringify(s));},i);
    await page.reload();await page.locator('#start').click();await page.locator('#enter').click();
    await page.locator('#talk-next').click();await page.locator('#talk-next').click();
    const result=await page.evaluate(async()=>{
     const b=document.querySelector('#modal').getBoundingClientRect(),bg=getComputedStyle(document.querySelector('#storybook-scene')).backgroundImage;
     const image=new Image();image.src=bg.slice(5,-2);await image.decode();
     return{x:b.x,y:b.y,w:b.width,h:b.height,vw:innerWidth,vh:innerHeight,bg,island:document.body.dataset.island,imageWidth:image.naturalWidth};
    });
    assert.equal(result.island,String(i));assert(result.imageWidth>1000);
    assert(Math.abs(result.x+result.w/2-result.vw/2)<2,'horizontally centered');
    assert(Math.abs(result.y+result.h/2-result.vh/2)<2,'vertically centered');
    assert(result.x>=0&&result.y>=0&&result.x+result.w<=result.vw+1&&result.y+result.h<=result.vh+1,'dialog fits viewport');
    if(viewport.width===1440)backgrounds.add(result.bg);
    if(i===1||i===3)await page.screenshot({path:`artifacts/centered-island-${i}-${viewport.width}.png`});
    await page.locator('#close').click();await page.waitForFunction(()=>document.body.dataset.scene==='world');
    assert.equal(await page.evaluate(()=>document.body.dataset.island),undefined,'clears island on exit');
    assert.equal(await page.locator('#storybook-scene').evaluate(el=>el.style.backgroundImage),'','restores default background');
   }
   await context.close();
  }
  assert.equal(backgrounds.size,6,'six distinct background images');assert.deepEqual(errors,[]);
  // The same background selection works without WebGL.
  const context=await browser.newContext();await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return type.includes('webgl')?null:original.call(this,type,...rest);};});
  const page=await context.newPage();await page.goto(process.env.GAME_URL||'http://127.0.0.1:8000');
  await page.evaluate(()=>Voyage3D.setScene('encounter',{npcIndex:3,speaker:'npc'}));
  assert.equal(await page.evaluate(()=>document.body.dataset.island),'3');assert((await page.locator('#storybook-scene').evaluate(el=>el.style.backgroundImage)).includes('world-market.png'));
  await context.close();console.log('PASS: six themed backgrounds, centered mission dialogs at four viewport sizes, image decoding, scene cleanup and WebGL fallback.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
