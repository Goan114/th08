#ifdef TH_NATIVE_PLATFORM
#include "PlatformHost.hpp"
#include <SDL3/SDL.h>
#include <SDL3_ttf/SDL_ttf.h>
#include <set>
namespace th08 {
namespace {std::map<std::pair<i32,i32>,TTF_Font*> faces;bool started=false;}
bool sdl_glyph(i32 height,i32 weight,u16 code,JapaneseFont::Glyph& glyph,std::vector<u8>& pixels){
    if(!started){if(!TTF_Init())return false;started=true;}
    auto& face=faces[{height,weight}];if(!face){face=TTF_OpenFont("/fonts/msgothic.ttc",float(height));if(!face)return false;
        TTF_SetFontKerning(face,false);TTF_SetFontHinting(face,TTF_HINTING_NORMAL);if(weight>=600)TTF_SetFontStyle(face,TTF_STYLE_BOLD);}
    int left,right,bottom,top,advance;
    if(!TTF_GetGlyphMetrics(face,code,&left,&right,&bottom,&top,&advance))return false;
    auto* image=TTF_RenderGlyph_Blended(face,code,{255,255,255,255});if(!image)return false;
    auto* rgba=SDL_ConvertSurface(image,SDL_PIXELFORMAT_RGBA32);SDL_DestroySurface(image);if(!rgba)return false;
    // SDL glyph surfaces already include the font's baseline placement.
    glyph={code,0,i16(advance),0,0,u16(rgba->w),u16(rgba->h)};pixels.resize(size_t(rgba->w)*rgba->h);
    const auto* data=static_cast<const u8*>(rgba->pixels);for(int y=0;y<rgba->h;y++)for(int x=0;x<rgba->w;x++)pixels[y*rgba->w+x]=(u32(data[y*rgba->pitch+x*4+3])*15+127)/255;
    SDL_DestroySurface(rgba);return true;
}
void sdl_fonts_shutdown(){for(auto& face:faces)TTF_CloseFont(face.second);faces.clear();if(started)TTF_Quit();started=false;}
bool BrowserRuntime::native_fonts(){std::vector<u8> bytes;if(!sdl_read_file("/fonts/cp932.bin",bytes)||!put_font(0,bytes.data(),bytes.size()))return false;
    return sdl_read_file("/fonts/blend.bin",bytes)&&put_font(1,bytes.data(),bytes.size());}
u32 BrowserRuntime::native_font_steps(){
    if(warm_glyphs.empty()){std::set<u16> codes;for(u16 code=32;code<127;code++)codes.insert(code);
        const auto text=read("musiccmt.txt");const auto* p=text.data();const auto* end=p+text.size();while(p<end){const auto code=fonts.encoding.next(p,end);if(code>=32)codes.insert(code);}
        warm_glyphs.assign(codes.begin(),codes.end());}
    return (warm_glyphs.size()*4+15)/16;
}
bool BrowserRuntime::native_font_step(u32 step){
    const i32 profiles[][2]={{16,400},{16,600},{26,600},{28,600}};
    for(u32 i=step*16;i<std::min<u32>((step+1)*16,warm_glyphs.size()*4);i++){
        const auto* profile=profiles[i/warm_glyphs.size()];const auto* font=fonts.find(profile[0],profile[1]);if(!font)return false;
        if(!font->find(warm_glyphs[i%warm_glyphs.size()])&&!font->find(0x30fb))return false;
    }return true;
}
}
#endif
