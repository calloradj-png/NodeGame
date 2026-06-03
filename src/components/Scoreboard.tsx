import React from "react";
import { X, Users } from "lucide-react";
import { Player } from "../types";
import { translations, Language } from "../translations";
import AdaptiveUsername from "./AdaptiveUsername";
import AvatarFrame from "./AvatarFrame";

interface ScoreboardProps {
  roomName: string;
  players: Record<string, Player>;
  currentPlayerId: string | null;
  onClose: () => void;
  language?: Language;
  friendsList?: string[];
}

export default function Scoreboard({
  players,
  currentPlayerId,
  onClose,
  language = "ru",
  friendsList = [],
}: ScoreboardProps) {
  // Sort players by score descending
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
  const t = translations[language];

  return (
    <div className="squircle-panel bg-black/80 backdrop-blur-md p-4 flex flex-col gap-2.5 w-64 pointer-events-auto text-white shadow-2xl border border-white/5 relative transition-all">
      
      {/* Header Info */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-sans">
          {t.playersHeader.replace("{count}", String(sortedPlayers.length))}
        </span>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
          title="Hide Scoreboard"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Players List */}
      <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto px-0 pt-2">
        {sortedPlayers.map((player) => {
          const isSelf = player.id === currentPlayerId;
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between px-1.5 py-1 rounded-xl transition-all text-xs border border-transparent hover:bg-white/5 ${
                isSelf ? "text-white" : "text-neutral-400"
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-2 w-full">
                {friendsList.includes(player.name) && (
                  <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0 select-none" />
                )}
                {/* Round Custom micro avatar */}
                <div className="relative shrink-0 flex items-center justify-center p-1">
                  <div 
                    className="w-4 h-4 rounded-full flex items-center justify-center font-black text-[7px] text-black select-none shrink-0 uppercase relative shadow-inner animate-fade-in leading-none"
                    style={{ backgroundColor: player.color || "#ffffff" }}
                  >
                    <span className="relative top-[0.5px] leading-none">
                      {player.name ? player.name.charAt(0) : "?"}
                    </span>
                    <AvatarFrame decorFrame={player.decorFrame} playerColor={player.color || "#ffffff"} />
                  </div>
                </div>

                <span className="truncate leading-none flex items-center gap-1">
                  <AdaptiveUsername
                    name={player.name}
                    effect={player.nameEffect || "none"}
                    color={player.color}
                    size="sm"
                    isAdmin={player.isAdmin}
                  />
                  {isSelf && <span className="text-[8px] text-zinc-500 font-normal shrink-0">{t.youLabel}</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
