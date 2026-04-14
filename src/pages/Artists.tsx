import React from 'react';
import { Mic2, MoreHorizontal, UserPlus, Play, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const ArtistCard = ({ name, genre, image, followers }: { name: string, genre: string, image: string, followers: string }) => (
  <div className="group bg-white/5 hover:bg-white/10 p-6 rounded-[32px] border border-white/5 transition-all duration-500 cursor-pointer text-center relative overflow-hidden">
    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
       <button className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white hover:text-accent">
          <MoreHorizontal className="w-4 h-4" />
       </button>
    </div>
    
    <div className="relative w-36 h-36 mx-auto mb-6 rounded-full overflow-hidden border-2 border-transparent group-hover:border-accent group-hover:shadow-[0_0_30px_rgba(0,245,255,0.3)] transition-all duration-500">
      <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
         <Play className="text-white fill-white w-10 h-10 drop-shadow-xl" />
      </div>
    </div>
    
    <div className="flex items-center justify-center gap-1.5 mb-1">
      <h3 className="text-lg font-black text-white group-hover:text-accent transition-colors tracking-tight">{name}</h3>
      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white">
        <Check className="w-2.5 h-2.5 stroke-[4px]" />
      </div>
    </div>
    
    <p className="text-[10px] text-text-dim font-black uppercase tracking-[0.2em] mb-6">{genre} • {followers} Fans</p>
    
    <button className="w-full py-3 rounded-2xl bg-white/5 text-xs font-black text-white hover:bg-white hover:text-bg-main transition-all flex items-center justify-center gap-2 border border-white/10 group-hover:border-transparent group-hover:shadow-lg">
      <UserPlus className="w-4 h-4" />
      Follow artist
    </button>
  </div>
);

export const Artists = () => {
  return (
    <div className="flex-1 bg-gradient-to-b from-bg-main to-black overflow-y-auto custom-scrollbar">
      <div className="px-10 py-12">
        <header className="flex flex-col gap-2 mb-12">
          <span className="text-accent text-[10px] font-black uppercase tracking-[0.4em]">Recommended</span>
          <h1 className="text-5xl font-black text-white tracking-tighter">Top Creators</h1>
          <p className="text-text-dim text-sm max-w-xl font-medium mt-1">Discover the artists currently shaping the VibeStream soundscape.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
          <ArtistCard name="Lofi Girl" genre="Lofi Chill" image="https://picsum.photos/seed/lofi/400" followers="2.4M" />
          <ArtistCard name="The Jazz Café" genre="Nu-Jazz" image="https://picsum.photos/seed/jazz/400" followers="890K" />
          <ArtistCard name="STEEZY" genre="Hip-Hop" image="https://picsum.photos/seed/steezy/400" followers="1.1M" />
          <ArtistCard name="Dreamy Night" genre="Ambient" image="https://picsum.photos/seed/dream/400" followers="450K" />
          <ArtistCard name="Aesthetic Lab" genre="Vaporwave" image="https://picsum.photos/seed/aes/400" followers="125K" />
          <ArtistCard name="Urban Beats" genre="Phonk" image="https://picsum.photos/seed/urb/400" followers="670K" />
          <ArtistCard name="Noon Soul" genre="Neo-Soul" image="https://picsum.photos/seed/soul/400" followers="230K" />
          <ArtistCard name="Retro Wave" genre="Synthwave" image="https://picsum.photos/seed/retro/400" followers="540K" />
        </div>
      </div>
    </div>
  );
};
