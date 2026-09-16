#pragma once
#include <algorithm>
namespace th08::presentation {
inline float alpha=1.0f;
inline bool active=false;
inline bool render_only=false;
inline void begin(float value,bool enabled,bool only)noexcept{
    alpha=enabled?std::clamp(value,0.0f,1.0f):1.0f;
    active=enabled;
    render_only=only;
}
inline void end()noexcept{alpha=1.0f;active=false;render_only=false;}
inline float lerp(float previous,float current)noexcept{return previous+(current-previous)*alpha;}
}
