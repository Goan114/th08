#include "BulletDrawing.hpp"
#include "GameMath.hpp"
#include "Presentation.hpp"
#include <cmath>
namespace th08 {
namespace {
Vec3 presentation_lerp(const Vec3& previous,const Vec3& current){return {presentation::lerp_world(previous.x,current.x),presentation::lerp_world(previous.y,current.y),presentation::lerp_world(previous.z,current.z)};}
float presentation_angle(float previous,float current){
    constexpr float pi=3.1415927410125732f,tau=6.2831854820251465f;float delta=current-previous;if(delta>pi)delta-=tau;else if(delta<-pi)delta+=tau;return add_angle(previous+delta*presentation::world_alpha,0);
}
bool close_enough(const Vec3& a,const Vec3& b){const float dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy<16384.0f;}
}
void BulletDrawing::snapshot(){
    for(size_t i=0;i<previous_bullets.size();++i){const auto& b=state.bullets[i];auto& p=previous_bullets[i];p.active=b.state!=0;if(p.active){p.position=b.position;p.angle=b.angle;p.age=b.active_time.current;p.state=b.state;}}
    for(size_t i=0;i<previous_lasers.size();++i){const auto& l=state.lasers[i];auto& p=previous_lasers[i];p.active=l.in_use!=0;if(p.active){p.position=l.position;p.angle=l.angle;p.start_offset=l.start_offset;p.end_offset=l.end_offset;p.width=l.width2;p.age=l.timer.current;}}
}
void BulletDrawing::bullet(BulletState& b,const Vec2& origin){
    auto& source=b.sprites.animation[b.state>=2&&b.state<=5?b.state-1:0];
    if(!presentation::render_only){
        source.pos={Scalar::add(origin.x,b.position.x),Scalar::add(origin.y,b.position.y),.05f};
        source.color1.d3dColor=i32((u32(source.color1.d3dColor)&0xff000000)|0xffffff);
        if(source.type){source.rotation.z=add_angle(Scalar::add(1.5707964f,b.angle),0);source.updateRotation=true;}
    }
    AnmVm copy;AnmVm* vm=&source;if(presentation::render_only){copy=source;vm=&copy;}Vec3 position=b.position;float angle=b.angle;
    if(presentation::active){const size_t index=size_t(&b-state.bullets);const auto& p=previous_bullets[index];if(p.active&&p.state==b.state&&b.active_time.current>=p.age&&close_enough(p.position,b.position)){position=presentation_lerp(p.position,b.position);angle=presentation_angle(p.angle,b.angle);}}
    vm->pos={Scalar::add(origin.x,position.x),Scalar::add(origin.y,position.y),.05f};
    vm->color1.d3dColor=i32((u32(vm->color1.d3dColor)&0xff000000)|0xffffff);
    if(vm->type){vm->rotation.z=add_angle(Scalar::add(1.5707964f,angle),0);vm->updateRotation=true;}
    actions.draw(*vm);
}
void BulletDrawing::laser(LaserState& l,const Vec2& origin){
    const auto current_position=[&](float distance,float depth){const float c=cosine(l.angle).to_float(),s=sine(l.angle).to_float();return Vec3{(number(c)*number(distance)+number(l.position.x)).to_float(),(number(s)*number(distance)+number(l.position.y)).to_float(),depth};};
    const auto current_offset=[&](AnmVm& vm){vm.pos.x=Scalar::add(origin.x,vm.pos.x);vm.pos.y=Scalar::add(origin.y,vm.pos.y);};
    if(!presentation::render_only){
        const float midpoint=((number(l.end_offset)-number(l.start_offset))/number(2)+number(l.start_offset)).to_float();auto& body=l.animation[0];body.pos=current_position(midpoint,.06f);l.color=-1;current_offset(body);
        if((l.start_offset<16||l.speed==0)&&(!l.unknown599||l.state)){auto& cap=l.animation[1];cap.pos=current_position(l.start_offset,.05f);cap.color1=body.color1;cap.flag6=1;cap.color1.a=255;cap.scale.x=((number(l.width)/number(10))*((number(16)-number(l.start_offset))/number(16))).to_float();cap.scale.y=cap.scale.x;if(cap.scale.y<=0){cap.scale.x=Scalar::div(l.width,10);cap.scale.y=cap.scale.x;}current_offset(cap);}
    }
    Vec3 laser_position=l.position;float angle=l.angle,start_offset=l.start_offset,end_offset=l.end_offset,width=l.width2;
    if(presentation::active){const size_t index=size_t(&l-state.lasers);const auto& p=previous_lasers[index];if(p.active&&l.timer.current>=p.age&&close_enough(p.position,l.position)){laser_position=presentation_lerp(p.position,l.position);angle=presentation_angle(p.angle,l.angle);start_offset=presentation::lerp_world(p.start_offset,l.start_offset);end_offset=presentation::lerp_world(p.end_offset,l.end_offset);if(p.width>=0&&l.width2>=0&&std::fabs(l.width2-p.width)<128.0f)width=presentation::lerp_world(p.width,l.width2);}}
    const float cosine_value=cosine(angle).to_float(),sine_value=sine(angle).to_float();
    const float midpoint=((number(end_offset)-number(start_offset))/number(2)+number(start_offset)).to_float();
    const auto position=[&](float distance,float depth){return Vec3{(number(cosine_value)*number(distance)+number(laser_position.x)).to_float(),(number(sine_value)*number(distance)+number(laser_position.y)).to_float(),depth};};
    const auto offset=[&](AnmVm& vm){vm.pos.x=Scalar::add(origin.x,vm.pos.x);vm.pos.y=Scalar::add(origin.y,vm.pos.y);};
    AnmVm body_copy,cap_copy;AnmVm* body=&l.animation[0];if(presentation::render_only){body_copy=*body;body=&body_copy;}body->pos=position(midpoint,.06f);if(presentation::active&&width>=0){body->scale.x=Scalar::div(width,16);body->updateScale=true;}if(!presentation::render_only)l.color=-1;offset(*body);actions.draw(*body);
    if((start_offset<16||l.speed==0)&&(!l.unknown599||l.state)){
        AnmVm* cap=&l.animation[1];if(presentation::render_only){cap_copy=*cap;cap=&cap_copy;}cap->pos=position(start_offset,.05f);cap->color1=body->color1;cap->flag6=1;cap->color1.a=255;
        cap->scale.x=((number(l.width)/number(10))*((number(16)-number(start_offset))/number(16))).to_float();cap->scale.y=cap->scale.x;
        if(cap->scale.y<=0){cap->scale.x=Scalar::div(l.width,10);cap->scale.y=cap->scale.x;}
        offset(*cap);actions.draw(*cap);
    }
}
bool BulletDrawing::draw(u32 flags,const Vec2& origin){
    const bool tint=flags&1024;if(tint)actions.tint(0xfff01010);actions.items();
    for(auto& l:state.lasers)if(l.in_use)laser(l,origin);
    for(auto* layer:state.layers){u32 count=0;for(auto* b=layer;b;b=b->next_in_layer){if(++count>1536){if(tint)actions.clear_tint();return false;}bullet(*b,origin);}}
    actions.effects();if(tint)actions.clear_tint();return true;
}
}
