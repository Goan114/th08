#include "input/TouchController.hpp"
#include <cassert>
#include <cmath>
#include <cstdio>
using touhou::input::TouchController;
using touhou::input::TouchState;
using touhou::input::TouchSample;

static TouchState gameplay(){
    TouchState s; s.context=1; s.instance=7; s.ready=true; s.x=100; s.y=200;
    s.fast=4; s.slow=2; s.min_x=-184; s.max_x=184; s.min_y=32; s.max_y=432; return s;
}
static void no_motion(const TouchSample& s){assert(!s.motion);assert(!s.keys[16]);assert(!s.keys[88]);assert(!s.keys[27]);}

int main(){
    const auto state=gameplay(); TouchController touch; unsigned checks=0;
    touch.begin_session(); touch.set_mode(1); touch.controls(true,true,0,0,0,0);
    touch.pointer(0,1,.5f,.5f,100,state,false);
    auto sample=touch.sample(state,101,false,false);
    assert(sample.keys[90]&&sample.keys[16]&&sample.motion==1); ++checks;
    assert(!touch.set_mode(1)&&touch.active());
    touch.pointer(1,1,.55f,.5f,102,state,false);
    sample=touch.sample(state,103,false,false); assert(sample.motion==1&&sample.x>100); ++checks;
    touch.cancel_transient(); sample=touch.sample(state,104,false,false);
    assert(sample.keys[90]); no_motion(sample); ++checks;
    touch.controls(false,false,4,9,32767,0); sample=touch.sample(state,105,false,false);
    assert(sample.keys[88]&&sample.keys[27]); ++checks;
    touch.begin_session(); touch.controls(false,false,0,0,0,0); sample=touch.sample(state,106,false,false);
    no_motion(sample); ++checks;
    touch.controls(true,true,5,6,NAN,INFINITY); assert(touch.stick_x==0&&touch.stick_y==0);
    touch.reset(); sample=touch.sample(state,107,false,false); assert(sample.keys[90]); no_motion(sample); ++checks;
    touch.begin_session(); touch.set_mode(1); touch.pointer(0,2,.5f,.5f,200,state,false);
    assert(!touch.set_mode(1)&&touch.active()); assert(touch.set_mode(2)&&!touch.active()); ++checks;
    std::printf("TH08 touch lifecycle: %u checks passed; mode idempotent, transient input cleared, fire toggle preserved\n",checks);
}
