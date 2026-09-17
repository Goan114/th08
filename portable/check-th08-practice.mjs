import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {defaults,fields,normalizePractice} from '../th08_web/sdl-runtime/practice.mjs';
import {sections} from '../th08_web/sdl-runtime/practice-sections.mjs';
assert.equal(fields.length+1,23);
assert.equal(sections.length,104);
assert.deepEqual([...new Set(sections.map(section=>section.id))].length,sections.length);
for(const section of sections){
 assert(section.id>0&&section.id<10000);
 assert(section.stage>=0&&section.stage<=8);
 assert.equal(normalizePractice({stage:section.stage,section:section.id}).section,section.id);
 assert.equal(section.names.length,5);
}
assert.equal(normalizePractice({stage:0,section:sections.find(section=>section.stage===1).id}).section,0);
assert.equal(normalizePractice({stage:3,section:10406}).section,10406);
assert.equal(normalizePractice({stage:3,section:10407}).section,0);
assert.deepEqual(normalizePractice({gauge:-20000,night:40,score:19,value:29,rank:120}),{...defaults,gauge:-10000,night:11,score:10,value:20,rank:99});
const shell=readFileSync(resolve(import.meta.dirname,'../th08_web/sdl-runtime/shell.mjs'),'utf8');
for(const anchor of ["case 'thprac-mouse'","practice=createPractice",'practice.tick()','practice?.configure(options)'])assert(shell.includes(anchor),anchor);
const practice=readFileSync(resolve(import.meta.dirname,'../th08_web/sdl-runtime/practice.mjs'),'utf8');
assert(!practice.includes("emit('thprac-session'"),'TH08 must keep live practice state Runtime-owned');
console.log(JSON.stringify({passed:true,sections:sections.length,fields:fields.length}));
