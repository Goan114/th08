#pragma once
#include "Types.hpp"
#include <vector>
namespace th08 {
// Explicit field order is shared by the browser bridge and replay trailer.
// Keep this independent of object layout, padding and platform pointer width.
struct PracticeConfig {
    i32 mode=1,stage=0,warp=0,section=0,phase=0,frame=0,dlg=0;
    i64 score=0;
    i32 life=2,bomb=8,power=128,gauge=0,graze=0,point=0,point_total=0,point_stage=0;
    i32 time=0,value=60000,night=0,familiar=0,rank=12,rankLock=0;
    static constexpr u32 word_count=23;
    bool decode(const double* words,u32 count);
    void encode(double* words)const;
    bool valid()const;
};
struct PracticeState {
    bool enabled=false,active=false,replay=false,menu=false,accepted=false;
    PracticeConfig configured,run;
    // Cheats are deliberately unavailable during replay and disable saving a
    // recording once used: a changing trainer state isn't a deterministic run.
    u32 cheats=0;bool assisted=false,familiar_pending=false,everlasting_bgm=false;
    // Everlasting-BGM filter state, mirroring ElBgmTest's statics upstream.
    i32 el_bgm_lock=-1;bool el_bgm_block=false;
    // Advanced Options owns these independently of the in-game F1-F7 flags,
    // exactly like THAdvOptWnd's persistent context in upstream thprac.
    bool all_clear_bonus=false,doswnc=false;
    // TH08's Tab tracker keeps this per-run counter separately from the
    // aggregate captured-spell value stored by the original game.
    u32 tracker_last_spell_captures=0,tracker_dissolve_count=0;
};
std::vector<u8> practice_trailer(const PracticeConfig&);
// Strips only our final trailer; callers can subsequently read THMOTION.
bool read_practice_trailer(const u8*,u32& size,PracticeConfig&,bool& found);
}
