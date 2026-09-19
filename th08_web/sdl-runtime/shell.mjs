// Platform shell for the upstream eagler-touhou/1 Launcher contract.
// Game construction, input, timing, rendering, text and sound belong to C++.
import createModule from './th08-sdl.mjs';
import {bindOutsideTouches} from './eagler-host.mjs';
import {exportReplayName,importReplayName} from './motion-replay.mjs';
import {normalizeOptions,applyTouchOptions,touchControls,resumeRuntimeAudio,directTouch,ensureSharedFontAlias,installResources as installHostResources,observeMusicWrites,mountManagedData,isSupersededRuntimeError} from './eagler-host.mjs';
const protocol='eagler-touhou/1',game='th08',query=new URLSearchParams(location.search),canvas=document.querySelector('canvas');
const epoch=Number(query.get('runtimeEpoch'));
const validEpoch=Number.isSafeInteger(epoch)&&epoch>0;
const emit=(event,fields={})=>parent.postMessage({protocol,game,epoch,event,...fields},location.origin);
let Module,core,app=0,launched=false,first=false,closing=false,language=query.get('language')==='lang_zh-hans'?'chs':'jp',options={},music=true;
let frames=0,lastHealth=0,lastFrame=0,maxGap=0,lastPresented=0,saveTimer=null;
const cancelTouches=bindOutsideTouches(document,canvas,()=>core,()=>launched&&options.touchEnabled);
const error=reason=>{const message=reason?.stack||String(reason);document.querySelector('#error').textContent=message;emit('error',{message,error:message});console.error(reason);};
const u32=(ptr,count)=>new Uint32Array(core.memory.buffer,ptr,count);
const cstring=(text,fn)=>{const bytes=new TextEncoder().encode(text+'\0'),p=core.allocate(bytes.length);try{new Uint8Array(core.memory.buffer,p,bytes.length).set(bytes);return fn(p);}finally{core.deallocate(p);}};
const root=()=>'/savesth08';
let storageSync=Promise.resolve();
const sync=populate=>{const current=storageSync.then(()=>new Promise((resolve,reject)=>Module.FS.syncfs(populate,e=>e?reject(e):resolve())));storageSync=current.catch(()=>{});return current;};
function relativeSave(path){
 if(typeof path!=='string'||path.length>200)throw Error('Invalid save path');
 path=path.replaceAll('\\','/').toLowerCase();
 if(path.startsWith('/savesth08/'))path=path.slice('/savesth08/'.length);
 else path=path.replace(/^\//,'');
 if(!/^(?:score\.dat|th08\.cfg|replay\/th8_(?:\d{2}|ud[a-z0-9]{4})\.rpyx?)$/.test(path))throw Error('Invalid save path: '+path);
 return path;
}
function fileExists(path){return Module.FS.analyzePath(path).exists;}
async function migrateSaves(){
 if(fileExists('/savesth08/.migration-v3'))return;
 const databases=typeof indexedDB.databases==='function'?await indexedDB.databases():null;
 for(const lang of ['jp']){
  const name='th08-native-1.00d';if(databases&&!databases.some(db=>db.name===name))continue;
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(name);request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);});
  try{if(!db.objectStoreNames.contains('files'))continue;
   const entries=await new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly'),rows=[];tx.objectStore('files').openCursor().onsuccess=e=>{const c=e.target.result;if(c){rows.push([c.key,c.value]);c.continue();}};tx.oncomplete=()=>resolve(rows);tx.onerror=()=>reject(tx.error);});
   for(const [name,value] of entries){let path;try{path=relativeSave(name);}catch{continue;}const bytes=value instanceof Blob?new Uint8Array(await value.arrayBuffer()):new Uint8Array(value);path=importReplayName(path,bytes,8);const target='/savesth08/'+path;if(!fileExists(target)){Module.FS.mkdirTree(target.slice(0,target.lastIndexOf('/')));Module.FS.writeFile(target,bytes);}}
  }finally{db.close();}
 }
 Module.FS.writeFile('/savesth08/.migration-v3',new Uint8Array([1]));await sync(false);
}
async function mountData(){await mountManagedData(Module,{game,parentWindow:parent,query,emit});}
async function installResources(resources=[]){return installHostResources(Module,resources,{game,emit});}
function applyOptions(){applyTouchOptions(core,options);core.sdl_touch_display?.(options.alwaysHitbox?1:0);}
function status(){return Array.from(new Int32Array(core.memory.buffer,core.sdl_game_status(),10));}
function save(){if(app)core.save(app);return sync(false);}
async function resumeForegroundAudio(forcePause=false){
 if(!core||!launched||document.hidden)return false;
 if(forcePause)core.sdl_loop_pause(1);
 return resumeRuntimeAudio(Module,core,()=>!!core&&launched&&!document.hidden);
}
async function stop(){if(closing)return;closing=true;try{core.sdl_loop_stop();await save();core.sdl_game_close();window.dispatchEvent(new CustomEvent('touhou-midi-close'));await sync(false);app=0;launched=false;emit('exit',{code:0,status:'success'});}finally{closing=false;}}
async function launch(){
 if(launched)return;
 ensureSharedFontAlias(Module);
 const mode=Module.touhouMusicMode||'none';music=mode!=='none';core.sdl_ogg_decode_mode?.(options.oggDecodeMode==='full');core.sdl_music_source?.(mode==='midi'?2:1);
 core.sdl_music_enabled?.(music);app=core.sdl_game_open(Date.now()>>>0);if(!app)throw Error('C++ game initialization failed');
 const total=core.sdl_prepare_total();for(let i=0;i<total;i++){if(core.sdl_prepare_next()<0)throw Error('资源预载失败 '+i);if(i%12===11){document.querySelector('#loading').textContent='正在准备游戏资源 '+(i+1)+' / '+total;await new Promise(resolve=>setTimeout(resolve,0));}}
 if(!core.sdl_game_initialize())throw Error('永夜抄初始化失败');document.querySelector('#loading').textContent='';
 applyOptions();launched=true;first=false;lastPresented=0;lastHealth=performance.now();lastFrame=0;frames=0;maxGap=0;
 canvas.focus({preventScroll:true});core.sdl_loop_pause(1);if(!document.hidden)await resumeForegroundAudio();if(query.get('manual')!=='1')core.sdl_loop_start();
 emit('runtime-info',{renderer:'SDL3 / WebGL2 / C++',architecture:'eagler-touhou/1',version:'3.4.1-sdl3'});
}
async function command(message){
 switch(message.command){
 case 'configure':if(launched)throw Error('Cannot configure a running game');language=message.language==='lang_zh-hans'?'chs':'jp';options=normalizeOptions(message.options);if(!['ogg','midi','none'].includes(message.music))throw Error('Invalid music mode');Module.touhouMusicMode=message.music;Module.eaglerOptions=options;music=message.music!=='none';await installResources(message.sharedResources);await installResources(message.runtimeResources);await installResources(message.resources);applyOptions();return {};
 case 'resources':await installResources(message.resources);return {};
 case 'keyboard':cstring(String(message.code),p=>core.sdl_key(p,!!message.down));return {};
 case 'keyboard-clear':core.sdl_keys_clear();return {};
 case 'touch-cancel':cancelTouches();return {};
 case 'direct-touch':directTouch(core,canvas,message,{width:innerWidth,height:innerHeight});return {};
 case 'touch-controls':touchControls(core,options,message);return {};
 case 'launch':await launch();return {};
 case 'sync':await save();return {};
 case 'list':{const files=[];for(const dir of ['', '/replay'])for(const name of Module.FS.readdir(root()+dir)){const path=(dir+'/'+name).replace(/^\//,'');try{relativeSave(path);}catch{continue;}const full=root()+'/'+path,s=Module.FS.stat(full);if(Module.FS.isFile(s.mode)){const bytes=Module.FS.readFile(full);files.push({path:exportReplayName(path,bytes,8),size:s.size});}}return {files};}
 case 'read':{let path=relativeSave(message.path);if(path.endsWith('.rpyx'))path=path.slice(0,-1);return {bytes:Array.from(Module.FS.readFile(root()+'/'+path))};}
 case 'write':{if(!Array.isArray(message.bytes)||message.bytes.length>16*1024*1024||message.bytes.some(b=>!Number.isInteger(b)||b<0||b>255))throw Error('Invalid save bytes');const bytes=new Uint8Array(message.bytes),path=importReplayName(relativeSave(message.path),bytes,8);Module.FS.writeFile(root()+'/'+path,bytes);await sync(false);return {};}
 case 'remove':{let path=relativeSave(message.path);if(path.endsWith('.rpyx'))path=path.slice(0,-1);Module.FS.unlink(root()+'/'+path);await sync(false);return {};}
 default:throw Error('Unsupported runtime command: '+message.command);
 }
}
let queue=Promise.resolve();
window.addEventListener('message',event=>{const m=event.data;if(!validEpoch||event.source!==parent||event.origin!==location.origin||m?.protocol!==protocol||m.game!==game||m.epoch!==epoch||typeof m.command!=='string')return;
 queue=queue.then(async()=>{if(await initialized===false)return;try{const result=await command(m);if(typeof m.request==='string')parent.postMessage({protocol,game,epoch,request:m.request,ok:true,...result},location.origin);}catch(e){if(typeof m.request==='string')parent.postMessage({protocol,game,epoch,request:m.request,ok:false,error:String(e),errno:e.errno},location.origin);else error(e);}}).catch(error);
});
document.addEventListener('visibilitychange',()=>{if(!core||!launched)return;core.sdl_keys_clear();cancelTouches();if(document.hidden){core.sdl_loop_pause(1);queue=queue.then(save).catch(error);}else void resumeForegroundAudio(true);});
window.addEventListener('blur',()=>{if(core){core.sdl_keys_clear();cancelTouches();}});
window.addEventListener('pagehide',()=>{cancelTouches();if(core&&launched){core.sdl_loop_pause(1);void save().catch(console.error);}});
window.addEventListener('pageshow',()=>{if(core&&launched&&!document.hidden)void resumeForegroundAudio(true);});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();core?.sdl_loop_pause(1);error('图形环境已失效，请退出后重新开始。');});
for(const name of ['pointerdown','keydown'])window.addEventListener(name,()=>{if(Module?.SDL3?.audioContext?.state!=='running')void resumeForegroundAudio(true);},{capture:true});
const initialized=(async()=>{
 let audioContext;try{audioContext=parent.__touhouAudioContext||parent.__th10AudioContext;}catch{}
 Module=await createModule({canvas,noInitialRun:true,...(audioContext?{SDL3:{audioContext}}:{}),print:console.log,printErr:console.error,
  instantiateWasm(imports,ready){return WebAssembly.instantiateStreaming(fetch('./th08-sdl.wasm'),imports).then(({instance,module})=>{core=instance.exports;ready(instance,module);return core;});}
 });
 window.Module=Module;window.FS=Module.FS;observeMusicWrites(Module,core,game);Module.FS.mkdirTree('/savesth08');Module.FS.mount(Module.IDBFS,{},'/savesth08');await sync(true);
 Module.FS.mkdirTree('/savesth08/replay');await migrateSaves();await mountData();cstring('#screen',core.sdl_canvas);
 Module.runtimePrepare=()=>!document.hidden;
 Module.runtimeFinish=(result,duration)=>{
  const now=performance.now(),p=u32(core.sdl_stats(),6)[5];if(p!==lastPresented){frames++;if(lastFrame)maxGap=Math.max(maxGap,now-lastFrame);lastFrame=now;lastPresented=p;if(!first){first=true;emit('first-frame');}}
  if(result||status()[2]){if(status()[2]){error('Game error '+status()[2]);core.sdl_loop_pause(1);}else queueMicrotask(()=>void stop().catch(error));}
  if(now-lastHealth>=1000){emit('frame-health',{fps:frames*1000/(now-lastHealth),maxGapMs:maxGap,frameMs:duration});const a=u32(core.sdl_audio_stats(),12);emit('audio-health',{queuedMs:a[5]*1000/44100,minQueuedMs:a[7]*1000/44100,backend:'script',underruns:0,robust:true});frames=0;maxGap=0;lastHealth=now;}
 };
 Module.runtimeFileChanged=()=>{if(saveTimer!==null)return;saveTimer=setTimeout(()=>{saveTimer=null;queue=queue.then(()=>sync(false)).catch(error);},0);};
 Module.runtimeStopped=()=>{};Module.runtimeNotice=message=>emit('notice',{message});Module.runtimeMidi=(op,data)=>{if(op===62&&music&&Module.touhouMusicMode==='midi')window.dispatchEvent(new CustomEvent('touhou-midi',{detail:{bytes:Array.from(data||[])}}));if(op===61)window.dispatchEvent(new CustomEvent('touhou-midi-close'));};Module.callMain=launch;
 window.__th08Runtime={core,Module,get app(){return app;},status,launch,stop,command};
 emit('ready');
})().catch(e=>{if(isSupersededRuntimeError(e)){console.debug('Runtime navigation superseded');return false;}error(e);throw e;});
