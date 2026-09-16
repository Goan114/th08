import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8').replaceAll('\r','');
const host=read('th08_web/cpp/sdl/GameHost.cpp');
const app=read('th08_web/cpp/game/GameApplication.cpp');
const rendererH=read('portable/sdl/Renderer.hpp');
const renderer=read('portable/sdl/Renderer.cpp');
const presentation=read('th08_web/cpp/game/Presentation.hpp');

// Fixed game clock: the rAF callback may execute zero/multiple fixed ticks,
// but a tick itself never draws and never receives display-rate delta time.
assert.match(host,/int tick\(\).*runtime->step\(false\)/s);
assert.match(host,/const auto ticks=cadence\.advance\(delta\)/);
assert.match(host,/elapsed\+=touhou::sdl::FrameCadence::interval;result=tick\(\)/);

// Every real 60 Hz tick still executes TH08's authoritative draw once. High
// refresh only hides that swap and follows it with a presentation-only draw.
assert.match(host,/runtime->app\.draw\(1\.0f,false,false\)/);
assert.match(host,/runtime->app\.draw\(alpha,interpolate,true\)/);
assert.match(host,/presentation_primed/);
assert.match(host,/const bool frozen=.*paused.*retrying.*pause_state.*show_retry/s);
const frameTick=host.indexOf('result=tick();if(result||!runtime)break;');
const frameDraw=host.indexOf('runtime->app.draw(1.0f,false,false)',frameTick);
const frameFault=host.indexOf('runtime->status(2)||runtime->status(4)',frameDraw);
const frameCount=host.indexOf('++frames',frameDraw);
const frameAudio=host.indexOf('runtime->audio_tick',frameCount);
assert(frameTick>=0&&frameTick<frameDraw&&frameDraw<frameFault&&frameFault<frameCount&&frameCount<frameAudio,'rAF fixed tick order must remain update -> draw/fault -> frames -> audio');
const manual=host.indexOf('EX("sdl_loop_tick")');
const manualTick=host.indexOf('result=tick()',manual),manualDraw=host.indexOf('runtime->app.draw(1.0f,false,false)',manualTick),manualFault=host.indexOf('runtime->status(2)||runtime->status(4)',manualDraw),manualCount=host.indexOf('++frames',manualDraw),manualAudio=host.indexOf('runtime->audio_tick',manualCount);
assert(manual>=0&&manualTick<manualDraw&&manualDraw<manualFault&&manualFault<manualCount&&manualCount<manualAudio,'manual fixed tick order must remain update -> draw/fault -> frames -> audio');

// Extra display frames must not advance original FPS/replay bookkeeping or
// consume sound commands. They may only redraw the already-produced state.
assert.match(app,/if\(presentation::render_only\)a\.statistics\.draw_text\(\);else a\.statistics\.calculate\(true\)/);
assert.match(app,/if\(!presentation_only\).*recording\.input\.timing_level=.*platform\.process_sounds\(\)/s);
assert.match(app,/if\(presentation_only\)\{ascii\.state\.string_count=string_count/);
assert.match(app,/if\(!presentation_only&&value<=0\)/);
assert.match(app,/if\(!presentation_only\)failed\|=invalid\(\)/);

// The old GPU command-replay/quad-matching experiment is forbidden. Owner
// state prev/current interpolation is the only high-refresh mechanism.
for(const source of [rendererH,renderer]){
  assert.doesNotMatch(source,/PresentationCommand|presentation_record|presentation_tag|sdl_interpolate|interpolatedBatches|presentationReplays/);
}
assert.match(presentation,/render_only/);
assert.match(presentation,/previous\+\(current-previous\)\*alpha/);

console.log('TH08 high-refresh contract PASS: fixed 60 Hz simulation + owner-side presentation-only interpolation');
