#include "sdl/FrameCadence.hpp"
#include "sdl/PresentationCadence.hpp"
#include <cassert>
int main(){
 for(unsigned hz:{15u,20u,30u,60u,90u,120u,144u,165u}){
  touhou::sdl::FrameCadence clock;unsigned ticks=0;
  for(unsigned i=0;i<hz*60;++i)ticks+=clock.advance(1./hz);
  assert(ticks==3600);
 }
 touhou::sdl::FrameCadence clock;
 assert(clock.interpolation_alpha()==0);
 assert(clock.advance(touhou::sdl::FrameCadence::interval*.5)==0);
 assert(clock.interpolation_alpha()>.49&&clock.interpolation_alpha()<.51);
 assert(clock.advance(touhou::sdl::FrameCadence::interval*.5)==1);
 assert(clock.interpolation_alpha()<1.e-6);
 assert(clock.advance(.1)==4);assert(clock.advance(0)==2);
 assert(clock.interpolation_alpha()<=1);
 assert(clock.advance(30)==4);assert(clock.advance(0)==2);
 clock.advance(.01);clock.reset();assert(clock.advance(0)==0);
 assert(clock.interpolation_alpha()==0);
 assert(clock.advance(-1)==0);

 for(unsigned hz:{15u,20u,30u,60u}){
  touhou::sdl::PresentationCadence display;
  for(unsigned i=0;i<hz*2;++i)assert(!display.advance(1./hz));
 }
 for(unsigned hz:{90u,120u,144u,165u}){
  touhou::sdl::PresentationCadence display;
  bool high=false;for(unsigned i=0;i<hz;++i)high=display.advance(1./hz);
  assert(high);
  // One missed display callback must not collapse high-refresh presentation.
  assert(display.advance(.03));
  assert(display.advance(1./hz));
  for(unsigned i=0;i<touhou::sdl::PresentationCadence::disable_samples-1;++i)assert(display.advance(1./60.));
  assert(!display.advance(1./60.));display.reset();assert(!display.high_refresh);
 }

 // The presentation trajectory must never move backward when every display
 // callback renders the same prev/current pair with the residual accumulator
 // alpha. A simulation tick advances both endpoints before alpha resets.
 for(unsigned hz:{90u,120u,144u,165u}){
  touhou::sdl::FrameCadence sim;unsigned logical=0;double last=0;
  for(unsigned i=0;i<hz*4;++i){
   logical+=sim.advance(1./hz);const double alpha=sim.interpolation_alpha();
   const double position=logical?double(logical-1)+alpha:0.;
   assert(position+1.e-9>=last);last=position;
  }
 }

 // Enabling interpolation between two fixed ticks must not make the visual
 // trajectory move backward. The gate waits for the next real tick after
 // activation (or after a slow callback) before using residual alpha again.
 for(unsigned hz:{90u,120u,144u,165u}){
  touhou::sdl::FrameCadence sim;touhou::sdl::PresentationCadence display;unsigned logical=0;bool primed=false;double last=0;
  for(unsigned i=0;i<hz*3;++i){
   const double dt=1./hz;const bool fast=touhou::sdl::PresentationCadence::fast_sample(dt);display.advance(dt);if(!display.high_refresh||!fast)primed=false;
   const unsigned ticks=sim.advance(dt);logical+=ticks;if(display.high_refresh&&fast&&!primed&&ticks)primed=true;const bool interp=display.high_refresh&&fast&&primed;
   const double position=interp&&logical?double(logical-1)+sim.interpolation_alpha():double(logical);assert(position+1.e-9>=last);last=position;
  }
 }
}
