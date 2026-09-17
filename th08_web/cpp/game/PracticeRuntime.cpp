// Source-level adapter for thprac TH08 1.00d. Upstream patches: MIT,
// Copyright (c) 2022 Ack; see THPRAC-LICENSE.txt and PracticePatches.inc.
#include "PracticeRuntime.hpp"
#include "PracticeSections.hpp"
#include "GameplayScene.hpp"
#include "ItemPool.hpp"
#include <algorithm>
#include <utility>
namespace th08 {
namespace {
using std::pair;
template<class T> auto ECLX(int offset,T value){return pair{offset,value};}
// All addresses in generated code are offsets into owned game scripts.
// Bounds failures abort startup rather than accessing executable memory.
class ScriptWriter {
    u8* data;u32 size;u32 position=0;
public:
    bool valid=true;
    ScriptWriter(u8* bytes,u32 length):data(bytes),size(length){}
    void SetPos(u32 offset){position=offset;}
    template<class T> ScriptWriter& operator<<(T value){if(position>size||sizeof(T)>size-position){valid=false;return *this;}std::memcpy(data+position,&value,sizeof(T));position+=sizeof(T);return *this;}
    template<class K,class T> ScriptWriter& operator<<(std::pair<K,T> value){SetPos(u32(value.first));return *this<<value.second;}
    template<class T> T read(u32 offset){T value{};if(offset>size||sizeof(T)>size-offset)valid=false;else std::memcpy(&value,data+offset,sizeof(T));return value;}
};
using ECLHelper=ScriptWriter;
class PracticePatcher {
    GameplayScene& scene;GameplaySession& session;const PracticeConfig& thPracParam;
    ScriptWriter ecl,stdfile;bool valid=true;
    enum {ECL_TL_TIME=0,ECL_TL_OPCODE=4,ECL_TL_OFFNEXT=6,ECL_INS_TIME=0,ECL_INS_OPCODE=4,ECL_INS_ARG1=12,ECL_INS_ARG2=16};
    void ECLWarp(i32 t0,i32 o0,i32 t1=-1,i32 o1=-1,i32 t2=-1,i32 o2=-1,i32 t3=-1,i32 o3=-1){
        const i32 times[]{t0,t1,t2,t3},offsets[]{o0,o1,o2,o3};
        for(u32 i=0;i<4;i++)if(times[i]!=-1){
            if(i>=scene.program.timeline_count()){valid=false;return;}
            auto& vm=scene.enemies.state.timelines[i];vm.program=&scene.program;vm.timeline=i;vm.difficulty=scene.globals.difficulty;vm.timer.set(times[i]);
            vm.instruction=scene.program.timeline(i);vm.finished=vm.invalid=false;
            if(offsets[i]!=-1){const auto* base=scene.program.data();const u32 start=u32(reinterpret_cast<const u8*>(scene.program.timeline(i))-base),end=start+scene.program.timeline_size(i);
                if(offsets[i]<i32(start)||u32(offsets[i])+8>end||(offsets[i]&3)){valid=false;return;}
                vm.instruction=reinterpret_cast<EclTimelineInstruction*>(scene.program.mutable_data()+offsets[i]);
            }
        }
    }
    void ECLTimeFix(int offset,i32 time,unsigned count){for(unsigned i=0;i<count;i++){const auto length=ecl.read<i16>(offset+6);if(length<12||(length&3)){valid=false;return;}ecl<<pair{offset,time};offset+=length;}}
    void ECLCallSub(ECLHelper& out,int offset,int sub,int time=-1,bool stall=false){out.SetPos(offset);out<<(time==-1?0:time)<<0x00100034<<0x0000ff00<<sub;if(stall)out<<0xffffffffu<<0x000cffff<<0x00ffff00;}
    void ECLJump(ECLHelper& out,int offset,int dest,int time=0,int instruction_time=-1){out.SetPos(offset);out<<(instruction_time==-1?0:instruction_time)<<0x00140004<<0x0000ff00<<time<<(dest-offset);}
    void ECLSetTime(ECLHelper& out,int offset,i32 time,i32 sub,int instruction_time=-1,bool stall=true){out.SetPos(offset);out<<(instruction_time==-1?0:instruction_time)<<0x00140086<<0x0000ff00<<time<<sub;if(stall)out<<0x999999<<0x000c0000<<0x0000ff00;}
    void ECLSetHealth(ECLHelper& out,int offset,i32 health,int time=-1,bool stall=true){out.SetPos(offset);out<<(time==-1?0:time)<<0x00100083<<0x0000ff00<<health;if(stall)out<<0x999999<<0x000c0000<<0x0000ff00;}
    void ECLCheckTime(i32 time){auto& n=session.numbers;if(n.time_orbs<time)n.time_orbs=n.total_time_orbs=session.history.time_orbs=time;}
    void STDJump(int offset,i32 ordinal,i32 time,i32 instruction_time=0){stdfile.SetPos(offset);stdfile<<instruction_time<<0x000c0004<<ordinal<<time<<0;}
    void STDStage4Fix(bool last=false){stdfile<<pair{0xed8,1}<<pair{0xf14,1};if(last){stdfile.SetPos(0x1394);stdfile<<6926<<0x000c001f<<2<<0<<0<<6926<<0x000c0004<<1<<0<<0;STDJump(0xf48,70,6926);}}
    void MSGNameFix(){
        const auto stage=scene.globals.stage;int name=0;
        if(stage==5&&thPracParam.section>=TH08_ST5_BOSS1)name=22;
        if(stage==6)scene.background.dialogue_state=2;
        if(stage==7||(stage==8&&thPracParam.section>=TH08_ST7_END_NS1)){
            std::swap(scene.globals.enemy_animation_files[0],scene.globals.enemy_animation_files[1]);scene.background.dialogue_state=2;name=stage==7?24:25;
        }
        if(name)valid&=scene.hud.front&&scene.name_atlas.copy(*scene.hud.front,name);
    }
#include "PracticePatches.inc"
public:
    PracticePatcher(GameplayScene& g,GameplaySession& s):scene(g),session(s),thPracParam(s.practice.run),ecl(g.program.mutable_data(),g.program.size()),stdfile(reinterpret_cast<u8*>(g.background_script.program.header()),g.background_script.program.bytes_size()){}
    bool apply(){
        // Upstream direct-frame starts alter timeline zero only. Exact section
        // warps below overwrite that clock and set each additional timeline.
        scene.enemies.state.timelines[0].timer.set(thPracParam.frame);
        if(thPracParam.section>=10000)THStageWarp(ecl,(thPracParam.section-10000)/100,thPracParam.section%100);
        else if(thPracParam.section)THPatch(ecl,thPracParam.section);
        if(thPracParam.section)scene.program.enable_practice_instructions();
        return valid&&ecl.valid&&stdfile.valid;
    }
};
}
bool apply_practice(GameplayScene& g,GameplaySession& s){
    auto& state=s.practice;if(!state.active||state.run.mode!=1)return true;
    const auto& p=state.run;if(!p.valid())return false;
    // Practice data belongs to its selected stage. If the game advances after
    // completing it, continue normally instead of applying stale script edits.
    if(u32(p.stage)!=g.globals.stage){state.active=false;return true;}
    auto& n=s.numbers;n.score=n.display_score=u32(p.score/10);n.lives=float(p.life);n.bombs=float(p.bomb);n.power=float(p.power);
    n.gauge=n.gauge_copy=i16(std::clamp(p.gauge,int(s.thresholds.minimum),int(s.thresholds.maximum)));
    n.graze=n.graze_stage=p.graze;n.points=p.point?p.point:p.point_total;n.points_stage=p.point?p.point:p.point_stage;s.history.points=n.points;
    n.point_extends=0;do{point_item_extend_threshold(n,g.globals.difficulty);if(n.points<n.next_point_extend)break;++n.point_extends;}while(n.point_extends<32);
    n.time_orbs=n.total_time_orbs=s.history.time_orbs=p.time;n.point_value=p.value/10*10;n.clock_time=i8(p.night);
    s.rank.value=p.rankLock?p.rank:std::min(p.rank,(g.globals.difficulty==2||g.globals.difficulty==3)?12:16);
    if(p.rankLock)s.rank.minimum=s.rank.maximum=p.rank;
    if(!PracticePatcher(g,s).apply())return false;
    state.familiar_pending=p.familiar!=0;g.enemies.population.practice_familiar=state.familiar_pending?p.familiar:0;
    const bool boss=p.section>=10000?((p.stage==3||p.stage==4)&&p.section%100>4):(p.section&&!p.dlg&&practice_sections[p.section].bgm);
    if(boss){
        constexpr i32 songs[9][3]{{1,2,0},{3,4,0},{5,6,0},{7,8,0},{7,9,0},{10,11,0},{12,13,15},{12,14,15},{16,17,0}};
        const i32 slot=(p.section==TH08_ST6A_LS||(p.section>=TH08_ST6B_LS1&&p.section<=TH08_ST6B_LS5))?2:1;
        g.control.state.start_music=2;g.play_practice_music(slot,songs[p.stage][slot]);
    }
    // Direct writes match upstream; recompute integrity without consuming RNG.
    s.values.refresh_integrity();return true;
}
void update_practice(GameplayScene& g,GameplaySession& s){
    auto& p=s.practice;if(!p.enabled||p.replay||!p.cheats)return;
    p.assisted=true;auto& n=s.numbers;
    if(p.cheats&1){if(g.globals.player_state==0||g.globals.player_state==3){g.globals.player_state=3;g.globals.player_state_timer.set(60);}}
    if(p.cheats&2)n.lives=8;if(p.cheats&4)n.bombs=8;if(p.cheats&8)n.power=128;
    if(p.cheats&16)n.clock_time=i8(p.active?p.run.night:0);
    if(p.cheats&32)g.player_state.life.auto_bomb=1;
    s.values.refresh_integrity();
}
}
