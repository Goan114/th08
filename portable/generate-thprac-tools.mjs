// Same shared-tool extraction boundary as the purple TH15 adapter (MIT).
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),upstream=resolve(process.argv[2]);
const read=p=>readFileSync(resolve(upstream,'thprac/src/thprac',p),'utf8').replace(/^\uFEFF/,'').replaceAll('\r\n','\n');
function region(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i);if(i<0||j<=i)throw Error('Purple tool extraction drift: '+a);return s.slice(i,j);}
const key=read('thprac_igi_key_render.cpp'),kh=read('thprac_igi_key_render.h'),tools=read('thprac_launcher_tools.cpp'),th=read('thprac_launcher_tools.h'),hooks=read('thprac_games_hooks.cpp'),games=read('thprac_games.cpp');
const f12=region(read('thprac_th08.cpp'),'        void ContentUpdate()','            ImGui::EndChild();');
for(const call of ['GameFPSOpt(mOptCtx)','DisableKeyOpt()','KeyHUDOpt()','InfLifeOpt()','GameplayOpt(mOptCtx)','InGameReactionTestOpt()','AboutOpt()'])if(!f12.includes(call))throw Error('TH08 F12 membership drift: '+call);
const keyEnum=region(key,'enum THKey','const std::string THKeyNames');
const record=region(key,'void RecordKey(','void KeysHUD(').replace('void RecordKey(int ver, uint32_t cur_key)','void record(int ver, uint32_t cur_key)').replace('    static std::deque<uint32_t> keys_per_sec; // 60 f','');
let hud=region(key,'void static KeysRect','void RecordKey(')+region(key,'void KeysHUD(','void SaveKeyRecorded()');
hud=hud.replace('    ImGuiIO& io = ImGui::GetIO();','    const auto& g_keys_down = key_monitor.g_keys_down;\n    const auto& g_key_mask = key_monitor.g_key_mask;\n    const auto g_aps_cur = key_monitor.g_aps_cur;\n    ImGuiIO& io = ImGui::GetIO();');
hud=hud.replace('std::string aps_text = std::format("aps: {:>3}/(60frame)", g_aps_cur);','char aps_buffer[64];std::snprintf(aps_buffer,sizeof aps_buffer,"aps: %3d/(60frame)",g_aps_cur);std::string aps_text=aps_buffer;');
const style=region(kh,'struct KeyRectStyle','void RecordKey');
const reactionClass=th.match(/class THGuiTestReactionTest[\s\S]*?\n};/)?.[0];
if(!reactionClass)throw Error('Purple reaction class drift');
let reaction=region(tools,'THGuiTestReactionTest::THGuiTestReactionTest()','class THGuiRollPlayer');
reaction=reaction.replaceAll('LARGE_INTEGER','PracticeCounter').replaceAll('QueryPerformanceFrequency','practice_counter_frequency').replaceAll('QueryPerformanceCounter','practice_counter_now').replaceAll('GetRndGenerator','practice_random_generator').replaceAll('DWORD','unsigned').replaceAll('std::fabsf','std::fabs');
reaction=reaction.replace(/    Gui::KeyboardInputUpdate\([^\n]+\);\n/g,'').replace(/\n        \|\| \(GetAsyncKeyState\(VK_DOWN\)[^;]+;/,';').replaceAll('VK_SHIFT','16');
reaction=reaction.replaceAll('GuiCenteredText(S(THPRAC_TOOLS_REACTION_TEST));','ImGui::TextUnformatted(S(THPRAC_TOOLS_REACTION_TEST));').replaceAll('std::format("{}(framecount)", S(THPRAC_TOOLS_REACTION_TEST_RESULT)).c_str()','(std::string(S(THPRAC_TOOLS_REACTION_TEST_RESULT))+"(framecount)").c_str()');
reaction=reaction.replace(/S\((TH\w+)\)/g,(_,k)=>'label(practice_'+k+')');
if(/GetAsyncKeyState|\bGui::|VK_|std::format|QueryPerformance|GetRndGenerator/.test(reaction.replace(/\/\/[^\n]*/g,'')))throw Error('Unmapped reaction platform dependency');
let input=region(hooks,'    if (g_input_opt.enable_auto_shoot) {','    if (g_input_opt.disable_f10_11_13) {');
const scans={Z:90,X:88,C:67,D:68,ESCAPE:27,R:82,Q:81,LSHIFT:160,RSHIFT:161};
input=input.replaceAll('g_input_opt.','').replaceAll('((BYTE*)state)','state').replace(/DIK_([A-Z]+)/g,(_,k)=>{if(!(k in scans))throw Error('Unmapped input scan '+k);return scans[k];}).replaceAll('IS_KEY_DOWN','is_key_down');
if(/DIK_|BYTE|g_input_opt/.test(input))throw Error('Unmapped input platform boundary');
let speed=region(games,'bool GameFPSOpt(','void DisableKeyOpt(').replace('adv_opt_ctx& ctx','PracticeSpeed& ctx').replaceAll('GetRelWidth(0.23f)','ImGui::GetIO().DisplaySize.x*.23f').replaceAll('HelpMarker("Blah");','ImGui::TextDisabled("(?)");').replace('ChangeBGMSpeed(ctx.fps / 60.0f, -1.0f);','').replace('BGMPitchChanger();','').replace(/S\((TH\w+)\)/g,(_,k)=>'label(practice_'+k+')');
// Native process-local widget state must belong to a browser runtime session.
speed=speed.replace('    bool clickedApply = false;',`    if (reset_speed_ui) {
        fps = 0; fpsStatic = 60; fpsSlowStatic = fpsFastStatic = 0;
        fpsDebugAcc = fpsMultiplier = 0; canFpsChangeFreely = false;
        reset_speed_ui = false;
    }
    bool clickedApply = false;`);
if(/adv_opt_ctx|ChangeBGMSpeed|BGMPitchChanger|\bS\(/.test(speed))throw Error('Unmapped speed platform dependency');
const preamble='// Generated from purple shared tools (MIT), following TH15.\n';
let hitbox=region(read('thprac_th08.cpp'),'    void RenderBtHitbox(','    void RenderLockTimer(');
hitbox=hitbox.replace('ImDrawList* p)','ImDrawList* p, BrowserRuntime& runtime)')
 .replace('g_show_bullet_hitbox','runtime.app.session.practice.show_bullet_hitbox')
 .replace('DWORD mode = *(DWORD*)(0x164D0B4);','u32 mode = runtime.app.game.globals.game_flags;')
 .replace('(GetMemContent(GAMEMODE_ADDR) == 2)','runtime.app.in_game()')
 .replace('ImVec2 plpos1 = *(ImVec2*)(0x017D6284);','const auto& bounds = runtime.app.game.player_state.motion.movement.bounds;\n                ImVec2 plpos1{bounds[0].x,bounds[0].y};')
 .replace('ImVec2 plpos2 = *(ImVec2*)(0x017D6290);','ImVec2 plpos2{bounds[1].x,bounds[1].y};')
 .replace('DWORD pbt = 0x00F54E90 + 0x1A880 + i * 0x10B8;','const auto& bullet = runtime.app.game.projectile_pool.bullets[i];')
 .replace('*(WORD*)(pbt + 0xD88)','u16(bullet.since_fired.current)')
 .replace('ImVec2 pos = *(ImVec2*)(pbt + 0xD44);','ImVec2 pos{bullet.position.x,bullet.position.y};')
 .replace('ImVec2 hit = *(ImVec2*)(pbt + 0xD34);','ImVec2 hit{bullet.sprites.hitbox.x,bullet.sprites.hitbox.y};')
 .replace('DWORD pls = 0x015B57C8 + 0x59C * i;','const auto& laser = runtime.app.game.projectile_pool.lasers[i];')
 .replace('DWORD is_used = *(DWORD*)(pls + 0x584);','int is_used = laser.in_use;')
 .replace('ImVec2 pos = *(ImVec2*)(pls + 0x548);','ImVec2 pos{laser.position.x,laser.position.y};');
const laserFields={554:'angle',564:'width',558:'start_offset','55C':'end_offset',598:'state',574:'hitbox_start',580:'hitbox_stop',590:'timer.current','58C':'timer.fraction',570:'start','57C':'stop'};
hitbox=hitbox.replace(/\*\((?:float|DWORD)\*\)\(pls \+ 0x([0-9A-F]+)\)/g,(_,offset)=>{if(!laserFields[offset])throw Error('Unmapped laser offset '+offset);return 'laser.'+laserFields[offset];});
if(/\b(?:DWORD|WORD|pbt|pls|GetMemContent|GAMEMODE_ADDR)\b|0x0(?:17D|0F5|15B)/.test(hitbox))throw Error('Unmapped hitbox owner');
const hitboxLayout=`static_assert(offsetof(BulletState,position)==0xd44 && offsetof(BulletState,sprites)+offsetof(BulletTemplate,hitbox)==0xd34);\nstatic_assert(offsetof(BulletState,since_fired)+offsetof(Timer,current)==0xd88);\nstatic_assert(offsetof(LaserState,position)==0x548 && offsetof(LaserState,in_use)==0x584 && offsetof(LaserState,timer)+offsetof(Timer,current)==0x590 && offsetof(LaserState,state)==0x598);\n`;
// Extract the native decompressor verbatim. Wasm cannot capture host RSQRTSS:
// Custom defaults to the browser reference seed; importing a native capture
// replaces that table atomically without pretending to identify the host CPU.
let rsqrt=region(read('thprac_th08.cpp'),'     class RsqrtssCompatiable {','        static void GetCustomBuffer()');
rsqrt=rsqrt.replace('class RsqrtssCompatiable','class PracticeRsqrtTables').replaceAll('static std::vector<char>','inline static std::vector<char>');
// The production host disables C++ exceptions. Only immutable, generated
// reference data reaches these native decoder errors; retain fatal rejection.
rsqrt=rsqrt.replace(/throw std::runtime_error\([^;]+\);/g,'std::abort();');
rsqrt+=region(read('thprac_th08.cpp'),'        static void GetCustomBuffer()','        static float CurrentRsqrt(');
rsqrt+=`static float CurrentRsqrt(float input){return 1.f/std::sqrt(input);}
public:
 static void initialize(){if(buffer_i.empty())Decompress(th08_rsqrt_data,sizeof(th08_rsqrt_data));}
 static uint32_t lookup_bits(uint32_t input,char cpu){
  initialize();const std::vector<char>* table=&buffer_i;
  if(cpu=='a'||cpu=='A')table=&buffer_a;
  else if(cpu=='c'||cpu=='C'){if(buffer_custom.size()!=RSQ_SIZE_BYTES)GetCustomBuffer();table=&buffer_custom;}
  return ReadU32LE(table->data()+size_t(input>>11)*4u);
 }
 static bool import_custom(const char* bytes,size_t size){if(!bytes||size<RSQ_SIZE_BYTES)return false;std::vector<char> candidate(bytes,bytes+RSQ_SIZE_BYTES);buffer_custom.swap(candidate);return true;}
 static const std::vector<char>& custom(){if(buffer_custom.size()!=RSQ_SIZE_BYTES)GetCustomBuffer();return buffer_custom;}
 static float lookup(float input,char cpu){uint32_t bits;std::memcpy(&bits,&input,4);bits=lookup_bits(bits,cpu);float output;std::memcpy(&output,&bits,4);return output;}
 static constexpr size_t custom_size=RSQ_SIZE_BYTES;
};\n`;
const rsqrtData=read('thprac_th08_rsqrt.h').replace('#pragma once\n','').replace('#include <cstdint>\n','').replace('const uint8_t th08_rsqrt_data','inline constexpr uint8_t th08_rsqrt_data').split('\n').map(line=>line.trimEnd()).join('\n');
const files={
 'th08_web/cpp/game/PracticeLicense.hpp':`${preamble}#pragma once\nnamespace th08 {inline constexpr const char* practice_license=${JSON.stringify(readFileSync(resolve(upstream,'LICENCE'),'utf8'))};}\n`,
 'th08_web/cpp/game/PracticeInput.hpp':`${preamble}#pragma once\n#include "Types.hpp"\nnamespace th08 {struct PracticeInput {\n bool enable_auto_shoot=false;int shoot_key_DIK=-1;bool last_is_auto_shoot_key_down=false,is_auto_shooting=false,is_th128=false;\n bool disable_xkey=false,disable_Ckey_at_same_time=true,disable_shiftkey=false,force_shiftkey=false,disable_zkey=false;\n bool enable_fast_retry=false;int fast_retry_count_down=0;static constexpr int fast_retry_cout_down_max=15;\n static bool is_key_down(u8 b){return (b&0x80)!=0;}\n void apply(u8* state){\n${input}\n if(fast_retry_count_down){if(fast_retry_count_down<=fast_retry_cout_down_max)state[27]=0x80;if(fast_retry_count_down<=1)state[82]=0x80;}\n }\n void begin_retry(int mode){if(mode&&enable_fast_retry)fast_retry_count_down=fast_retry_cout_down_max;}\n void gui_tick(){if(fast_retry_count_down)fast_retry_count_down--;}\n void reset(){last_is_auto_shoot_key_down=is_auto_shooting=false;fast_retry_count_down=0;}\n};}\n`,
 'th08_web/cpp/game/PracticeKeyMonitor.hpp':`${preamble}#pragma once\n#include <cstdint>\n#include <deque>\n#include <vector>\n#include <string>\nnamespace th08 {${keyEnum}\nstruct PracticeKeyMonitor {\n std::vector<int> g_recorded_aps;std::vector<uint16_t> g_recorded_keys;bool g_keys_down[END]{};uint32_t g_key_mask[END]{};int g_aps_cur=0;bool g_record_key_aps=false;std::deque<uint32_t> keys_per_sec;\n${record}\n void clear_record(){g_recorded_aps.clear();g_recorded_keys.clear();}\n std::string csv()const{std::string out="frame,aps,up,down,left,right,Z,X,C,D,Ctrl,Shift\\n";for(size_t j=0;j<g_recorded_aps.size();j++){out+=std::to_string(j+1)+","+std::to_string(g_recorded_aps[j]);for(int i=0;i<END;i++)out+=(g_recorded_keys[j]&(1<<i))?",O":",-";out+="\\n";}return out;}\n};}\n`,
 'th08_web/cpp/sdl/PracticeKeyHud.inc':preamble+style+hud,
 'th08_web/cpp/sdl/PracticeReaction.inc':preamble+reactionClass.replaceAll('LARGE_INTEGER','PracticeCounter')+'\n'+reaction,
 'th08_web/cpp/sdl/PracticeSpeed.inc':preamble+speed,
 'th08_web/cpp/sdl/PracticeHitbox.inc':preamble+hitboxLayout+hitbox,
 'th08_web/cpp/game/PracticeRsqrtTables.hpp':preamble+'#pragma once\n#include <cstdint>\n#include <cstring>\n#include <cstdlib>\n#include <cmath>\n#include <vector>\nnamespace th08 {\n'+rsqrtData+'\n'+rsqrt+'}\n',
};
for(const p of Object.keys(files))files[p]=files[p].split('\n').map(line=>line.trimEnd()).join('\n').trimEnd()+'\n';
if(process.argv.includes('--write')){for(const[p,v]of Object.entries(files))writeFileSync(resolve(root,p),v);console.log('Generated TH08 purple shared tools');}
else if(process.argv.includes('--check')){for(const[p,v]of Object.entries(files))if(!existsSync(resolve(root,p))||readFileSync(resolve(root,p),'utf8').replaceAll('\r\n','\n').trimEnd()!==v.trimEnd())throw Error('Stale shared tools: '+p);console.log('Purple shared tool extraction verified');}
else throw Error('Use --write or --check');
