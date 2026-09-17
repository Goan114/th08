import {sections} from './practice-sections.mjs';
export const fields=['mode','stage','warp','section','phase','frame','dlg','score','life','bomb','power','gauge','graze','point','point_total','point_stage','time','value','night','familiar','rank','rankLock'];
export const defaults=Object.freeze({mode:1,stage:0,warp:0,section:0,phase:0,frame:0,dlg:false,score:0,life:2,bomb:8,power:128,gauge:0,graze:0,point:0,point_total:0,point_stage:0,time:0,value:60000,night:0,familiar:0,rank:12,rankLock:false});
const ranges={mode:[0,1],stage:[0,8],warp:[0,7],section:[0,19999],phase:[0,6],frame:[0,2147483647],score:[0,9999999990],life:[0,8],bomb:[0,8],power:[0,128],gauge:[-10000,10000],graze:[0,2147483647],point:[0,9999],point_total:[0,9999],point_stage:[0,9999],time:[0,2147483647],value:[0,9999999],night:[0,11],familiar:[0,2000],rank:[8,99]};
const chapters=[2,4,3,6,6,5,2,2,7];
export function normalizePractice(input={}){
 const out={...defaults};for(const key of fields){if(typeof defaults[key]==='boolean')out[key]=input[key]===true;else {const value=Number(input[key]);const [min,max]=ranges[key];out[key]=Number.isFinite(value)?Math.max(min,Math.min(max,Math.trunc(value))):defaults[key];}}
 if(out.section>=10000){if(Math.floor((out.section-10000)/100)!==out.stage+1||out.section%100<1||out.section%100>chapters[out.stage])out.section=0;}
 else if(out.section&&!sections.some(s=>s.id===out.section&&s.stage===out.stage))out.section=0;
 out.score=Math.floor(out.score/10)*10;out.value=Math.floor(out.value/10)*10;return out;
}
export function createPractice({core,getApp,canvas,clearKeys,setMusic}){
 let options={},params={...defaults},status=[0,0,0,0,0,0,0],panel=null,cheatPanel=false,signature='',music=true;
 const lang=()=>String(options.thpracLocale||'').toLowerCase().startsWith('ja')?2:String(options.thpracLocale||'').toLowerCase().startsWith('en')?1:0;
 const text=(zh,en,ja)=>[zh,en,ja][lang()];
 const readStatus=()=>Array.from(new Int32Array(core.memory.buffer,core.practice_status(getApp()),7));
 function send(accept){const values=fields.map(k=>Number(params[k]));values.push(1);const ptr=core.allocate(values.length*8);try{new Float64Array(core.memory.buffer,ptr,values.length).set(values);if(!core.practice_configure(getApp(),ptr,values.length,accept))throw Error('Invalid TH08 practice configuration');}finally{core.deallocate(ptr);}}
 function close(resetSignature=true){panel?.remove();panel=null;if(resetSignature)signature='';clearKeys();canvas.focus({preventScroll:true});window.dispatchEvent(new CustomEvent('eagler-thprac-menu',{detail:{open:false}}));}
 function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;return b;}
 function open(){close(false);panel=document.createElement('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','thprac TH08');
  panel.style.cssText='position:fixed;z-index:100;inset:4% 5%;overflow:auto;background:rgba(16,18,24,.97);color:#eee;border:1px solid #b0a9a0;padding:18px;font:14px system-ui;box-sizing:border-box;touch-action:pan-y;';
  const style=document.createElement('style');style.textContent='.th08-practice-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.th08-practice-grid label{display:grid;gap:4px}section[aria-label="thprac TH08"] input,section[aria-label="thprac TH08"] select,section[aria-label="thprac TH08"] button{font:inherit;color:inherit;background:#30333d;border:1px solid #686c7a;border-radius:4px;padding:8px;min-width:0}section[aria-label="thprac TH08"] button{margin:8px 8px 0 0}';panel.append(style);
  const title=document.createElement('h2');title.textContent=cheatPanel?text('thprac 辅助菜单','thprac assists','thprac 補助メニュー'):'thprac · TH08';panel.append(title);
  if(cheatPanel){const names=[['无敌','Invincibility','無敵'],['无限残机','Infinite lives','残機無限'],['无限 Bomb','Infinite bombs','ボム無限'],['满火力','Full power','パワー最大'],['夜晚时间锁','Night clock lock','時刻固定'],['自动 Bomb','Auto bomb','オートボム']];
   names.forEach((n,i)=>panel.append(button(`F${i+1} ${text(...n)} ${status[5]&(1<<i)?'✓':''}`,()=>toggle(i))));panel.append(button('F7 BGM',()=>{music=!music;setMusic(music);}));
   const note=document.createElement('p');note.textContent=text('使用辅助功能后，本局不保存录像；播放录像时不允许修改。','Using assists disables replay saving for this run. Assists are unavailable in playback.','補助機能使用後はこのプレイのリプレイを保存できません。再生中は変更できません。');panel.append(note,button(text('关闭','Close','閉じる'),()=>{cheatPanel=false;close();}));
  }else{
   const grid=document.createElement('div');grid.className='th08-practice-grid';panel.append(grid);
   const add=(key,label,choices)=>{const wrapper=document.createElement('label');wrapper.textContent=label;let control;
    if(choices){control=document.createElement('select');for(const [value,name] of choices){const option=document.createElement('option');option.value=value;option.textContent=name;control.append(option);}control.value=String(params[key]);}
    else {control=document.createElement('input');if(typeof defaults[key]==='boolean'){control.type='checkbox';control.checked=params[key];}else{control.type='number';[control.min,control.max]=ranges[key];control.step=key==='score'||key==='value'?10:1;control.value=params[key];}}
    control.dataset.field=key;control.onchange=()=>{params[key]=control.type==='checkbox'?control.checked:Number(control.value);params=normalizePractice(params);if(key==='stage'||key==='mode')open();};wrapper.append(control);grid.append(wrapper);
   };
   add('mode',text('模式','Mode','モード'),[[1,text('高级练习','Advanced practice','拡張練習')],[0,text('原版练习','Original practice','通常練習')]]);
   add('stage',text('关卡','Stage','ステージ'),['1','2','3','4A','4B','5','6A','6B','Extra'].map((n,i)=>[i,n]));
   if(params.mode){const difficulty=params.stage===8?4:status[1];const list=[[0,text('从头开始','Beginning','最初から')]];
    for(let i=1;i<=chapters[params.stage];i++)list.push([10000+(params.stage+1)*100+i,text('道中段落 ','Chapter ','道中 ')+i]);
    for(const s of sections.filter(s=>s.stage===params.stage)){const name=s.names[difficulty]?.[lang()]||s.key;if(name!==s.key)list.push([s.id,name]);}
    add('section',text('段落 / 符卡','Section / spell','区間 / スペル'),list);
    add('phase',text('符卡阶段（支持的符卡）','Spell phase (supported spells)','スペル段階（対応スペル）'));
    add('frame',text('直接跳转帧（段落为从头开始时）','Frame (Beginning section)','フレーム（最初からの場合）'));
    add('dlg',text('保留对话','Dialogue','会話'));
    const labels={life:['残机','Lives','残機'],bomb:['Bomb','Bombs','ボム'],power:['火力','Power','パワー'],score:['分数','Score','スコア'],gauge:['人妖槽','Gauge','妖率'],graze:['擦弹','Graze','グレイズ'],point_total:['累计点数','Total points','累計点数'],point_stage:['本关点数','Stage points','ステージ点数'],time:['刻符','Time orbs','刻符'],value:['夜点','Point value','人妖点'],night:['夜晚（每单位半小时）','Night (half-hour units)','時刻（30分単位）'],familiar:['累计使魔','Familiars','累計使い魔'],rank:['Rank','Rank','ランク'],rankLock:['锁定 Rank','Lock rank','ランク固定']};
    for(const [key,label] of Object.entries(labels))add(key,text(...label));
   }
   panel.append(button(text('开始练习','Start practice','練習開始'),()=>{send(true);close();}),button(text('返回','Back','戻る'),()=>{core.practice_cancel(getApp());close();}));
  }
  document.body.append(panel);panel.querySelector('select,button')?.focus();window.dispatchEvent(new CustomEvent('eagler-thprac-menu',{detail:{open:cheatPanel}}));
 }
 function toggle(index){if(status[4])return;core.practice_cheats(getApp(),status[5]^(1<<index));status=readStatus();if(panel)open();}
 function key(code,down){if(!options.thpracEnabled||!getApp())return false;
  if(code==='Backspace'&&down&&!status[0]&&!status[4]){cheatPanel=!cheatPanel;if(cheatPanel)open();else close();return true;}
  if(panel){if(down&&code==='Escape'){if(cheatPanel){cheatPanel=false;close();}else{core.practice_cancel(getApp());close();}}else if(down&&code==='Tab'){const focus=[...panel.querySelectorAll('select,input,button')],current=focus.indexOf(document.activeElement),step=1;focus[(current+step+focus.length)%focus.length]?.focus();}else if(down&&cheatPanel&&/^F[1-6]$/.test(code))toggle(Number(code.slice(1))-1);else if(down&&cheatPanel&&code==='F7'){music=!music;setMusic(music);}else if(down&&code==='Enter'&&!cheatPanel){send(true);close();}return true;}return false;
 }
 // Native DOM Tab/navigation remain available, while SDL never receives a
 // menu keystroke. Hosted keyboard messages use the same key gate below.
 window.addEventListener('keydown',event=>{const wasOpen=!!panel;if(key(event.code,true)||wasOpen){event.stopImmediatePropagation();if(event.code==='Escape'||event.code==='Enter'||event.code==='Backspace'||/^F[1-7]$/.test(event.code))event.preventDefault();}},true);
 window.addEventListener('keyup',event=>{if(panel){event.stopImmediatePropagation();}},true);
 return {
  configure(value){options=value;if(value.thprac?.params||value.thpracSession?.params)params=normalizePractice((value.thprac||value.thpracSession).params);if(getApp()){core.practice_enable(getApp(),!!options.thpracEnabled);if(options.thpracEnabled)send(false);}},
  tick(){if(!getApp()||!options.thpracEnabled)return;status=readStatus();const next=status[0]?`${status[1]}:${status[2]}`:'';if(next&&next!==signature){cheatPanel=false;open();signature=next;}else if(!next&&!cheatPanel&&panel)close();},
  key,
  mouse(message){if(!panel)return;const target=document.elementFromPoint(Number(message.x),Number(message.y));if(!panel.contains(target))return;if(message.type==='down'){target.focus?.();target.click?.();}},
  close
 };
}
