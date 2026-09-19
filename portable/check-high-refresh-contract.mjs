import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8').replaceAll('\r','');
const host=read('th08_web/cpp/sdl/GameHost.cpp');
const app=read('th08_web/cpp/game/GameApplication.cpp');
const rendererH=read('portable/sdl/Renderer.hpp');
const renderer=read('portable/sdl/Renderer.cpp');
const presentation=read('th08_web/cpp/game/Presentation.hpp');
const ascii=read('th08_web/cpp/game/AsciiManager.cpp');
const background=read('th08_web/cpp/game/BackgroundView.cpp');
const player=read('th08_web/cpp/game/PlayerSimulation.cpp');
const bullets=read('th08_web/cpp/game/BulletDrawing.cpp');

// Fixed game clock: one rAF callback may execute zero or one fixed tick. Late
// callbacks skip expired 60 Hz deadlines instead of replaying catch-up ticks.
assert.match(host,/int tick\(\).*runtime->step\(false\)/s);
assert.match(host,/const bool tick_due=cadence\.advance\(delta\)!=0/);
assert.match(host,/if\(tick_due&&!result\)/);
assert.doesNotMatch(host,/for\(unsigned i=0;i<ticks/);
assert.match(host,/elapsed\+=touhou::sdl::FrameCadence::interval;result=tick\(\)/);
assert.match(host,/th08_limit_presentation_to_60/);
assert.match(host,/const bool limit60=th08_limit_presentation_to_60\(\)!=0/);
assert.match(host,/const bool ready=interpolation_ready\(\)&&!limit60/);

// Every real 60 Hz tick still executes TH08's authoritative draw once. High
// refresh only hides that swap and follows it with a presentation-only draw.
assert.match(host,/runtime->app\.draw\(1\.0f,false,false\)/);
assert.match(host,/runtime->app\.draw\(alpha,interpolate,true,!frozen\)/);
assert.match(host,/presentation_primed/);
assert.match(host,/const bool frozen=.*paused.*retrying.*pause_state.*show_retry/s);
const frameTick=host.indexOf('result=tick();');
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
assert.match(presentation,/world_alpha/);
assert.match(presentation,/lerp_world/);
assert.match(app,/presentation::begin\(presentation_alpha,presentation_active,presentation_only,world_interpolate\)/);

// Score popups own their world position outside AnmVm. Their continuous rise
// must publish a previous endpoint while sprite-age changes remain discrete.
assert.match(ascii,/score_popup_previous\[i\]=\{p\.position,p\.timer\.current,p\.in_use,p\.characters\}/);
assert.match(ascii,/presentation::lerp_world\(before\.position\.y,p\.position\.y\)/);
assert.match(ascii,/direct_sprite\(small,p\.text\[i\]\+\(p\.timer\.current<52\?0:p\.timer\.current<56\?11:21\)\)/);
assert.match(background,/presentation::lerp_world\(float\(s\.spell_frames-1\),float\(s\.spell_frames\)\)/);
assert.match(player,/state\.life\.state==1\|\|state\.life\.state==2/);
assert.match(player,/presentation_previous_script==current\.scriptIndex/);
assert.match(player,/animation\.scale=\{presentation::lerp_world/);
assert.match(player,/animation\.color1\.a=u8\(std::clamp\(presentation::lerp_world/);
assert.match(bullets,/p\.scale_x=vm\.scale\.x/);
assert.match(bullets,/p\.scale_y=vm\.scale\.y/);
assert.match(bullets,/p\.state==l\.state/);
assert.match(bullets,/p\.script==l\.animation\[0\]\.scriptIndex/);
assert.match(bullets,/p\.script==source\.scriptIndex/);
assert.match(bullets,/p\.sprite==source\.activeSpriteIndex/);
assert.match(bullets,/scale_x=presentation::lerp_world\(p\.scale_x,scale_x\)/);
assert.match(bullets,/scale_y=presentation::lerp_world\(p\.scale_y,scale_y\)/);

console.log('TH08 high-refresh contract PASS: fixed 60 Hz simulation + owner-side presentation-only interpolation');
