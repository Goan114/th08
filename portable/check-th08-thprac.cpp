#include "../th08_web/cpp/game/PracticeConfig.hpp"
#include "../th08_web/cpp/game/PracticeSections.hpp"
#include <cassert>
using namespace th08;
int main(){
    PracticeConfig original;original.stage=5;original.section=TH08_ST5_BOSS1;original.score=9876543210LL;
    original.gauge=-5000;original.time=7200;original.value=123450;original.night=7;original.familiar=250;original.rank=40;original.rankLock=1;
    assert(original.valid());double words[PracticeConfig::word_count]{};original.encode(words);
    PracticeConfig decoded;assert(decoded.decode(words,PracticeConfig::word_count));assert(decoded.stage==5&&decoded.section==original.section&&decoded.score==original.score&&decoded.gauge==-5000);
    const auto trailer=practice_trailer(original);assert(trailer.size()==PracticeConfig::word_count*8+24);
    PracticeConfig replay;bool found=false;u32 size=u32(trailer.size());assert(read_practice_trailer(trailer.data(),size,replay,found));assert(found&&size==0&&replay.score==original.score&&replay.familiar==250);
    auto corrupt=trailer;corrupt[3]^=1;size=u32(corrupt.size());assert(!read_practice_trailer(corrupt.data(),size,replay,found));
    words[3]=19999;assert(!decoded.decode(words,PracticeConfig::word_count));
}
