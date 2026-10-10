import {cp,mkdir,rm,stat,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const th08=resolve(import.meta.dirname,'..');
const launcher='C:/Users/w3051/Desktop/eagler/eagler-touhou';
const site=resolve(th08,'th08_web/artifacts/local-import-site');
const runtime=resolve(th08,'build-eagler');
const lib=name=>pathToFileURL(resolve(launcher,'lib',name)).href;
const {FRONTEND_PACKAGE_FILES,resolveFrontendPackageSource,hostArtworkFiles}=await import(lib('frontend-manifest.mjs'));
const {DEVELOPMENT_CONTENT}=await import(lib('development-content.mjs'));
const {HOST_MANIFEST_SCHEMA,validateHostManifest}=await import(lib('contracts/host-manifest.mjs'));
const {PRODUCT_GAMES,HOST_PROTOCOL}=await import(lib('contracts/product-catalog.mjs'));
const copy=async(from,to)=>{await mkdir(dirname(to),{recursive:true});await cp(from,to);};
await rm(site,{recursive:true,force:true});await mkdir(site,{recursive:true});
await cp(resolve(launcher,'.cache/build/optimized'),site,{recursive:true});
for(const name of FRONTEND_PACKAGE_FILES)await copy(resolveFrontendPackageSource(name),resolve(site,name));
const game='th08',product=PRODUCT_GAMES[game],identity=DEVELOPMENT_CONTENT.games[game].data.identity;
// Language selection follows TH06/07: the Host Manifest declares only the
// original Japanese baseline. Chinese/English arrive through the imported
// offline package's components.language entries, exactly like the other titles.
const entry={runtime:'runtime/th08/th08.html?hosted=1',gameData:{path:product.package.dataTarget.slice(1),bytes:identity.bytes,sha256:identity.sha256,version:`sha256-${identity.sha256}`,layout:identity.layout},music:{midi:{files:[]}},features:{thprac:product.features.thprac},languages:[],languageOptions:[{id:'ja',title:'日本語(原版)',pack:null}],offlineCompatibility:{schema:'eagler-touhou/offline-game-pack/1',runtimeCompatibility:{protocol:HOST_PROTOCOL,dataLayout:identity.layout,versionSource:'offline-pack'},requiredShared:[...product.requiredShared],languages:{source:'offline-pack',baseline:['ja']}}};
const manifest=validateHostManifest({schema:HOST_MANIFEST_SCHEMA,protocol:HOST_PROTOCOL,profile:'web-validation-self-host-import',shared:{resourceMode:'import',testBuild:false},games:{[game]:entry}});
await writeFile(resolve(site,'host-manifest.json'),JSON.stringify(manifest,null,2)+'\n');await writeFile(resolve(site,'release-catalog.json'),JSON.stringify({schema:'eagler-touhou/release-catalog/1',games:{}},null,2)+'\n');
for(const name of ['th08.html','manifest.json','shell.mjs','eagler-host.mjs','practice.mjs','practice-config.mjs','practice-sections.mjs','motion-replay.mjs','resources.json','runtime-files.json','fonts/blend.bin','fonts/cp932.bin'])await copy(resolve(runtime,name),resolve(site,'runtime/th08',name));
for(const name of ['th08-sdl.mjs','th08-sdl.wasm'])await copy(resolve(runtime,name),resolve(site,'runtime/th08',name));
for(const name of hostArtworkFiles([game])){for(const candidate of [resolve(launcher,name),resolve(launcher,'artifacts/host-artwork',name),resolve(th08,'assets',name)]){try{await stat(candidate);await copy(candidate,resolve(site,'assets',name));break;}catch{}}}
console.log(JSON.stringify({site,wasm:(await stat(resolve(site,'runtime/th08/th08-sdl.wasm')).then(v=>v.size)),languageOptions:entry.languageOptions.map(l=>l.id)}));
