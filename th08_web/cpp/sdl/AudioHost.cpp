#ifdef TH_NATIVE_PLATFORM
// The same miniaudio -> SDL stream boundary used by the TH07/TH10 hosts.
// MusicControl, MIDI sequencing, fades and SoundEffects remain TH08 owners.
#define MA_NO_DEVICE_IO
#define MA_NO_RESOURCE_MANAGER
#define MA_NO_WAV
#define MA_NO_MP3
#define MA_NO_FLAC
#define MA_NO_ENCODING
#define MA_NO_THREADING
// File-backed Vorbis supports exact PCM seeks and the original loop boundaries.
#include "../../../portable/sdl/third_party/stb_vorbis.h"
#define MINIAUDIO_IMPLEMENTATION
#include "../../../portable/sdl/third_party/miniaudio.h"
#include "PlatformHost.hpp"
#include "../platform/PlatformDevices.hpp"
#include <SDL3/SDL.h>
#include <emscripten.h>
#include <cmath>
#include <memory>
EM_JS(void, th08_midi_event, (int op,const unsigned char* data,unsigned length,unsigned time), {
    if(Module['runtimeMidi'])Module['runtimeMidi'](op,data?HEAPU8.slice(data,data+length):null,time);
});
namespace th08 {
namespace {
struct Buffer {
    WaveFormat format{};std::vector<u8> pcm;ma_audio_buffer data{};ma_decoder decoder{};ma_sound sound{};
    bool data_ready=false,decoder_ready=false,sound_ready=false;bool loop=false;u32 cursor=0;std::string name;i32 volume=0,pan=0;
    ~Buffer(){if(sound_ready)ma_sound_uninit(&sound);if(data_ready)ma_audio_buffer_uninit(&data);if(decoder_ready)ma_decoder_uninit(&decoder);}
};
struct Audio {
    ma_engine engine{};SDL_AudioStream* stream=nullptr;bool ready=false,paused=false,music=true,refill=true;u32 error=0,pumps=0,mixed=0,min_queue=~0u;float rms=0;
    std::map<u32,std::unique_ptr<Buffer>> buffers;
    bool initialize(){if(ready)return true;auto config=ma_engine_config_init();config.noDevice=MA_TRUE;config.channels=2;config.sampleRate=44100;config.defaultVolumeSmoothTimeInPCMFrames=0;
        if(ma_engine_init(&config,&engine)!=MA_SUCCESS){error=1;return false;}
        SDL_SetHint(SDL_HINT_AUDIO_DEVICE_SAMPLE_FRAMES,"2048");SDL_AudioSpec spec{SDL_AUDIO_F32,2,44100};
        if(SDL_InitSubSystem(SDL_INIT_AUDIO))stream=SDL_OpenAudioDeviceStream(SDL_AUDIO_DEVICE_DEFAULT_PLAYBACK,&spec,nullptr,nullptr);
        if(!stream){ma_engine_uninit(&engine);error=2;return false;}ready=true;SDL_ResumeAudioStreamDevice(stream);return true;}
    bool attach(Buffer& b,ma_data_source* source){if(ma_sound_init_from_data_source(&engine,source,MA_SOUND_FLAG_NO_SPATIALIZATION,nullptr,&b.sound)!=MA_SUCCESS)return false;b.sound_ready=true;return true;}
    void controls(Buffer& b){ma_sound_set_volume(&b.sound,std::pow(10.f,float(b.volume)/2000.f));ma_sound_set_pan_mode(&b.sound,ma_pan_mode_balance);
        ma_sound_set_pan(&b.sound,b.pan>=0?1.f-std::pow(10.f,-float(b.pan)/2000.f):std::pow(10.f,float(b.pan)/2000.f)-1.f);}
    void pump(){if(!ready||paused)return;auto queued=std::max(0,SDL_GetAudioStreamQueued(stream))/8;min_queue=std::min(min_queue,u32(queued));
        if(!refill&&queued<4096)refill=true;if(!refill)return;if(queued>=6144){refill=false;return;}
        for(int block=0;block<6&&queued<6144;++block){
        float pcm[2048]{};ma_uint64 frames=0;if(ma_engine_read_pcm_frames(&engine,pcm,1024,&frames)!=MA_SUCCESS){error=3;return;}
        double energy=0;for(auto& v:pcm){v=std::clamp(v,-1.f,1.f);energy+=double(v)*v;}rms=std::sqrt(energy/2048);
        if(!SDL_PutAudioStreamData(stream,pcm,sizeof(pcm))){error=4;return;}++pumps;mixed+=1024;queued+=1024;
        }if(queued>=6144)refill=false;
    }
}audio;
template<class T>const T& value(u32 p){return *reinterpret_cast<const T*>(p);}
}
struct SDLSound final:SoundDevice {
 i32 create_pcm(u32 handle,const WaveFormat& format,const u8* data,u32 size)override{if(!audio.initialize())return -1;
if(!PcmWave::valid(format)||size%format.align)return -1;
        auto buf=std::make_unique<Buffer>();buf->format=format;buf->pcm.assign(data,data+size);
        auto config=ma_audio_buffer_config_init(format.bits==8?ma_format_u8:ma_format_s16,format.channels,size/format.align,buf->pcm.data(),nullptr);config.sampleRate=format.rate;
        if(ma_audio_buffer_init(&config,&buf->data)!=MA_SUCCESS)return -1;buf->data_ready=true;if(!audio.attach(*buf,&buf->data))return -1;audio.buffers[handle]=std::move(buf);return 0;
 }
 i32 music_format(u32 handle,const BgmFormat& f,bool loop)override{if(!audio.initialize())return -1;
if(!PcmWave::valid(f.format)||f.intro<0||f.total<=f.intro)return -1;
        const std::string name(f.name,strnlen(f.name,16));auto found=audio.buffers.find(handle);
        if(found!=audio.buffers.end()&&found->second->name==name){found->second->loop=loop;ma_sound_set_looping(&found->second->sound,loop);return 0;}
        if(name.find('/')!=std::string::npos||name.find('\\')!=std::string::npos||name.find("..")!=std::string::npos)return -1;
        auto buf=std::make_unique<Buffer>();buf->format=f.format;buf->name=name;buf->loop=loop;
        const auto filename="/music/"+name.substr(0,name.rfind('.'))+".ogg";auto config=ma_decoder_config_init(ma_format_s16,f.format.channels,f.format.rate);
        if(ma_decoder_init_file(filename.c_str(),&config,&buf->decoder)!=MA_SUCCESS)return -1;buf->decoder_ready=true;
        ma_uint64 length=0;if(ma_decoder_get_length_in_pcm_frames(&buf->decoder,&length)!=MA_SUCCESS||length!=u32(f.total)/f.format.align)return -1;
        ma_data_source_set_loop_point_in_pcm_frames(&buf->decoder,u32(f.intro)/f.format.align,length);
        if(!audio.attach(*buf,&buf->decoder))return -1;ma_sound_set_looping(&buf->sound,loop);audio.buffers[handle]=std::move(buf);return 0;
 }
 Buffer* get(u32 id){auto it=audio.buffers.find(id);return it==audio.buffers.end()?nullptr:it->second.get();}
 i32 stop(u32 id)override{if(!audio.initialize())return -1;if(auto* b=get(id))ma_sound_stop(&b->sound);return 0;}
 i32 position(u32 id,u32 cursor)override{if(!audio.initialize())return -1;if(auto* b=get(id)){b->cursor=cursor;return ma_sound_seek_to_pcm_frame(&b->sound,cursor/b->format.align)==MA_SUCCESS?0:-1;}return 0;}
 i32 pan(u32 id,i32 value)override{if(!audio.initialize())return -1;if(auto* b=get(id)){b->pan=value;audio.controls(*b);}return 0;}
 i32 volume(u32 id,i32 value)override{if(!audio.initialize())return -1;if(auto* b=get(id)){b->volume=value;audio.controls(*b);}return 0;}
 i32 play(u32 id,u32,u32 flags)override{if(!audio.initialize())return -1;if(auto* b=get(id)){if(id==1000&&!audio.music)return 0;if(id!=1000){b->loop=flags&1;ma_sound_set_looping(&b->sound,b->loop);}return ma_sound_start(&b->sound)==MA_SUCCESS?0:-1;}return 0;}
 void release(u32 id)override{if(audio.initialize())audio.buffers.erase(id);}
 void midi_open()override{th08_midi_event(60,nullptr,0,0);}
 void midi_close(u32 time)override{th08_midi_event(61,nullptr,0,time);}
 void midi_message(const u8* data,u32 size,u32 time)override{th08_midi_event(62,data,size,time);}
};
SoundDevice& sound_device(){static SDLSound sound;return sound;}
void sdl_audio_pump(){audio.pump();}
void sdl_audio_pause(bool pause){if(audio.paused==pause)return;audio.paused=pause;if(audio.stream){if(pause)SDL_PauseAudioStreamDevice(audio.stream);else SDL_ResumeAudioStreamDevice(audio.stream);}}
void sdl_audio_shutdown(){audio.buffers.clear();if(audio.stream)SDL_DestroyAudioStream(audio.stream);audio.stream=nullptr;if(audio.ready)ma_engine_uninit(&audio.engine);audio.ready=false;}
extern "C" {
__attribute__((export_name("sdl_music_enabled"))) void sdl_music_enabled(u32 on){audio.music=on!=0;}
__attribute__((export_name("sdl_audio_stats"))) const u32* sdl_audio_stats(){static u32 out[12];out[0]=audio.ready;out[1]=audio.pumps;out[2]=audio.mixed;out[3]=audio.buffers.size();out[4]=audio.error;out[5]=audio.stream?std::max(0,SDL_GetAudioStreamQueued(audio.stream))/8:0;out[7]=audio.min_queue;std::memcpy(out+10,&audio.rms,4);return out;}
}
}
#endif
