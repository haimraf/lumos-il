import React from "react";

export default function CauldronLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full gap-6">
      <div className="relative w-28 h-28 flex items-end justify-center">
        {/* Bubbles */}
        <div 
            className="absolute top-[10%] left-[25%] w-3.5 h-3.5 bg-green-400 rounded-full blur-[1px] shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-bounce" 
            style={{ animationDelay: '0ms', animationDuration: '1.2s' }} 
        />
        <div 
            className="absolute top-[5%] left-[50%] w-5 h-5 bg-green-300 rounded-full blur-[1px] shadow-[0_0_15px_rgba(134,239,172,0.8)] animate-bounce" 
            style={{ animationDelay: '300ms', animationDuration: '1.5s' }} 
        />
        <div 
            className="absolute top-[15%] right-[25%] w-4 h-4 bg-green-500 rounded-full blur-[1px] shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-bounce" 
            style={{ animationDelay: '600ms', animationDuration: '1s' }} 
        />

        {/* The Cauldron Base */}
        <div className="relative z-10 w-24 h-16 bg-[#0f172a] rounded-b-[2rem] border-t-8 border-[#020617] shadow-[inset_0_-10px_20px_rgba(0,0,0,0.8)] flex justify-center">
          {/* Cauldron Rim */}
          <div className="absolute -top-3 w-28 h-4 bg-[#020617] rounded-full shadow-lg" />
          
          {/* Glowing Potion Inside / Rim reflection */}
          <div className="absolute top-0 w-20 h-2 bg-green-500/20 rounded-full blur-md animate-pulse" />
        </div>

        {/* Fire/Glow at the bottom */}
        <div className="absolute -bottom-2 w-16 h-6 bg-green-600/30 blur-2xl rounded-full animate-pulse" />
      </div>
      
      <p className="font-cinzel text-green-500/70 text-sm tracking-[0.3em] uppercase animate-pulse">
        רוקח שיקויים...
      </p>
    </div>
  );
}
