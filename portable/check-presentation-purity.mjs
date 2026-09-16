import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8').replaceAll('\r','');

// Presentation sidecars must stay outside original TH08 ABI/state layouts.
for(const path of [
  'th08_web/cpp/game/AnmLayout.hpp',
  'th08_web/cpp/game/BulletState.hpp',
  'th08_web/cpp/game/ItemPool.hpp',
  'th08_web/cpp/game/EclVm.hpp',
  'th08_web/cpp/game/GuiState.hpp',
  'th08_web/cpp/game/PlayerMovement.hpp',
]) assert.doesNotMatch(read(path),/presentation_(?:previous|state|valid|alpha|render)/i,`${path} must remain authoritative/ABI-only`);

const app=read('th08_web/cpp/game/GameApplication.cpp');
assert.match(app,/if\(presentation_only\)\{ascii\.state\.string_count=string_count/);
assert.match(app,/if\(!presentation_only\).*platform\.process_sounds\(\)/s);
assert.match(app,/if\(!presentation_only&&value<=0\)/);
assert.match(app,/if\(!presentation_only\)failed\|=invalid\(\)/);
assert.match(app,/ascii\.state\.color=ascii_color/);

const control=read('th08_web/cpp/game/GameplayControl.cpp');
assert.match(control,/if\(!presentation::render_only&&menu\.pause_state\)menu\.pause_state=2/);

const gui=read('th08_web/cpp/game/GuiView.cpp');
assert.match(gui,/if\(!presentation::render_only\)gui\.flags\.lives=gui\.flags\.bombs/);
assert.match(gui,/if\(!presentation::render_only&&gui\.previous_spell_seconds!=gui\.spell_seconds\)/);
assert.match(gui,/if\(!presentation::render_only&&!context\.paused/);

const items=read('th08_web/cpp/game/ItemPool.cpp');
assert.match(items,/if\(!presentation::render_only\).*p->onscreen/s);
assert.match(items,/if\(presentation::render_only\)\{copy=source;vm=&copy;\}/);

const background=read('th08_web/cpp/game/BackgroundObjects.cpp');
assert.match(background,/if\(!presentation::render_only\)object\.flags\|=2/);
assert.match(background,/presentation::render_only.*presentation_vms/s);

const enemy=read('th08_web/cpp/game/EnemySystem.cpp');
assert.match(enemy,/if\(!presentation::render_only\)failed\|=!ok/);

const bullets=read('th08_web/cpp/game/BulletDrawing.cpp');
assert.match(bullets,/if\(presentation::render_only\)\{copy=source;vm=&copy;\}/);
assert.match(bullets,/if\(presentation::render_only\)\{body_copy=\*body;body=&body_copy;\}/);

const player=read('th08_web/cpp/game/PlayerSimulation.cpp');
assert.match(player,/if\(!presentation::render_only\)synchronize_shots\(\)/);
assert.match(player,/if\(presentation::render_only\)\{failed=failed_before;shots\.failure=shot_failure_before;\}/);

const title=read('th08_web/cpp/game/TitleView.cpp');
assert.match(title,/saved_name_positions/);
assert.match(title,/if\(presentation::render_only\).*spellCardNameVms\[i\]\.pos=saved_name_positions\[i\]/s);

const spell=read('th08_web/cpp/game/SpellDrawing.cpp');
assert.match(spell,/if\(presentation::render_only\).*v\[10\]=saved10/s);

const loading=read('th08_web/cpp/game/LoadingScreen.cpp');
assert.match(loading,/if\(!presentation::render_only\)phase=wrapping_add/);
assert.match(loading,/if\(presentation::render_only\)\{ascii\.state\.color=saved_color/);

const effects=read('th08_web/cpp/game/EffectSystem.cpp');
assert.match(effects,/EffectState copy=\*e/);
assert.match(effects,/copy\.vertices=vertices\.data\(\)/);
assert.match(effects,/if\(presentation::render_only\).*EffectState copy=\*e/s);

const runtime=read('th08_web/cpp/platform/BrowserRuntime.cpp');
assert.match(runtime,/if\(presentation::render_only\)return graphics_device\(\)\.present\(back\)&&!capture_failed/);

console.log('TH08 presentation purity PASS: render-only frames are isolated from authoritative ABI/state owners');
