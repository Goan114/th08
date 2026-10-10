// Local-only production-protocol validation. Never writes to canonical artifacts.
import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=resolve(process.env.TH08_RUNTIME_ROOT??resolve(import.meta.dirname,'..'));
const workspace='C:/Users/w3051/Desktop/eagler';
const launcher=resolve(workspace,'eagler-touhou');
const site=process.env.TH08_VALIDATION_SITE?resolve(process.env.TH08_VALIDATION_SITE):resolve(workspace,'prepared',`th08-purple-validation-${Date.now()}`);
if(!process.env.TH08_VALIDATION_SITE){
await mkdir(site);
await cp(resolve(workspace,'th08/th08_web/artifacts/local-import-site'),site,{recursive:true});
await cp(resolve(launcher,'.cache/build/optimized'),site,{recursive:true});
const lib=name=>import(pathToFileURL(resolve(launcher,'lib',name)).href);
const {FRONTEND_PACKAGE_FILES,resolveFrontendPackageSource}=await lib('frontend-manifest.mjs');
for(const name of FRONTEND_PACKAGE_FILES){const target=resolve(site,name);await mkdir(dirname(target),{recursive:true});await cp(resolveFrontendPackageSource(name),target);}
execFileSync('tar',['-xf',resolve(workspace,'th08/th08_web/artifacts/th08-offline-full-a9c7cc3da83f815b.zip'),'-C',site]);
const pack=JSON.parse(await readFile(resolve(site,'package.json'),'utf8'));
await writeFile(resolve(site,'th08.package.json'),JSON.stringify(pack,null,2)+'\n');
await writeFile(resolve(site,'release-catalog.json'),JSON.stringify({schema:'eagler-touhou/release-catalog/1',games:{th08:{revision:pack.revision,descriptor:'th08.package.json'}}},null,2)+'\n');
const manifest=JSON.parse(await readFile(resolve(site,'host-manifest.json'),'utf8'));
manifest.shared.resourceMode='hosted';manifest.shared.vanillaFont='shared/msgothic.ttc';manifest.shared.unicodeFont='shared/unifont.otf';
manifest.games={th08:manifest.games.th08};manifest.profile='th08-purple-local-validation';
await cp(resolve(site,'games/th08/th08.data'),resolve(site,'th08.data'));
const ogg=pack.components.ogg.files.map(id=>pack.files[id]);
await cp(resolve(site,'games/th08/music/ogg'),resolve(site,'bgm-ogg'),{recursive:true});
manifest.games.th08.music.ogg={version:'sha256-'+createHash('sha256').update(ogg.map(f=>f.sha256).join('')).digest('hex'),files:ogg.map(f=>f.target.split('/').pop()),sizes:ogg.map(f=>f.bytes),sha256:ogg.map(f=>f.sha256)};
manifest.games.th08.music.ogg.base='./bgm-ogg/';manifest.games.th08.music.ogg.mount='/bgm-ogg';
const {validateHostManifest}=await lib('contracts/host-manifest.mjs');validateHostManifest(manifest);
await writeFile(resolve(site,'host-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
const runtime=resolve(site,'runtime/th08');
for(const name of ['th08-sdl.mjs','th08-sdl.wasm'])await cp(resolve(root,'th08_web/artifacts/sdl3',name),resolve(runtime,name));
for(const name of ['practice.mjs','practice-config.mjs','practice-sections.mjs'])await cp(resolve(root,'th08_web/sdl-runtime',name),resolve(runtime,name));
const inventory=JSON.parse(await readFile(resolve(runtime,'runtime-files.json'),'utf8'));
for(const name of Object.keys(inventory.files)){const bytes=await readFile(resolve(runtime,name));inventory.files[name]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
await writeFile(resolve(runtime,'runtime-files.json'),JSON.stringify(inventory,null,2)+'\n');
console.log(site);
