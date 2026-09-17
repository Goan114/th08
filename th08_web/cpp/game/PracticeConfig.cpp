#include "PracticeConfig.hpp"
#include "PracticeSections.hpp"
#include <cmath>
#include <algorithm>
namespace th08 {
bool PracticeConfig::valid()const {
    if(mode<0||mode>1||stage<0||stage>8||warp<0||warp>7||phase<0||phase>6||frame<0||dlg<0||dlg>1)return false;
    if(section>=10000){constexpr int portions[]{2,4,3,6,6,5,2,2,7};if((section-10000)/100!=stage+1||(section%100)<1||(section%100)>portions[stage])return false;}
    else if(section<0||u32(section)>=sizeof(practice_sections)/sizeof(*practice_sections)||(section&&practice_sections[section].stage!=stage))return false;
    if(score<0||score>9999999990LL||life<0||life>8||bomb<0||bomb>8||power<0||power>128||gauge< -10000||gauge>10000)return false;
    return graze>=0&&point>=0&&point<=9999&&point_total>=0&&point_total<=9999&&point_stage>=0&&point_stage<=9999&&time>=0&&value>=0&&value<=9999999&&night>=0&&night<=11&&familiar>=0&&familiar<=2000&&rank>=8&&rank<=99&&rankLock>=0&&rankLock<=1;
}
void PracticeConfig::encode(double* w)const {
    const double values[]{double(mode),double(stage),double(warp),double(section),double(phase),double(frame),double(dlg),double(score),double(life),double(bomb),double(power),double(gauge),double(graze),double(point),double(point_total),double(point_stage),double(time),double(value),double(night),double(familiar),double(rank),double(rankLock),1};
    std::copy(values,values+word_count,w);
}
bool PracticeConfig::decode(const double* w,u32 count){
    if(!w||count!=word_count||w[22]!=1)return false;
    for(u32 i=0;i<count;i++)if(!std::isfinite(w[i])||std::trunc(w[i])!=w[i]||(i!=7&&(w[i]<-2147483648.0||w[i]>2147483647.0)))return false;
    if(w[7]<0||w[7]>9999999990.0)return false;
    PracticeConfig p;p.mode=i32(w[0]);p.stage=i32(w[1]);p.warp=i32(w[2]);p.section=i32(w[3]);p.phase=i32(w[4]);p.frame=i32(w[5]);p.dlg=i32(w[6]);p.score=i64(w[7]);p.life=i32(w[8]);p.bomb=i32(w[9]);p.power=i32(w[10]);p.gauge=i32(w[11]);p.graze=i32(w[12]);p.point=i32(w[13]);p.point_total=i32(w[14]);p.point_stage=i32(w[15]);p.time=i32(w[16]);p.value=i32(w[17]);p.night=i32(w[18]);p.familiar=i32(w[19]);p.rank=i32(w[20]);p.rankLock=i32(w[21]);
    if(!p.valid())return false;*this=p;return true;
}
namespace {
u32 hash(const u8* p,u32 n){u32 h=2166136261u;while(n--)h=(h^*p++)*16777619u;return h;}
u32 word(const u8* p){u32 n;std::memcpy(&n,p,4);return n;}
}
std::vector<u8> practice_trailer(const PracticeConfig& p){
    if(!p.valid())return {};constexpr u32 length=PracticeConfig::word_count*8;
    std::vector<u8> bytes(length+24);double words[PracticeConfig::word_count];p.encode(words);std::memcpy(bytes.data(),words,length);
    std::memcpy(bytes.data()+length,"THPRAC08",8);const u32 footer[]{8,1,length,hash(bytes.data(),length)};std::memcpy(bytes.data()+length+8,footer,16);return bytes;
}
bool read_practice_trailer(const u8* data,u32& size,PracticeConfig& p,bool& found){
    found=false;if(size<24||std::memcmp(data+size-24,"THPRAC08",8))return true;
    const u8* footer=data+size-24;constexpr u32 length=PracticeConfig::word_count*8;
    if(word(footer+8)!=8||word(footer+12)!=1||word(footer+16)!=length||size<length+24||hash(footer-length,length)!=word(footer+20))return false;
    double words[PracticeConfig::word_count];std::memcpy(words,footer-length,length);if(!p.decode(words,PracticeConfig::word_count))return false;
    found=true;size-=length+24;return true;
}
}
