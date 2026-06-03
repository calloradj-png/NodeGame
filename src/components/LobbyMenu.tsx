import React, { useState } from "react";
import { Play, Sparkles, Orbit } from "lucide-react";
import { translations, Language } from "../translations";

interface LobbyMenuProps {
  onJoin: (name: string, color: string, avatarStyle: number, roomId?: string) => void;
  availableRooms: Array<{ id: string; name: string; activePlayers: number }>;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  initialName?: string;
  initialColor?: string;
  initialStyle?: number;
}

export default function LobbyMenu({
  onJoin,
  availableRooms,
  language = "ru",
  onLanguageChange,
  initialName,
  initialColor,
  initialStyle,
}: LobbyMenuProps) {
  const t = translations[language];

  // Random names array for helper
  const [name, setName] = useState(() => {
    if (initialName) return initialName;
    const arr = ["Vortex", "Saber", "Helix", "Echo", "Cosmo", "Quasar", "Apex", "Grid"];
    return `${arr[Math.floor(Math.random() * arr.length)]}-${Math.floor(100 + Math.random() * 900)}`;
  });
  const [selectedColor, setSelectedColor] = useState(() => initialColor || "#00f0ff");
  const [selectedStyle, setSelectedStyle] = useState(() => initialStyle ?? 0);

  // Update name, color and style if props update as platform initialization resolves asynchronously
  React.useEffect(() => {
    if (initialName) setName(initialName);
  }, [initialName]);

  React.useEffect(() => {
    if (initialColor) setSelectedColor(initialColor);
  }, [initialColor]);

  React.useEffect(() => {
    if (initialStyle !== undefined) setSelectedStyle(initialStyle);
  }, [initialStyle]);

  // Dynamic robot style names and descs
  const stylesList = [
    { id: 0, name: t.neonCore, desc: t.neonCoreDesc },
    { id: 1, name: t.visidome, desc: t.visidomeDesc },
    { id: 2, name: t.aeroFin, desc: t.aeroFinDesc },
    { id: 3, name: t.orbitRing, desc: t.orbitRingDesc },
  ];

  // Dynamic colors list
  const colorsList = [
    { hex: "#00f0ff", name: t.colorCyan },
    { hex: "#ff007f", name: t.colorRuby },
    { hex: "#00ff66", name: t.colorGreen },
    { hex: "#ffff00", name: t.colorYellow },
    { hex: "#bd00ff", name: t.colorCosmic },
    { hex: "#ff8800", name: t.colorMagma },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#06070a] text-gray-100 p-6">
      {/* Absolute clean backdrop radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.15)_0%,rgba(6,7,10,1)_100%)] pointer-events-none" />

      <div className="relative w-full max-w-lg bg-black/80 p-8 backdrop-blur-2xl shadow-2xl squircle-panel flex flex-col gap-6">
        
        {/* Simplified Title Row */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-2xl">
            <div className="inline-flex items-center gap-1.5 text-neutral-300 text-[10px] font-semibold uppercase tracking-wider">
              <Orbit className="w-3 h-3 animate-spin text-neutral-400" />
              <span>{t.arenaSubtitle}</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onLanguageChange?.("ru")}
                type="button"
                className={`px-2 py-0.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
                  language === "ru" ? "bg-white text-black" : "bg-white/5 text-neutral-400 hover:text-white"
                }`}
              >
                RU
              </button>
              <button
                onClick={() => onLanguageChange?.("en")}
                type="button"
                className={`px-2 py-0.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
                  language === "en" ? "bg-white text-black" : "bg-white/5 text-neutral-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white text-center">
            {t.arenaTitle}
          </h1>
        </div>

        {/* Name input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] md:text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            {t.nicknameLabel}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.substring(0, 16))}
            placeholder={t.operatorPlaceholder}
            className="w-full px-4 py-3.5 md:py-2.5 bg-white/5 rounded-2xl focus:bg-white/10 text-white font-medium text-base md:text-sm transition outline-none"
          />
        </div>

        {/* Color Choice */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] md:text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            {t.energyColor}
          </label>
          <div className="flex justify-between gap-2.5">
            {colorsList.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => setSelectedColor(color.hex)}
                className={`flex-1 py-3.5 md:py-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 md:gap-1 transition cursor-pointer relative ${
                  selectedColor === color.hex
                    ? "bg-white text-black font-semibold"
                    : "bg-white/5 hover:bg-white/10 text-neutral-400"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 md:w-3 md:h-3 rounded-full shadow-inner ${selectedColor === color.hex ? "ring-1 ring-black" : "ring-1 ring-white/10"}`}
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-[11px] md:text-[10px] select-none font-medium">{color.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Robot style selections */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] md:text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            {t.hullRigStyle}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {stylesList.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelectedStyle(style.id)}
                className={`p-4.5 md:p-3.5 rounded-2xl text-left flex flex-col gap-1 md:gap-0.5 transition-all cursor-pointer ${
                  selectedStyle === style.id
                    ? "bg-white text-black font-semibold"
                    : "bg-white/5 hover:bg-white/10 text-neutral-400"
                }`}
              >
                <div className="text-sm md:text-xs font-bold flex items-center justify-between">
                  <span>{style.name}</span>
                  {selectedStyle === style.id && <Sparkles className="w-4 h-4 md:w-3.5 md:h-3.5" />}
                </div>
                <div className={`text-[11px] md:text-[10px] leading-snug ${selectedStyle === style.id ? "text-neutral-700 font-medium" : "text-neutral-400"}`}>
                  {style.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Join controls */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => onJoin(name, selectedColor, selectedStyle)}
            className="w-full py-5 md:py-4 px-6 bg-white hover:bg-neutral-200 active:scale-98 text-black font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer text-base md:text-sm tracking-wider"
          >
            <Play className="w-4.5 h-4.5 md:w-4 md:h-4 fill-black" /> {t.quickMatch}
          </button>

          <div className="grid grid-cols-3 gap-2 mt-1">
            {availableRooms.map((room) => {
              const countSuff = room.activePlayers === 1 ? t.playerCount : t.playersCount;
              return (
                <button
                  key={room.id}
                  onClick={() => onJoin(name, selectedColor, selectedStyle, room.id)}
                  className="py-3.5 md:py-2.5 px-3 bg-white/5 rounded-xl hover:bg-white/10 text-center transition flex flex-col gap-1 md:gap-0.5 cursor-pointer"
                >
                  <span className="text-sm md:text-xs font-bold text-gray-200 block truncate">{room.name}</span>
                  <span className="text-[11px] md:text-[10px] text-neutral-400 font-medium font-mono">
                    {room.activePlayers} {countSuff}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
