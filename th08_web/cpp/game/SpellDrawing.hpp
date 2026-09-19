#pragma once
#include "EclVm.hpp"
#include "AnmExecutor.hpp"
#include "AnmRenderer.hpp"
#include <array>
namespace th08 {
// Original 004178c0: overlapping portraits, name panels and the spell bonus /
// capture-history digits use the same VMs advanced by SpellSystem.
class SpellDrawing {
    EclGlobals& state;const SpellRecord* records;AnmRenderer& renderer;
    std::array<AnmVm,14> presentation_previous{};bool presentation_valid=false;
    AnmVm presentation_vm(u32 index)const;
    bool digit(i32 value,AnmVm& vm);
public:
    AnmLoaded* digits=nullptr;
    SpellDrawing(EclGlobals& s,const SpellRecord* r,AnmRenderer& a):state(s),records(r),renderer(a){}
    void snapshot_presentation();
    bool draw();
};
}
