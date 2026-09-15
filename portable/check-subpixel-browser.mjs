// Local-only smoke: use privately supplied DATA/fonts/music, never publish them.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),game=process.env.TH_GAME??'th08';
const site=resolve(process.env.TH_TEST_SITE??'');
assert(process.env.TH_TEST_SITE,'Set TH_TEST_SITE to a private Portable site fixture');
assert(process.env.TH_PLAYWRIGHT,'Set TH_PLAYWRIGHT to playwright/index.mjs');
const {chromium}=await import(pathToFileURL(resolve(process.env.TH_PLAYWRIGHT)).href);
const out=resolve(root,game+'_web/artifacts/subpixel');mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.wasm':'application/wasm','.json':'application/json','.css':'text/css'};
const server=createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
    let path=resolve(site,name);
    if(!path.startsWith(site+sep)){res.writeHead(403).end();return;}
    if(name.startsWith('runtime/'+game+'/')){
        const file=name.split('/').at(-1);
        const replacement=resolve(root,game+'_web',file===game+'-sdl.mjs'||file===game+'-sdl.wasm'?'artifacts/sdl3':'sdl-runtime',file);
        if(existsSync(replacement))path=replacement;
    }
    if(!existsSync(path)||!statSync(path).isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-store'});createReadStream(path).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.TH_BROWSER,args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[],health=[];
page.on('pageerror',e=>errors.push(e.message));
const report={game,errors,health,stages:[]};
try{
    await page.addInitScript(()=>{window.__health=[];addEventListener('message',e=>{if(e.data?.event==='frame-health')window.__health.push(e.data);});});
    await page.goto(`http://127.0.0.1:${server.address().port}/runtime/${game}/${game}.html`);
    await page.waitForFunction(g=>Boolean(window['__'+g+'Runtime']),game,{timeout:120000});
    await page.evaluate(async g=>{const r=window['__'+g+'Runtime'];await r.command({command:'configure',music:'none',options:{}});await r.launch();},game);
    await page.waitForTimeout(3000);
    await page.screenshot({path:resolve(out,'title.png')});
    for(let step=0;step<7;step++){
        const status=await page.evaluate(g=>window['__'+g+'Runtime'].status(),game);report.stages.push(status);
        if(status[5]===1)break;
        await page.keyboard.press('KeyZ',{delay:100});await page.waitForTimeout(1500);
    }
    await page.waitForFunction(g=>window['__'+g+'Runtime'].status()[5]===1,game,{timeout:45000});
    await page.keyboard.down('KeyZ');await page.waitForTimeout(10000);await page.keyboard.up('KeyZ');
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');
    await page.screenshot({path:resolve(out,'stage1.png')});
    report.status=await page.evaluate(g=>window['__'+g+'Runtime'].status(),game);
    report.health=await page.evaluate(()=>window.__health);report.errorText=await page.locator('#error').textContent();
    assert.equal(report.status[2],0);assert.equal(report.errorText,'');assert.deepEqual(errors,[]);
    assert(report.health.length>2);assert(report.health.slice(-5).some(h=>h.fps>20));
    report.passed=true;console.log(JSON.stringify(report,null,2));
}finally{writeFileSync(resolve(out,'browser.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
