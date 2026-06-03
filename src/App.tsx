import React, { useState, useEffect, useRef } from "react";
import LobbyMenu from "./components/LobbyMenu";
import GameCanvas from "./components/GameCanvas";
import Scoreboard from "./components/Scoreboard";
import ChatBox from "./components/ChatBox";
import { translations, Language } from "./translations";
import AdaptiveUsername from "./components/AdaptiveUsername";
import AvatarFrame from "./components/AvatarFrame";
import VerifiedBadge from "./components/VerifiedBadge";
import { Player, Collectible, ChatMessage } from "./types";
import platformSdk from "./PlatformSDK";
import {
  Cpu,
  Terminal,
  Check,
  Palette,
  Volume2,
  Volume1,
  VolumeX,
  UserPlus,
  Copy,
  Server,
  X,
  Sliders,
  Search,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Tv,
  Zap,
  Plus,
  Heart,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import DynamicJoystick from "./components/DynamicJoystick";

// Custom SVG Icons
// @ts-ignore
import chatIconUrl from "./assets/sprites/ChatIcon.svg";
// @ts-ignore
import settingsIconUrl from "./assets/sprites/SettingsIcon.svg";
// @ts-ignore
import avatarIconUrl from "./assets/sprites/AvatarIcon.svg";
// @ts-ignore
import playerPngUrl from "./assets/sprites/Player.png";
// @ts-ignore
import newAvatarPngUrl from "./assets/sprites/NewAvatar.png";
// @ts-ignore
import coverJpgUrl from "./assets/sprites/Cover.jpg";
// @ts-ignore
import marketCoverUrl from "./assets/sprites/MarketCover.png";
// @ts-ignore
import adButtonRuUrl from "./assets/sprites/Ad_Button_ru.png";
// @ts-ignore
import adButtonEnUrl from "./assets/sprites/Ad_Button_en.png";
// @ts-ignore
import passButtonRuUrl from "./assets/sprites/Pass_Button_ru.png";
// @ts-ignore
import passButtonEnUrl from "./assets/sprites/Pass_Button_en.png";
// @ts-ignore
import shopIconUrl from "./assets/sprites/ShopIcon.svg";

const CoinIcon = ({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) => {
  return (
    <svg 
      viewBox="0 0 649 649" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={{ ...style }}
    >
      <path 
        d="M232.077 70.9665C244.446 66.4648 256.562 65.8644 269.086 66.8215C281.039 67.7351 295.196 70.2609 311.624 73.1577L422.047 92.6275C438.475 95.5243 452.642 97.9934 464.187 101.223C476.283 104.607 487.462 109.316 497.545 117.776C507.628 126.237 514.206 136.429 519.639 147.753C524.825 158.562 529.716 172.084 535.422 187.76L573.771 293.125C579.477 308.801 584.422 322.304 587.397 333.917C590.514 346.084 592.027 358.12 589.741 371.082C587.455 384.044 581.918 394.837 574.828 405.205C568.06 415.1 558.794 426.098 548.071 438.877L475.997 524.77C465.275 537.549 456.054 548.583 447.484 556.967C438.786 565.476 429.441 572.619 417.621 577.15L416.47 577.58C404.101 582.082 391.985 582.682 379.461 581.725C367.508 580.812 353.351 578.286 336.923 575.389L226.5 555.919C210.071 553.022 195.905 550.553 184.359 547.323C172.264 543.939 161.084 539.231 151.002 530.77C140.919 522.31 134.341 512.118 128.908 500.794C123.722 489.985 118.831 476.462 113.125 460.787L74.7756 355.422C69.0701 339.746 64.125 326.243 61.1497 314.63C58.0324 302.462 56.5203 290.427 58.8058 277.464C61.0914 264.502 66.6285 253.709 73.7193 243.342C80.4872 233.447 89.7525 222.449 100.476 209.67L172.549 123.777C183.272 110.998 192.493 99.9633 201.063 91.5799C210.041 82.7965 219.709 75.4682 232.077 70.9665Z" 
        stroke="currentColor" 
        strokeWidth="52"
      />
      <path 
        d="M426.349 414.324C426.532 418.293 426.391 422.531 425.926 427.038C425.693 431.52 423.867 435.349 420.446 438.524C417.906 441.137 414.919 442.859 411.487 443.688C408.055 444.518 404.55 444.652 400.972 444.09C397.65 443.735 394.395 442.904 391.208 441.597C387.996 440.057 385.327 438.109 383.203 435.752C374.288 426.834 365.93 417.624 358.127 408.121C350.532 398.362 342.821 388.614 334.994 378.879L301.109 337.746C296.505 331.895 291.596 325.372 286.383 318.178C281.144 310.751 275.851 303.917 270.502 297.676L283.434 430.753L283.763 433.886C284.153 437.598 283.847 441.385 282.845 445.244C282.051 448.847 280.279 452.083 277.531 454.952C275.405 457.053 272.523 458.646 268.883 459.733C263.204 461.503 258.294 461.667 254.154 460.225C250.246 458.759 246.961 456.523 244.299 453.518C241.869 450.489 239.97 446.935 238.603 442.855C237.444 438.519 236.876 434.239 236.901 430.013L236.279 424.095L234.122 396.872L229.165 346.363C228.617 338.913 227.94 331.359 227.135 323.701C226.306 315.811 225.465 307.805 224.611 299.683C223.33 289.73 222.22 279.171 221.282 268.008C220.575 256.821 219.942 246.329 219.381 236.534C219.285 231.148 220.085 226.489 221.783 222.557C222.37 219.21 224.514 216.169 228.215 213.434C230.597 211.542 233.736 210.156 237.632 209.277C241.76 208.374 245.369 208.112 248.459 208.491C249.668 208.833 250.89 209.291 252.123 209.866C253.332 210.208 254.553 210.666 255.787 211.24C257.045 212.046 258.187 212.865 259.212 213.696C260.47 214.502 261.624 215.436 262.674 216.499C263.957 217.537 265.135 218.704 266.209 219.999C267.26 221.061 268.31 222.124 269.36 223.187C270.202 224.506 271.033 225.709 271.851 226.796C272.669 227.883 273.603 228.958 274.653 230.021L279.068 235.188L372.792 353.439L370.377 330.465C369.597 323.04 368.688 315.51 367.651 307.877C366.822 299.987 365.852 291.877 364.742 283.547C363.718 273.801 362.62 263.359 361.449 252.22C360.511 241.057 359.761 230.578 359.201 220.783C358.786 216.838 359.471 212.191 361.255 206.842C362.098 203.703 363.814 201.059 366.404 198.91C368.994 196.761 371.992 195.155 375.4 194.093C378.807 193.031 382.288 192.665 385.842 192.996C389.396 193.326 392.559 194.401 395.331 196.222C396.101 196.845 396.882 197.584 397.676 198.439C398.47 199.294 399.16 200.277 399.746 201.388C401.223 204.283 402.2 206.879 402.676 209.175C403.713 212.35 404.366 215.215 404.635 217.767C407.683 246.774 410.793 276.361 413.964 306.528C417.366 336.671 420.708 366.234 423.989 395.216C424.33 398.465 424.788 401.701 425.361 404.926C425.911 407.918 426.24 411.051 426.349 414.324Z" 
        fill="currentColor"
      />
    </svg>
  );
};

interface RoomStats {
  id: string;
  name: string;
  activePlayers: number;
  hasPassword?: boolean;
  players?: Array<{
    id: string;
    name: string;
    color: string;
    avatarStyle: number;
  }>;
}

const playPreviewBeep = (volume: number) => {
  if (volume <= 0) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime); // Standard high comfort beep pitch
    
    gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime); // restrict volume ceiling
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18); // soft rapid decay
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (err) {
    console.warn("Audio preview beep failed:", err);
  }
};

interface RoomInfo {
  id: string;
  name: string;
  players: Record<string, Player>;
  obstacles: Array<{ x: number; z: number; radius: number; height: number }>;
}

const TOON_COLORS = ["#ff5964", "#35a7ff", "#38b000", "#ffb703", "#9d4edd", "#f72585"];

const SwipeToReset = ({ language, onStartReset }: { language: string; onStartReset: () => void }) => {
  const [swipeProgress, setSwipeProgress] = useState(0); // 0 to 100
  const [isSwiping, setIsSwiping] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startProgressRef = useRef(0);
  const progressRef = useRef(0);

  // Synchronize progressRef with state for event listeners
  useEffect(() => {
    progressRef.current = swipeProgress;
  }, [swipeProgress]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!trackRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    startProgressRef.current = progressRef.current;
    setIsSwiping(true);
  };

  useEffect(() => {
    if (!isSwiping) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      
      const deltaX = clientX - startXRef.current;
      const maxTravel = rect.width - 44; // 100% width minus (4px left padding + 36px handle width + 4px right padding)
      
      if (maxTravel <= 0) return;

      const initialPx = (startProgressRef.current / 100) * maxTravel;
      const currentPx = Math.max(0, Math.min(maxTravel, initialPx + deltaX));
      const percent = (currentPx / maxTravel) * 100;

      setSwipeProgress(percent);
    };

    const handleEnd = () => {
      setIsSwiping(false);
      const finalPercent = progressRef.current;

      if (finalPercent >= 90) {
        onStartReset();
      } else {
        // animate back smoothly
        const start = finalPercent;
        const startTime = performance.now();
        const duration = 240;

        function animateBack(now: number) {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / duration);
          const ease = 1 - Math.pow(1 - t, 3); // cubic ease out
          const current = Math.max(0, start * (1 - ease));
          setSwipeProgress(current);
          if (t < 1) {
            requestAnimationFrame(animateBack);
          } else {
            setSwipeProgress(0);
          }
        }
        requestAnimationFrame(animateBack);
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isSwiping, onStartReset]);

  return (
    <div
      ref={trackRef}
      className="relative w-full h-11 bg-red-950/40 rounded-full border border-red-900/30 overflow-hidden flex items-center select-none touch-none"
    >
      {/* Background Fill */}
      <div 
        className="absolute left-0 top-0 bottom-0 bg-red-600/35 pointer-events-none rounded-full"
        style={{ width: `calc(4px + (100% - 44px) * (${swipeProgress} / 100) + 36px)` }}
      />

      <span className="w-full text-[9px] font-bold uppercase text-red-400/70 tracking-wider text-center pointer-events-none z-10 select-none px-12">
        {language === "ru" ? ">>>> Потяните для сброса >>>>" : ">>>> Drag to reset >>>>"}
      </span>

      {/* Draggable Handle */}
      <div
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        className="absolute w-9 h-9 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg select-none z-20 transition-colors"
        style={{ 
          left: `calc(4px + (100% - 44px) * (${swipeProgress} / 100))`,
          top: '4px',
          cursor: isSwiping ? 'grabbing' : 'grab'
        }}
      >
        <span className="text-sm font-black text-white pointer-events-none select-none">➔</span>
      </div>
    </div>
  );
};

export default function App() {
  const isMobile = window.innerWidth <= 768;
  const [sdkAvatarUrl, setSdkAvatarUrl] = useState<string | null>(null);
  const [sdkAuthWarning, setSdkAuthWarning] = useState<string | null>(null);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("app_lang");
    return (saved === "en" || saved === "ru") ? saved : "ru";
  });
  const [purchaseToast, setPurchaseToast] = useState<{ text: string; showCoin?: boolean } | null>(null);

  const [friends, setFriends] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("robo_arena_friends");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Array<{
    senderId: string;
    senderName: string;
    senderColor: string;
    senderAvatarStyle: number;
    senderDecorFrame: string;
  }>>([]);

  const friendsRef = useRef(friends);
  useEffect(() => {
    friendsRef.current = friends;
    localStorage.setItem("robo_arena_friends", JSON.stringify(friends));
  }, [friends]);

  const t = translations[language];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("app_lang", lang);
  };

  const handleSendFriendRequest = (targetPlayerId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "friend_request",
        payload: { targetPlayerId }
      }));
      setSentRequests(prev => [...prev, targetPlayerId]);
    }
  };

  const handleAcceptFriendRequest = (senderId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "friend_accept_init",
        payload: { senderId }
      }));
    }
    setIncomingRequests(prev => prev.filter(r => r.senderId !== senderId));
  };

  const handleDeclineFriendRequest = (senderId: string) => {
    setIncomingRequests(prev => prev.filter(r => r.senderId !== senderId));
  };

  const handleRemoveFriend = (targetName: string) => {
    setFriends(prev => prev.filter(name => name !== targetName));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "friend_remove",
        payload: { targetName }
      }));
    }
  };

  const [inGame, setInGame] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showOverlayActual, setShowOverlayActual] = useState(true);

  // Connection WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  // States inside active game
  const [playerId, setPlayerId] = useState<string | null>(null);
  const playerIdRef = useRef<string | null>(null);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [globalAnnouncement, setGlobalAnnouncement] = useState<{
    id: string;
    text: string;
    senderName: string;
    senderColor: string;
    senderNameEffect?: string;
    senderDecorFrame?: string;
    senderIsAdmin?: boolean;
    isBilingual?: boolean;
    textRu?: string;
    textEn?: string;
  } | null>(null);
  const [availableRooms, setAvailableRooms] = useState<RoomStats[]>([
    { id: "neon-temple", name: "Toon Garden", activePlayers: 0 },
    { id: "cyber-grid", name: "Paper Arena", activePlayers: 0 },
    { id: "retro-playground", name: "Sunset Play", activePlayers: 0 }
  ]);

  // Private server states
  const [isCreatePrivateModalOpen, setIsCreatePrivateModalOpen] = useState(false);
  const [newPrivateServerName, setNewPrivateServerName] = useState("");
  const [privacyMode, setPrivacyMode] = useState<"only_me" | "friends" | "all">("all");

  // Join block verification states
  const [isJoinErrorModalOpen, setIsJoinErrorModalOpen] = useState(false);
  const [joinErrorMessage, setJoinErrorMessage] = useState("");

  // Dynamic profile settings inside game
  const [editingProfile, setEditingProfile] = useState(false);
  const [profName, setProfName] = useState(() => localStorage.getItem("prof_name") || "");
  const [profColor, setProfColor] = useState(() => {
    const local = localStorage.getItem("prof_color");
    if (local) return local;
    const rand = TOON_COLORS[Math.floor(Math.random() * TOON_COLORS.length)];
    localStorage.setItem("prof_color", rand);
    return rand;
  });

  // Avatar Customizer & Shop States
  const [loadedAvatars, setLoadedAvatars] = useState<Array<{ name_en: string; name_ru: string; cost: number; path: string; flags: string }>>(() => [
    { name_en: "Basic avatar", name_ru: "Базовый аватар", cost: 0, path: "Avatar_1.png", flags: "none" },
    { name_en: "Cute avatar", name_ru: "Милый аватар", cost: 150, path: "Avatar_2.png", flags: "none" },
    { name_en: "NODE avatar", name_ru: "NODE аватар", cost: 0, path: "Avatar_node.png", flags: "admin" }
  ]);

  const [loadedFrames, setLoadedFrames] = useState<Array<{ name_en: string; name_ru: string; cost: number; path: string; flags: string }>>(() => [
    { name_en: "Fruits frame", name_ru: "Фруктовая рамка", cost: 100, path: "Frame_1.png", flags: "none" }
  ]);

  const [catalogReloadTrigger, setCatalogReloadTrigger] = useState(0);
  const [purgingCache, setPurgingCache] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const getStyleIdOfSkin = (skinId: string) => {
    const idx = loadedAvatars.findIndex(a => a.path === skinId);
    if (idx !== -1) return idx;
    if (skinId === "default" || skinId === "Avatar_1.png") return 0;
    if (skinId === "newavatar" || skinId === "Avatar_2.png") return 1;
    if (skinId === "Avatar_node.png") return 2;
    return 0;
  };

  const isAdmin = !!(playerId && roomInfo?.players[playerId]?.isAdmin);

  const isSkinOwnedHelper = (id: string) => {
    if (id === "default" || id === "Avatar_1.png") return true;
    const found = loadedAvatars.find(s => s.path === id);
    if (found) {
      if (found.cost === 0) return true;
      if (found.flags === "admin" && isAdmin) return true;
    }
    return ownedSkins.includes(id);
  };

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const avatarsRes = await fetch("https://cdn.jsdelivr.net/gh/calloradj-png/NodeAvatars@main/Avatars.json?t=" + Date.now());
        if (avatarsRes.ok) {
          const data = await avatarsRes.json();
          if (Array.isArray(data)) {
            setLoadedAvatars(data);
          }
        }
      } catch (err) {
        console.warn("Error loading Avatars.json:", err);
      }

      try {
        const framesRes = await fetch("https://cdn.jsdelivr.net/gh/calloradj-png/NodeAvatars@main/Frames.json?t=" + Date.now());
        if (framesRes.ok) {
          const data = await framesRes.json();
          if (Array.isArray(data)) {
            setLoadedFrames(data);
          }
        }
      } catch (err) {
        console.warn("Error loading Frames.json:", err);
      }
    };

    fetchCatalog();
  }, [catalogReloadTrigger]);

  const [isAvatarShopOpen, setIsAvatarShopOpen] = useState(false);
  const [shopTab, setShopTab] = useState<"skin" | "trail" | "name" | "decor">("skin");
  const [isBuyCoinsModalOpen, setIsBuyCoinsModalOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const purchasingRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!editingProfile) {
      setResetConfirm(false);
    }
  }, [editingProfile]);
  
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem("avatar_coins");
    return saved ? parseInt(saved, 10) : 250;
  });

  const [ownedSkins, setOwnedSkins] = useState<string[]>(() => {
    const saved = localStorage.getItem("owned_skins");
    return saved ? JSON.parse(saved) : ["default"];
  });
  const [ownedTrails, setOwnedTrails] = useState<string[]>(() => {
    const saved = localStorage.getItem("owned_trails");
    return saved ? JSON.parse(saved) : ["none"];
  });
  const [ownedEffects, setOwnedEffects] = useState<string[]>(() => {
    const saved = localStorage.getItem("owned_effects");
    return saved ? JSON.parse(saved) : ["none"];
  });
  const [ownedDecorFrames, setOwnedDecorFrames] = useState<string[]>(() => {
    const saved = localStorage.getItem("owned_decor_frames");
    return saved ? JSON.parse(saved) : ["none"];
  });

  const [equippedSkin, setEquippedSkin] = useState(() => localStorage.getItem("eq_skin") || "default");
  const [equippedTrail, setEquippedTrail] = useState(() => localStorage.getItem("eq_trail") || "none");
  const [equippedEffect, setEquippedEffect] = useState(() => localStorage.getItem("eq_effect") || "none");
  const [equippedDecorFrame, setEquippedDecorFrame] = useState(() => localStorage.getItem("eq_decor") || "none");

  const equippedSkinRef = useRef(equippedSkin);
  const equippedTrailRef = useRef(equippedTrail);
  const equippedEffectRef = useRef(equippedEffect);
  const equippedDecorFrameRef = useRef(equippedDecorFrame);

  useEffect(() => { equippedSkinRef.current = equippedSkin; }, [equippedSkin]);
  useEffect(() => { equippedTrailRef.current = equippedTrail; }, [equippedTrail]);
  useEffect(() => { equippedEffectRef.current = equippedEffect; }, [equippedEffect]);
  useEffect(() => { equippedDecorFrameRef.current = equippedDecorFrame; }, [equippedDecorFrame]);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("shop_favorites");
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    localStorage.setItem("shop_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const [lastSavedCosmetics, setLastSavedCosmetics] = useState<{
    skin: string;
    effect: string;
    decor: string;
  }>(() => ({
    skin: localStorage.getItem("eq_skin") || "default",
    effect: localStorage.getItem("eq_effect") || "none",
    decor: localStorage.getItem("eq_decor") || "none"
  }));

  // Simulated Advertisement States
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(4);
  const [activeAd, setActiveAd] = useState<{title: string, slogan: string} | null>(null);

  // Sync language attribute and class to HTML document for specialized Cyrillic styling
  useEffect(() => {
    document.documentElement.lang = language;
    if (language === "ru") {
      document.documentElement.classList.add("lang-ru");
    } else {
      document.documentElement.classList.remove("lang-ru");
    }
  }, [language]);

  // Sync to local storage
  useEffect(() => {
    // Proactively clear legacy particle trail settings to prevent old cube/sphere debris
    localStorage.removeItem("owned_trails");
    localStorage.setItem("eq_trail", "none");
    setEquippedTrail("none");
  }, []);

  useEffect(() => {
    localStorage.setItem("avatar_coins", coins.toString());
  }, [coins]);
  useEffect(() => {
    localStorage.setItem("owned_skins", JSON.stringify(ownedSkins));
  }, [ownedSkins]);
  useEffect(() => {
    localStorage.setItem("owned_trails", JSON.stringify(ownedTrails));
  }, [ownedTrails]);
  useEffect(() => {
    localStorage.setItem("owned_effects", JSON.stringify(ownedEffects));
  }, [ownedEffects]);
  useEffect(() => {
    localStorage.setItem("owned_decor_frames", JSON.stringify(ownedDecorFrames));
  }, [ownedDecorFrames]);
  useEffect(() => {
    if (isSkinOwnedHelper(equippedSkin)) {
      localStorage.setItem("eq_skin", equippedSkin);
    }
  }, [equippedSkin, ownedSkins, loadedAvatars, roomInfo]);
  useEffect(() => {
    if (ownedTrails.includes(equippedTrail)) {
      localStorage.setItem("eq_trail", equippedTrail);
    }
  }, [equippedTrail, ownedTrails]);
  useEffect(() => {
    if (ownedEffects.includes(equippedEffect)) {
      localStorage.setItem("eq_effect", equippedEffect);
    }
  }, [equippedEffect, ownedEffects]);
  useEffect(() => {
    if (equippedDecorFrame === "none" || ownedDecorFrames.includes(equippedDecorFrame)) {
      localStorage.setItem("eq_decor", equippedDecorFrame);
    }
  }, [equippedDecorFrame, ownedDecorFrames]);

  // Instantly apply cosmetic updates to local player state in roomInfo for latency-free updates across the HUD
  useEffect(() => {
    if (playerId) {
      setRoomInfo(prev => {
        if (!prev || !prev.players[playerId]) return prev;
        const currentLocal = prev.players[playerId];
        const computedStyle = getStyleIdOfSkin(equippedSkin);
        if (
          currentLocal.name === profName &&
          currentLocal.color === profColor &&
          currentLocal.particleTrail === equippedTrail &&
          currentLocal.nameEffect === equippedEffect &&
          currentLocal.decorFrame === equippedDecorFrame &&
          currentLocal.avatarStyle === computedStyle
        ) {
          return prev;
        }
        return {
          ...prev,
          players: {
            ...prev.players,
            [playerId]: {
              ...currentLocal,
              name: profName,
              color: profColor,
              particleTrail: equippedTrail,
              nameEffect: equippedEffect,
              decorFrame: equippedDecorFrame,
              avatarStyle: computedStyle
            }
          }
        };
      });
    }
  }, [profName, profColor, equippedSkin, equippedTrail, equippedEffect, equippedDecorFrame, playerId]);

  // Instantly update active local chat messages styling when local player cosmetics change to prevent any stale states
  useEffect(() => {
    if (playerId) {
      setChatMessages(prev => prev.map(msg => {
        if (msg.playerId === playerId) {
          return {
            ...msg,
            playerName: profName,
            playerColor: profColor,
            playerNameEffect: equippedEffect,
            playerDecorFrame: equippedDecorFrame
          };
        }
        return msg;
      }));
    }
  }, [profName, profColor, equippedEffect, equippedDecorFrame, playerId]);

  // Auto-expire administrator global announcements after 7.5 seconds
  useEffect(() => {
    if (globalAnnouncement) {
      const timer = setTimeout(() => {
        setGlobalAnnouncement(null);
      }, 7500);
      return () => clearTimeout(timer);
    }
  }, [globalAnnouncement]);

  // Sound play chime helper
  const playCoinChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0.06, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
      };
      playTone(523.25, now, 0.12);
      playTone(659.25, now + 0.06, 0.12);
      playTone(783.99, now + 0.12, 0.25);
    } catch (err) {
      console.warn("Chime block", err);
    }
  };

  const buyOrEquipItem = (category: "skin" | "trail" | "effect" | "decor", id: string, cost: number) => {
    if (purchasingRef.current[id]) return;

    if (category === "skin") {
      if (isSkinOwnedHelper(id)) {
        setEquippedSkin(id);
        return;
      }
      if (coins >= cost) {
        purchasingRef.current[id] = true;
        setCoins(prev => prev - cost);
        setOwnedSkins(prev => [...prev, id]);
        setEquippedSkin(id);
        setLastSavedCosmetics(prev => ({ ...prev, skin: id }));
        playCoinChime();
        const msg = language === "ru" 
          ? "Товар успешно куплен и выбран!" 
          : "Item successfully bought and equipped!";
        setPurchaseToast({ text: msg });
        setTimeout(() => setPurchaseToast(null), 3000);
        setTimeout(() => {
          delete purchasingRef.current[id];
        }, 1000);
      } else {
        setIsBuyCoinsModalOpen(true);
      }
    } else if (category === "trail") {
      if (ownedTrails.includes(id)) {
        setEquippedTrail(id);
        return;
      }
      if (coins >= cost) {
        purchasingRef.current[id] = true;
        setCoins(prev => prev - cost);
        setOwnedTrails(prev => [...prev, id]);
        setEquippedTrail(id);
        playCoinChime();
        const msg = language === "ru" 
          ? "Товар успешно куплен и выбран!" 
          : "Item successfully bought and equipped!";
        setPurchaseToast({ text: msg });
        setTimeout(() => setPurchaseToast(null), 3000);
        setTimeout(() => {
          delete purchasingRef.current[id];
        }, 1000);
      } else {
        setIsBuyCoinsModalOpen(true);
      }
    } else if (category === "effect") {
      if (ownedEffects.includes(id)) {
        setEquippedEffect(id);
        return;
      }
      if (coins >= cost) {
        purchasingRef.current[id] = true;
        setCoins(prev => prev - cost);
        setOwnedEffects(prev => [...prev, id]);
        setEquippedEffect(id);
        setLastSavedCosmetics(prev => ({ ...prev, effect: id }));
        playCoinChime();
        const msg = language === "ru" 
          ? "Товар успешно куплен и выбран!" 
          : "Item successfully bought and equipped!";
        setPurchaseToast({ text: msg });
        setTimeout(() => setPurchaseToast(null), 3000);
        setTimeout(() => {
          delete purchasingRef.current[id];
        }, 1000);
      } else {
        setIsBuyCoinsModalOpen(true);
      }
    } else if (category === "decor") {
      if (id === "none" || ownedDecorFrames.includes(id)) {
        setEquippedDecorFrame(id);
        return;
      }
      if (coins >= cost) {
        purchasingRef.current[id] = true;
        setCoins(prev => prev - cost);
        setOwnedDecorFrames(prev => [...prev, id]);
        setEquippedDecorFrame(id);
        setLastSavedCosmetics(prev => ({ ...prev, decor: id }));
        playCoinChime();
        const msg = language === "ru" 
          ? "Товар успешно куплен и выбран!" 
          : "Item successfully bought and equipped!";
        setPurchaseToast({ text: msg });
        setTimeout(() => setPurchaseToast(null), 3000);
        setTimeout(() => {
          delete purchasingRef.current[id];
        }, 1000);
      } else {
        setIsBuyCoinsModalOpen(true);
      }
    }
  };

  const startWatchingAd = () => {
    if (platformSdk.getPlatform() !== "local") {
      // Show real platform rewarded video!
      platformSdk.showRewardedAd({
        onOpen: () => {
          console.log("Platform rewarded ad starting.");
        },
        onReward: () => {
          setCoins(c => c + 25);
          playCoinChime();
          const text = language === "ru" ? "Получено +25" : "Received +25";
          setPurchaseToast({ text, showCoin: true });
          setTimeout(() => setPurchaseToast(null), 3500);
        },
        onClose: () => {
          console.log("Platform rewarded ad completed / closed.");
        },
        onError: (err) => {
          console.error("Platform rewarded ad error:", err);
        }
      });
    } else {
      // Fallback local simulated ad with countdown ticker
      const ads = language === "ru" ? [
        { title: "Toon Arena Grid 3D", slogan: "Сокрушай кубики и доминируй в таблице лидеров! Скачай бесплатно!" },
        { title: "Node Simulator 2026", slogan: "Почувствуй себя настоящим ИИ-агентом. Перепиши весь мир на TypeScript!" },
        { title: "GridCoin Tycoon Pro", slogan: "Майни коины взглядом прямо в песочнице. Остерегайся гнева NODE!" },
        { title: "Bouncing Plucky Space", slogan: "Управляй прыгающими бумажными спрайтами в космосе. Мультиплеер 120 FPS!" }
      ] : [
        { title: "Toon Arena Grid 3D", slogan: "Smash blocks and dominate the leaderboard! Free download!" },
        { title: "Node Simulator 2026", slogan: "Live the life of a true AI agent. Re-index the universe in TypeScript!" },
        { title: "GridCoin Tycoon Pro", slogan: "Mine coins by looking in the sandbox. Watch out for the wrath of NODE!" },
        { title: "Bouncing Plucky Space", slogan: "Fly bouncy paper sprites in outer space. Multiplayer at 120 FPS!" }
      ];
      const chosen = ads[Math.floor(Math.random() * ads.length)];
      setActiveAd(chosen);
      setAdCountdown(4);
      setIsWatchingAd(true);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isWatchingAd && adCountdown > 0) {
      interval = setInterval(() => {
        setAdCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setCoins(c => c + 25);
            playCoinChime();
            const text = language === "ru" ? "Получено +25" : "Received +25";
            setPurchaseToast({ text, showCoin: true });
            setTimeout(() => setPurchaseToast(null), 3500);
            setIsWatchingAd(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWatchingAd, adCountdown]);

  // Synchronize cosmetics with other players (prevent broadcasting unowned/previewed shop items)
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && playerId) {
      const isSkinOwned = isSkinOwnedHelper(equippedSkin);
      const isEffectOwned = ownedEffects.includes(equippedEffect);
      const isDecorOwned = ownedDecorFrames.includes(equippedDecorFrame);

      const activeSkinForBroadcast = isSkinOwned ? equippedSkin : (lastSavedCosmetics.skin || "default");
      const activeEffectForBroadcast = isEffectOwned ? equippedEffect : (lastSavedCosmetics.effect || "none");
      const activeDecorForBroadcast = isDecorOwned ? equippedDecorFrame : (lastSavedCosmetics.decor || "none");

      wsRef.current.send(JSON.stringify({
        type: "profile_update",
        payload: {
          name: profName,
          color: profColor,
          particleTrail: equippedTrail,
          nameEffect: activeEffectForBroadcast,
          decorFrame: activeDecorForBroadcast,
          avatarStyle: getStyleIdOfSkin(activeSkinForBroadcast)
        }
      }));
    }
  }, [equippedTrail, equippedEffect, equippedDecorFrame, equippedSkin, profName, profColor, playerId, ownedSkins, ownedEffects, ownedDecorFrames, lastSavedCosmetics]);

  // Administrative state managers
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem("admin_password") || "");
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    if (profName && !profName.startsWith("CyberRobot-")) {
      localStorage.setItem("prof_name", profName);
    }
  }, [profName]);

  useEffect(() => {
    if (profColor) {
      localStorage.setItem("prof_color", profColor);
    }
  }, [profColor]);

  useEffect(() => {
    if (adminPassword) {
      localStorage.setItem("admin_password", adminPassword);
    }
  }, [adminPassword]);
  const [adminActionModal, setAdminActionModal] = useState<{ type: "shutdown" | "kick_all" | "kick_player"; targetPlayerId?: string; targetPlayerName?: string } | null>(null);
  const [adminReasonText, setAdminReasonText] = useState("");
  const [adminKickedMessage, setAdminKickedMessage] = useState<string | null>(null);
  const [adminShutdownMessage, setAdminShutdownMessage] = useState<string | null>(null);
  const [isChatVisible, setIsChatVisible] = useState(!isMobile);
  const [isScoreboardVisible, setIsScoreboardVisible] = useState(!isMobile);

  const [unreadCount, setUnreadCount] = useState(0);
  const [miniMessages, setMiniMessages] = useState<ChatMessage[]>([]);
  const isChatVisibleRef = useRef(isChatVisible);
  const languageRef = useRef(language);
  const joystickVector = useRef<{ x: number; y: number } | null>({ x: 0, y: 0 });
  const [mobileChatHeight, setMobileChatHeight] = useState<number | null>(null);
  const [uiScale, setUiScale] = useState(1);

  // Graphics Level Preset: 1 = Low, 2 = Medium, 3 = High, 4 = Ultra
  const [graphicsQuality, setGraphicsQuality] = useState<number>(() => {
    const saved = localStorage.getItem("graphicsQuality");
    return saved ? parseInt(saved, 10) : 3;
  });

  // Sound Volume Level: 0 - 100
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    const saved = localStorage.getItem("soundVolume");
    return saved ? parseInt(saved, 10) : 70;
  });

  // Active state page within configuration overlay: "settings" or "servers"
  const [activeOverlayTab, setActiveOverlayTab] = useState<"settings" | "servers">("settings");

  // Search filter query string for rooms
  const [roomSearch, setRoomSearch] = useState("");

  // Filters state tab: "all" | "available" | "full"
  const [roomFilter, setRoomFilter] = useState<"all" | "available" | "full">("all");

  // Visual text overlay state for link copy success toast
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleGraphicsChange = (val: number) => {
    setGraphicsQuality(val);
    localStorage.setItem("graphicsQuality", val.toString());
  };

  const handleVolumeChange = (val: number) => {
    setSoundVolume(val);
    localStorage.setItem("soundVolume", val.toString());
  };

  const handleVolumeChangeComplete = (val: number) => {
    playPreviewBeep(val / 100);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMobileChatHeight(Math.round(window.innerHeight * 0.78));

      // Preload critical market overlay resources immediately on mount
      const marketImages = [
        marketCoverUrl,
        adButtonRuUrl,
        adButtonEnUrl,
        passButtonRuUrl,
        passButtonEnUrl
      ];
      marketImages.forEach((url) => {
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });

      // Block context menu (Right Click) globally for a fully native app experience
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };
      window.addEventListener("contextmenu", handleContextMenu);

      // Block default image dragging actions
      const handleDragStart = (e: DragEvent) => {
        if ((e.target as HTMLElement).tagName === "IMG") {
          e.preventDefault();
        }
      };
      window.addEventListener("dragstart", handleDragStart);

      return () => {
        window.removeEventListener("contextmenu", handleContextMenu);
        window.removeEventListener("dragstart", handleDragStart);
      };
    }
  }, []);

  // Adaptive UI Proportion Scaling based on minimum viewport width/height relative to base layout
  useEffect(() => {
    if (isMobile) {
      setUiScale(1);
      return;
    }
    const updateScale = () => {
      const baseWidth = 1366;
      const baseHeight = 768;
      
      const scaleX = window.innerWidth / baseWidth;
      const scaleY = window.innerHeight / baseHeight;
      
      // Base scaling on viewport, scaled up by 1.3x as requested for perfect game-HUD proportions
      let scale = Math.min(scaleX, scaleY) * 1.3;
      
      // Clamp boundaries shifted up proportionally (min 0.85, max 1.6) to ensure it stays wonderfully readable
      scale = Math.min(1.6, Math.max(0.85, scale));
      setUiScale(scale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [isMobile]);

  useEffect(() => {
    isChatVisibleRef.current = isChatVisible;
    if (isChatVisible) {
      setUnreadCount(0);
    }
  }, [isChatVisible]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    if (miniMessages.length > 0) {
      const timer = setTimeout(() => {
        setMiniMessages(prev => prev.slice(1));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [miniMessages]);

  // Tab key listener to toggle scoreboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setIsScoreboardVisible(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle loading initial stats on load of page
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const backendUrl = (import.meta as any).env.VITE_BACKEND_URL ? (import.meta as any).env.VITE_BACKEND_URL.replace(/\/$/, "") : "";
        const response = await fetch(backendUrl ? `${backendUrl}/api/status` : "/api/status");
        if (response.ok) {
          const data = await response.json();
          if (data && data.activeRooms) {
            const list = data.activeRooms.map((r: any) => {
              let rName = r.name || r.id;
              if (r.id === "neon-temple") rName = "Toon Garden";
              else if (r.id === "cyber-grid") rName = "Paper Arena";
              else if (r.id === "retro-playground") rName = "Sunset Play";
              
              return {
                id: r.id,
                name: rName,
                activePlayers: r.count,
                players: r.players,
                hasPassword: r.hasPassword
              };
            });
            setAvailableRooms(list);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch server HTTP status directly, using ws updates", e);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sync client closure on leave or tab close
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleJoinGame = (nickname: string, color: string, avatarStyle: number, roomId?: string, customPassword?: string) => {
    setConnecting(true);
    setErrorMsg(null);

    // Use configured VITE_BACKEND_URL for separation, or default to current origin
    const backendUrl = (import.meta as any).env.VITE_BACKEND_URL ? (import.meta as any).env.VITE_BACKEND_URL.replace(/\/$/, "") : "";
    let wsUrl = "";
    if (backendUrl) {
      // Convert https/http to wss/ws
      wsUrl = backendUrl.replace(/^http/, "ws");
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}`;
    }

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        // Send join packet
        socket.send(JSON.stringify({
          type: "join",
          payload: {
            name: nickname,
            color,
            avatarStyle,
            requestedRoomId: roomId,
            password: customPassword !== undefined ? customPassword : (adminPassword || localStorage.getItem("admin_password") || ""),
            particleTrail: localStorage.getItem("eq_trail") || "none",
            nameEffect: localStorage.getItem("eq_effect") || "none",
            decorFrame: localStorage.getItem("eq_decor") || "none",
            friendsList: (() => {
              try {
                const saved = localStorage.getItem("robo_arena_friends");
                return saved ? JSON.parse(saved) : [];
              } catch (_) {
                return [];
              }
            })()
          }
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;

          if (type === "init") {
            setPlayerId(payload.playerId);
            playerIdRef.current = payload.playerId;
            setCurrentRoomId(payload.roomId);
            setRoomInfo(payload.roomInfo);
            setChatMessages([]); // clear chats from previous sessions
            setAvailableRooms(payload.availableRooms.map((r: any) => {
              let rName = r.name || r.id;
              if (r.id === "neon-temple") rName = "Toon Garden";
              else if (r.id === "cyber-grid") rName = "Paper Arena";
              else if (r.id === "retro-playground") rName = "Sunset Play";
              return {
                id: r.id,
                name: rName,
                activePlayers: r.activePlayers,
                players: r.players,
                mode: r.mode
              };
            }));
            setProfName(payload.roomInfo.players[payload.playerId]?.name || nickname);
            setProfColor(payload.roomInfo.players[payload.playerId]?.color || color);
            setInGame(true);
            setConnecting(false);
            platformSdk.ready();

            // Close connection modals on success
            setIsJoinErrorModalOpen(false);
          }

          else if (type === "player_joined" || type === "player_updated") {
            setRoomInfo(prev => {
              if (!prev) return prev;
              const updatedPlayer = { ...payload.player };
              if (updatedPlayer.id === playerIdRef.current) {
                updatedPlayer.particleTrail = equippedTrailRef.current;
                updatedPlayer.nameEffect = equippedEffectRef.current;
                updatedPlayer.decorFrame = equippedDecorFrameRef.current;
                updatedPlayer.avatarStyle = getStyleIdOfSkin(equippedSkinRef.current);
              }
              return {
                ...prev,
                players: {
                  ...prev.players,
                  [payload.player.id]: updatedPlayer
                }
              };
            });
          }

          else if (type === "player_left") {
            setRoomInfo(prev => {
              if (!prev) return prev;
              const nextPlayers = { ...prev.players };
              delete nextPlayers[payload.id];
              return {
                ...prev,
                players: nextPlayers
              };
            });
          }

          else if (type === "player_moved") {
            setRoomInfo(prev => {
              if (!prev) return prev;
              const target = prev.players[payload.id];
              if (!target) return prev;
              
              target.x = payload.x;
              target.y = payload.y;
              target.z = payload.z;
              target.rx = payload.rx;
              target.ry = payload.ry;
              target.rz = payload.rz;
              target.isMoving = payload.isMoving;

              return {
                ...prev,
                players: {
                  ...prev.players,
                  [payload.id]: { ...target }
                }
              };
            });
          }

          else if (type === "collectible_taken") {
            const { collectibleId, takerId, takerScore } = payload;
            setRoomInfo(prev => {
              if (!prev) return prev;
              // Remove collectible
              const nextCollectibles = prev.collectibles.filter(c => c.id !== collectibleId);
              // Update player's score
              const targetPlayer = prev.players[takerId];
              if (targetPlayer) {
                targetPlayer.score = takerScore;
              }

              return {
                ...prev,
                collectibles: nextCollectibles,
                players: {
                  ...prev.players,
                  ...(targetPlayer ? { [takerId]: { ...targetPlayer } } : {})
                }
              };
            });
          }

          else if (type === "collectible_spawned") {
            setRoomInfo(prev => {
              if (!prev) return prev;
              // Check duplicate guard
              if (prev.collectibles.some(c => c.id === payload.collectible.id)) {
                return prev;
              }
              return {
                ...prev,
                collectibles: [...prev.collectibles, payload.collectible]
              };
            });
          }

          else if (type === "chat_message") {
            const newMsg = payload.message;
            setChatMessages(prev => [...prev.slice(-48), newMsg]);
            if (!isChatVisibleRef.current) {
              setUnreadCount(prev => prev + 1);
              setMiniMessages(prev => [...prev.slice(-2), newMsg]); // keep max 3 visible mini messages
            }
            if (newMsg.isGlobal) {
              setGlobalAnnouncement({
                id: newMsg.id,
                text: newMsg.text,
                senderName: newMsg.playerName,
                senderColor: newMsg.playerColor,
                senderNameEffect: newMsg.playerNameEffect,
                senderDecorFrame: newMsg.playerDecorFrame,
                senderIsAdmin: newMsg.playerIsAdmin,
                isBilingual: newMsg.isBilingual,
                textRu: newMsg.textRu,
                textEn: newMsg.textEn
              });
            }
          }

          else if (type === "room_counts_update") {
            setAvailableRooms(payload.availableRooms.map((r: any) => {
              let rName = r.name || r.id;
              if (r.id === "neon-temple") rName = "Toon Garden";
              else if (r.id === "cyber-grid") rName = "Paper Arena";
              else if (r.id === "retro-playground") rName = "Sunset Play";
              return {
                id: r.id,
                name: rName,
                activePlayers: r.activePlayers,
                players: r.players,
                mode: r.mode
              };
            }));
          }

          else if (type === "password_error" || type === "join_error") {
            setJoinErrorMessage(payload.message);
            setConnecting(false);
            setIsJoinErrorModalOpen(true);
          }

          else if (type === "admin_status") {
            if (payload.success) {
              setEditingProfile(false);
              setAdminError(null);
              // Save authenticated administrator credentials immediately
              setTimeout(() => {
                saveProgressToPlatform();
              }, 100);
            } else {
              setAdminError(payload.message);
            }
          }

          else if (type === "admin_shutdown_broadcast") {
            setAdminShutdownMessage(payload.reason);
            if (wsRef.current) {
              wsRef.current.close();
            }
          }

          else if (type === "admin_kick_broadcast") {
            setAdminKickedMessage(payload.reason);
            if (wsRef.current) {
              wsRef.current.close();
            }
          }

          else if (type === "nickname_warning") {
            setPurchaseToast({ text: payload.message });
            setTimeout(() => setPurchaseToast(null), 4000);
          }

          else if (type === "friend_request_received") {
            const { senderId, senderName, senderColor, senderAvatarStyle, senderDecorFrame } = payload;
            setIncomingRequests(prev => {
              if (prev.some(r => r.senderId === senderId)) return prev;
              return [...prev, { senderId, senderName, senderColor, senderAvatarStyle, senderDecorFrame }];
            });
          }

          else if (type === "friend_challenge") {
            const { targetId, targetName } = payload;
            setFriends(prev => {
              if (prev.includes(targetName)) return prev;
              return [...prev, targetName];
            });
            setPurchaseToast({
              text: languageRef.current === "ru" 
                ? `Игрок ${targetName} добавлен в друзья!` 
                : `Player ${targetName} added as friend!`
            });
            setTimeout(() => setPurchaseToast(null), 3000);

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: "friend_challenge_ack",
                payload: { targetId }
              }));
            }
          }

          else if (type === "friend_handshake_complete") {
            const { targetName } = payload;
            setFriends(prev => {
              if (prev.includes(targetName)) return prev;
              return [...prev, targetName];
            });
            setPurchaseToast({
              text: languageRef.current === "ru" 
                ? `Игрок ${targetName} добавлен в друзья!` 
                : `Player ${targetName} added as friend!`
            });
            setTimeout(() => setPurchaseToast(null), 3000);
          }

          else if (type === "friend_removed") {
            const { removedByName } = payload;
            setFriends(prev => prev.filter(name => name !== removedByName));
            setPurchaseToast({
              text: languageRef.current === "ru"
                ? `Игрок ${removedByName} удалил вас из друзей.`
                : `Player ${removedByName} removed you from friends.`
            });
            setTimeout(() => setPurchaseToast(null), 3500);
          }

        } catch (err) {
          console.error("Error demultiplexing frame packet:", err);
        }
      };

      socket.onerror = (e) => {
        console.error("WebSocket socket error:", e);
        setErrorMsg("Connection error. Is server sleeping?");
        setConnecting(false);
        setInGame(false);
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed.");
        setInGame(false);
        setConnecting(false);
      };

    } catch (e) {
      console.error("Initialization websocket client crash:", e);
      setErrorMsg("Failed to launch real-time module framework.");
      setConnecting(false);
    }
  };
  
  const handlePlayButtonClick = () => {
    let name = profName.trim();
    if (!name) {
      const arr = ["Buddy", "Hero", "Toon", "Doodle", "Plucky", "Wobble", "Sparky", "Sling", "Bounce"];
      name = `${arr[Math.floor(Math.random() * arr.length)]}-${Math.floor(100 + Math.random() * 900)}`;
      setProfName(name);
    }
    const color = profColor || TOON_COLORS[Math.floor(Math.random() * TOON_COLORS.length)];
    const style = getStyleIdOfSkin(equippedSkin);
    
    handleJoinGame(name, color, style);
  };

  // Save progress safely on SDK servers or local localStorage fallbacks
  const saveProgressToPlatform = async (currentCoins?: number) => {
    let finalSaveName = profName;
    let finalSavePassword = adminPassword;
    
    if (profName.startsWith("CyberRobot-")) {
      const storedName = localStorage.getItem("prof_name");
      if (storedName && storedName.toUpperCase() === "NODE") {
        finalSaveName = storedName;
        finalSavePassword = localStorage.getItem("admin_password") || adminPassword;
      }
    }

    const savePayload = {
      prof_name: finalSaveName,
      prof_color: profColor,
      admin_password: finalSavePassword,
      avatar_coins: currentCoins !== undefined ? currentCoins : coins,
      owned_skins: ownedSkins,
      owned_trails: ownedTrails,
      owned_effects: ownedEffects,
      owned_decor_frames: ownedDecorFrames,
      eq_skin: equippedSkin,
      eq_trail: equippedTrail,
      eq_effect: equippedEffect,
      eq_decor: equippedDecorFrame,
    };
    await platformSdk.saveData(savePayload);
  };

  // Debounced auto-save hook upon any transaction or configurations change
  useEffect(() => {
    if (!isInitialLoadDone) return;
    const tStr = setTimeout(() => {
      saveProgressToPlatform();
    }, 1200); // 1.2s debounce to throttle heavy operations
    return () => clearTimeout(tStr);
  }, [profName, profColor, adminPassword, coins, ownedSkins, ownedTrails, ownedEffects, ownedDecorFrames, equippedSkin, equippedTrail, equippedEffect, equippedDecorFrame, isInitialLoadDone]);

  // Platform and saves initialization on mount
  useEffect(() => {
    let active = true;
    const initializePlatform = async () => {
      console.log("[App] Activating PlatformSDK...");
      // Initialize SDK scripts
      await platformSdk.init();

      if (!active) return;

      // Register warning hooks for Guest / Lite status on Yandex
      platformSdk.onAuthWarning((warning) => {
        setSdkAuthWarning(warning);
      });

      // Synchronize language from platform
      const sdkLang = platformSdk.getLanguage();
      setLanguage(sdkLang);
      localStorage.setItem("app_lang", sdkLang);

      // Load user profile
      const sdkUser = await platformSdk.getUser();
      if (!active) return;

      const arr = ["Buddy", "Hero", "Toon", "Doodle", "Plucky", "Wobble", "Sparky", "Sling", "Bounce"];
      const randomColor = TOON_COLORS[Math.floor(Math.random() * TOON_COLORS.length)];

      if (sdkUser?.avatarUrl) {
        setSdkAvatarUrl(sdkUser.avatarUrl);
      }

      // Load save progress
      const keysToLoad = [
        "prof_name",
        "prof_color",
        "admin_password",
        "avatar_coins",
        "owned_skins",
        "owned_trails",
        "owned_effects",
        "owned_decor_frames",
        "eq_skin",
        "eq_trail",
        "eq_effect",
        "eq_decor"
      ];
      try {
        const loadedSaveData = await platformSdk.loadData(keysToLoad);
        if (!active) return;

        let finalName = loadedSaveData?.prof_name || localStorage.getItem("prof_name") || "";
        let isNewAccount = false;
        
        // Pick name: check persistent slot first
        if (!finalName) {
          // New/Reset user: formulate initials and flag to immediately persist next
          finalName = sdkUser?.name || `${arr[Math.floor(Math.random() * arr.length)]}-${Math.floor(100 + Math.random() * 900)}`;
          isNewAccount = true;
        }

        let finalColor = loadedSaveData?.prof_color || localStorage.getItem("prof_color") || randomColor;

        setProfName(finalName);
        setProfColor(finalColor);
        localStorage.setItem("prof_name", finalName);
        localStorage.setItem("prof_color", finalColor);

        let finalSkin = "default";
        let loadedPass = loadedSaveData?.admin_password || localStorage.getItem("admin_password") || "";
        if (loadedPass) {
          setAdminPassword(loadedPass);
          localStorage.setItem("admin_password", loadedPass);
        }
        if (loadedSaveData) {
          if (loadedSaveData.avatar_coins !== undefined && loadedSaveData.avatar_coins !== null) {
            setCoins(Number(loadedSaveData.avatar_coins));
          }
          if (loadedSaveData.owned_skins) setOwnedSkins(loadedSaveData.owned_skins);
          if (loadedSaveData.owned_trails) setOwnedTrails(loadedSaveData.owned_trails);
          if (loadedSaveData.owned_effects) setOwnedEffects(loadedSaveData.owned_effects);
          if (loadedSaveData.owned_decor_frames) setOwnedDecorFrames(loadedSaveData.owned_decor_frames);
          
          if (loadedSaveData.eq_skin) {
            setEquippedSkin(loadedSaveData.eq_skin);
            finalSkin = loadedSaveData.eq_skin;
          }
          if (loadedSaveData.eq_trail) setEquippedTrail(loadedSaveData.eq_trail);
          if (loadedSaveData.eq_effect) setEquippedEffect(loadedSaveData.eq_effect);
          if (loadedSaveData.eq_decor) setEquippedDecorFrame(loadedSaveData.eq_decor);
        }

        const finalStyle = getStyleIdOfSkin(finalSkin);

        // Instantly save if we created a username on first start/reset
        if (isNewAccount) {
          const firstSavePayload = {
            prof_name: finalName,
            prof_color: finalColor,
            avatar_coins: loadedSaveData?.avatar_coins !== undefined ? Number(loadedSaveData.avatar_coins) : coins,
            owned_skins: loadedSaveData?.owned_skins || ownedSkins,
            owned_trails: loadedSaveData?.owned_trails || ownedTrails,
            owned_effects: loadedSaveData?.owned_effects || ownedEffects,
            owned_decor_frames: loadedSaveData?.owned_decor_frames || ownedDecorFrames,
            eq_skin: loadedSaveData?.eq_skin || equippedSkin,
            eq_trail: loadedSaveData?.eq_trail || equippedTrail,
            eq_effect: loadedSaveData?.eq_effect || equippedEffect,
            eq_decor: loadedSaveData?.eq_decor || equippedDecorFrame,
          };
          await platformSdk.saveData(firstSavePayload);
        }
        
        // Auto join game lobby session
        setTimeout(() => {
          handleJoinGame(finalName, finalColor, finalStyle, undefined, loadedPass || localStorage.getItem("admin_password") || "");
          setIsInitialLoadDone(true);
        }, 300);

      } catch (saveError) {
        console.error("[App] State restoration error, fallback to random config", saveError);
        const fbName = sdkUser?.name || `${arr[Math.floor(Math.random() * arr.length)]}-${Math.floor(100 + Math.random() * 900)}`;
        setProfName(fbName);
        setProfColor(randomColor);
        const fbPass = localStorage.getItem("admin_password") || "";
        handleJoinGame(fbName, randomColor, 0, undefined, fbPass);
        setIsInitialLoadDone(true);
      }
    };

    initializePlatform();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let timer: any;
    if (connecting) {
      setShowOverlayActual(true);
      setLoadingProgress(5);
      
      timer = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 70) {
            // Speedily advance up to 70%
            return prev + Math.floor(Math.random() * 5 + 3);
          } else if (prev < 88) {
            // Slower advance up to ~88%
            return prev + Math.floor(Math.random() * 2 + 1);
          } else if (prev < 93) {
            // Crawl very slowly while waiting to connect
            return prev + (Math.random() > 0.85 ? 1 : 0);
          }
          return prev;
        });
      }, 180);
    } else {
      if (inGame) {
        // Successful connection! Leap immediately towards 100%
        setLoadingProgress(prev => Math.max(prev, 90));
        if (timer) clearInterval(timer);
        
        let targetVal = Math.max(loadingProgress, 90);
        const finishTimer = setInterval(() => {
          targetVal += 4 + Math.floor(Math.random() * 8);
          if (targetVal >= 100) {
            targetVal = 100;
            setLoadingProgress(100);
            clearInterval(finishTimer);
            // Give a highly premium 250ms feel before fading out the screen
            setTimeout(() => {
              setShowOverlayActual(false);
            }, 250);
          } else {
            setLoadingProgress(targetVal);
          }
        }, 40);
        return () => {
          clearInterval(finishTimer);
        };
      } else {
        // If not connecting and not in game, show screen in idle state (0% bar)
        setShowOverlayActual(true);
        setLoadingProgress(0);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [connecting, inGame]);

  const handleSendMessage = (text: string, replyTo?: ChatMessage["replyTo"]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "chat",
        payload: { text, replyTo }
      }));
    }
  };

  const handleSendBilingualGlobal = (textRu: string, textEn: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "bilingual_global",
        payload: { textRu, textEn }
      }));
    }
  };

  const handleSwitchRoom = (newRoomId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setConnecting(true);
      setEditingProfile(false);
      setIsJoinErrorModalOpen(false);
      wsRef.current.send(JSON.stringify({
        type: "switch_room",
        payload: { newRoomId }
      }));
    }
  };

  const handleTryJoinRoom = (room: RoomStats) => {
    handleSwitchRoom(room.id);
  };

  const handleCreateServerAction = () => {
    if (!newPrivateServerName.trim()) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setConnecting(true);
      setEditingProfile(false);
      wsRef.current.send(JSON.stringify({
        type: "create_room",
        payload: {
          name: newPrivateServerName.trim(),
          mode: privacyMode
        }
      }));
      setNewPrivateServerName("");
      setIsCreatePrivateModalOpen(false);
    }
  };

  const handleLeaveGame = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setInGame(false);
    setPlayerId(null);
    setCurrentRoomId(null);
    setRoomInfo(null);
    setChatMessages([]);
  };

  const handleCopyInviteLink = () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?room=${currentRoomId || ""}`;
      navigator.clipboard.writeText(url);
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 2200);
    } catch (e) {
      console.warn("Failed to copy invite url to clipboard", e);
    }
  };

  const handleAdminShutdownAllPrompt = () => {
    setAdminReasonText("");
    setAdminActionModal({ type: "shutdown" });
  };

  const handleAdminKickAllPrompt = () => {
    setAdminReasonText("");
    setAdminActionModal({ type: "kick_all" });
  };

  const handleAdminKickPlayerPrompt = (targetId: string, name: string) => {
    setAdminReasonText("");
    setAdminActionModal({ type: "kick_player", targetPlayerId: targetId, targetPlayerName: name });
  };

  const submitAdminAction = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !adminActionModal) return;

    const { type, targetPlayerId } = adminActionModal;

    if (type === "shutdown") {
      wsRef.current.send(JSON.stringify({
        type: "admin_shutdown_all_req",
        payload: { reason: adminReasonText.trim() }
      }));
    } else if (type === "kick_all") {
      wsRef.current.send(JSON.stringify({
        type: "admin_kick_all_req",
        payload: { reason: adminReasonText.trim() }
      }));
    } else if (type === "kick_player" && targetPlayerId) {
      wsRef.current.send(JSON.stringify({
        type: "admin_kick_player_req",
        payload: { targetPlayerId, reason: adminReasonText.trim() }
      }));
    }

    setAdminActionModal(null);
    setAdminReasonText("");
  };

  const handleClearCache = async () => {
    setPurgingCache(true);
    setPurgeMessage(null);
    try {
      const targetFiles = ["Avatars.json", "Frames.json"];
      if (Array.isArray(loadedAvatars)) {
        loadedAvatars.forEach(a => {
          if (a.path && !targetFiles.includes(a.path)) targetFiles.push(a.path);
        });
      }
      if (Array.isArray(loadedFrames)) {
        loadedFrames.forEach(f => {
          if (f.path && !targetFiles.includes(f.path)) targetFiles.push(f.path);
        });
      }

      const backendUrl = (import.meta as any).env.VITE_BACKEND_URL ? (import.meta as any).env.VITE_BACKEND_URL.replace(/\/$/, "") : "";
      const res = await fetch(backendUrl ? `${backendUrl}/api/purge-cache` : "/api/purge-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword || "N0DE0969",
          files: targetFiles
        })
      });

      if (res.ok) {
        setPurgeMessage({ text: t.clearCacheSuccess, isError: false });
        setTimeout(() => {
          setCatalogReloadTrigger(prev => prev + 1);
        }, 1500);
      } else {
        const errData = await res.json();
        setPurgeMessage({ text: `${t.clearCacheFail}: ${errData.error || ""}`, isError: true });
      }
    } catch (err: any) {
      setPurgeMessage({ text: `${t.clearCacheFail}: ${err.message}`, isError: true });
    } finally {
      setPurgingCache(false);
    }
  };

  const saveProfileChanges = () => {
    setAdminError(null);
    
    // If Admin NODE credential elevation is attempted, dispatch it
    if (profName.trim().toUpperCase() === "NODE" && adminPassword && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "profile_update",
        payload: {
          name: profName,
          color: profColor,
          password: adminPassword
        }
      }));
    }
    
    // Instantly commit profile settings to local database and Yandex secure cloud state
    saveProgressToPlatform();
    
    setEditingProfile(false);
  };

  const handleOpenShop = () => {
    setLastSavedCosmetics({
      skin: equippedSkin,
      effect: equippedEffect,
      decor: equippedDecorFrame
    });
    setIsAvatarShopOpen(true);
    setEditingProfile(false);
    if (window.innerWidth >= 768) {
      setIsChatVisible(false);
    }
  };

  const handleCloseShop = () => {
    setIsAvatarShopOpen(false);
    // Revert unowned selections
    if (!isSkinOwnedHelper(equippedSkin)) {
      setEquippedSkin(lastSavedCosmetics.skin);
    }
    if (equippedEffect !== "none" && !ownedEffects.includes(equippedEffect)) {
      setEquippedEffect(lastSavedCosmetics.effect);
    }
    if (equippedDecorFrame !== "none" && !ownedDecorFrames.includes(equippedDecorFrame)) {
      setEquippedDecorFrame(lastSavedCosmetics.decor);
    }
  };

  const showIntroOverlay = !inGame || connecting;

  return (
    <main className="w-screen h-screen bg-[#090a0f] selection:bg-neutral-800 selection:text-white text-white font-sans flex overflow-hidden relative">
      {/* Purchase success non-blocking toast */}
      <AnimatePresence>
        {purchaseToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-10 md:top-16 left-1/2 bg-emerald-500 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-[200] flex items-center gap-2 border border-emerald-400/25 backdrop-blur-md whitespace-nowrap"
          >
            <Check className="w-4.5 h-4.5 text-white flex-shrink-0" />
            <div className="flex items-center gap-1">
              <span>{purchaseToast.text}</span>
              {purchaseToast.showCoin && <CoinIcon className="w-4 h-4 text-white animate-pulse" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Global Announcement Banner */}
      <AnimatePresence>
        {globalAnnouncement && (
          <motion.div
            key={globalAnnouncement.id}
            initial={{ opacity: 0, y: -30, x: "-50%", scale: 0.95 * (isMobile ? 1 : uiScale) }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 * (isMobile ? 1 : uiScale) }}
            exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 * (isMobile ? 1 : uiScale) }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            style={{ transformOrigin: "top center" }}
            className="fixed top-20 md:top-6 left-1/2 bg-black/90 text-zinc-100 border border-white/10 rounded-3xl md:rounded-full py-2.5 px-5 md:py-2 md:px-6 shadow-[0_16px_45px_rgba(0,0,0,0.7)] backdrop-blur-md w-[92%] md:w-auto max-w-[430px] md:max-w-3xl z-[250] pointer-events-auto flex items-center justify-center gap-2 select-none"
          >
            <div className="flex items-center justify-center flex-col sm:flex-row gap-x-2 gap-y-1 text-center sm:text-left font-sans tracking-normal w-full break-words select-none">
              <div className="flex items-center justify-center shrink-0">
                <AdaptiveUsername
                  name={globalAnnouncement.senderName}
                  color={globalAnnouncement.senderColor}
                  effect={globalAnnouncement.senderNameEffect || "none"}
                  size="md"
                  isAdmin={globalAnnouncement.senderIsAdmin}
                  className="!p-0"
                />
                <span className="text-zinc-500 font-bold ml-1.5 select-none">:</span>
              </div>
              <p className="text-[13px] md:text-sm font-semibold leading-relaxed text-zinc-100 break-all sm:break-normal max-w-full">
                {globalAnnouncement.isBilingual
                  ? (language === "ru" ? globalAnnouncement.textRu : globalAnnouncement.textEn)
                  : globalAnnouncement.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(inGame || (roomInfo && playerId)) && (
        /* Active Minimal Grid Layout */
        <div className="w-full h-full relative flex flex-col select-none">
          
          {/* Main 3D Grid viewport */}
          {roomInfo && playerId && (
            <div className={`absolute inset-0 w-full h-full z-0 bg-[#090a0f] transition-all duration-[600ms] cubic-bezier(0.16,1,0.3,1) origin-center ${
              editingProfile ? "scale-[1.08] blur-[6px] brightness-[0.4] pointer-events-none" : "scale-100 blur-0 brightness-100"
            }`}>
              <GameCanvas
                key={currentRoomId || "lobby"}
                playerId={playerId}
                roomInfo={roomInfo}
                ws={wsRef.current}
                joystickRef={joystickVector}
                messages={chatMessages}
                graphicsQuality={graphicsQuality}
                avatarShopOpen={isAvatarShopOpen}
                avatars={loadedAvatars}
                uiScale={uiScale}
              />
            </div>
          )}

          {/* Top-Left controls container */}
          <div 
            className="absolute top-5 left-5 z-20 flex flex-col gap-4 items-start pointer-events-none transition-all duration-[400ms]"
            style={isMobile ? undefined : { transform: `scale(${uiScale})`, transformOrigin: "top left" }}
          >
            {/* Round action buttons */}
            <div className="flex gap-3 pointer-events-auto relative">
              <button
                onClick={() => setEditingProfile(prev => !prev)}
                className={`w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                  editingProfile
                    ? "bg-white text-black font-semibold"
                    : "bg-black/80 text-white hover:bg-neutral-800"
                }`}
                title="Settings"
              >
                <img 
                  src={settingsIconUrl} 
                  className={`w-5.5 h-5.5 md:w-[17px] md:h-[17px] transition-all object-contain ${
                    editingProfile ? "brightness-0" : "brightness-0 invert"
                  }`} 
                  alt="Settings" 
                  referrerPolicy="no-referrer"
                />
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsChatVisible(prev => !prev)}
                  className={`w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                    isChatVisible
                      ? "bg-white text-black font-semibold"
                      : "bg-black/80 text-white hover:bg-neutral-800"
                  }`}
                  title="Toggle Chat"
                >
                  <img 
                    src={chatIconUrl} 
                    className={`w-5.5 h-5.5 md:w-[17px] md:h-[17px] transition-all object-contain ${
                      isChatVisible ? "brightness-0" : "brightness-0 invert"
                    }`} 
                    alt="Chat" 
                    referrerPolicy="no-referrer"
                  />
                </button>
                {unreadCount > 0 && !isChatVisible && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] md:text-[9px] font-bold w-5 h-5 md:w-4 md:h-4 rounded-full flex items-center justify-center shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  if (isAvatarShopOpen) {
                    handleCloseShop();
                  } else {
                    handleOpenShop();
                  }
                }}
                className={`w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                  isAvatarShopOpen
                    ? "bg-white text-black font-semibold animate-pulse"
                    : "bg-black/80 text-white hover:bg-neutral-800"
                }`}
                title="Ателье аватаров"
              >
                <img 
                  src={avatarIconUrl} 
                  className={`w-5.5 h-5.5 md:w-[17px] md:h-[17px] transition-all object-contain ${
                    isAvatarShopOpen ? "brightness-0" : "brightness-0 invert"
                  }`} 
                  alt="Avatar Customizer" 
                  referrerPolicy="no-referrer"
                />
              </button>
            </div>

            {/* Mobile Mini Messages (only visible when chat hidden on mobile) */}
            {isMobile && !isChatVisible && miniMessages.length > 0 && (
              <div className="flex flex-col gap-1.5 w-full max-w-[280px]">
                <AnimatePresence>
                  {miniMessages.map(msg => {
                    const activePlayer = roomInfo?.players[msg.playerId];
                    const playerColor = activePlayer?.color ?? msg.playerColor;
                    const playerName = activePlayer?.name ?? msg.playerName;
                    return (
                      <motion.div
                        key={`mini-${msg.id}`}
                        initial={{ opacity: 0, x: -15, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="bg-black/70 backdrop-blur-sm text-white px-3.5 py-2.5 rounded-xl text-[11px] font-medium pointer-events-none shadow-md flex items-center gap-2 border border-white/5"
                      >
                        <span className="font-bold shrink-0" style={{ color: playerColor }}>{playerName}:</span>
                        <span className="truncate">{msg.text}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Desktop Chatbox below buttons */}
            <div className="hidden md:block">
              <AnimatePresence>
                {isChatVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: -15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="origin-top"
                  >
                    <ChatBox
                      messages={chatMessages}
                      onSendMessage={handleSendMessage}
                      onSendBilingualGlobal={handleSendBilingualGlobal}
                      currentPlayerId={playerId}
                      activePlayers={roomInfo?.players}
                      selfDecorFrame={equippedDecorFrame}
                      selfNameEffect={equippedEffect}
                      selfColor={profColor}
                      selfName={profName}
                      language={language}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile ChatBox (Bottom Drawer) - fixed and height-locked to prevent soft keyboard compression */}
          <div className="md:hidden fixed bottom-0 left-0 w-full z-40 pointer-events-none overflow-hidden">
            <AnimatePresence>
               {isChatVisible && (
                  <motion.div
                     initial={{ y: "100%" }}
                     animate={{ y: 0 }}
                     exit={{ y: "100%" }}
                     transition={{ 
                        type: "tween", 
                        ease: [0.16, 1, 0.3, 1], 
                        duration: 0.42 
                     }}
                     className="w-full pointer-events-auto"
                     style={{ 
                        height: mobileChatHeight ? `${mobileChatHeight}px` : "78vh",
                        willChange: "transform"
                     }}
                  >
                     <ChatBox 
                        messages={chatMessages} 
                        onSendMessage={handleSendMessage} 
                        currentPlayerId={playerId} 
                        onSendBilingualGlobal={handleSendBilingualGlobal}
                         className="w-full h-full rounded-b-none border-b-0" 
                        activePlayers={roomInfo?.players}
                        selfDecorFrame={equippedDecorFrame}
                        selfNameEffect={equippedEffect}
                        selfColor={profColor}
                        selfName={profName}
                        language={language}
                     />
                  </motion.div>
               )}
            </AnimatePresence>
          </div>

          {/* Virtual Dynamic / Floating Joystick for Mobile */}
          {isMobile && !editingProfile && !isChatVisible && (
            <DynamicJoystick joystickRef={joystickVector} />
          )}

          {/* Settings Overlay Modal */}
          <AnimatePresence>
            {editingProfile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center md:p-4 bg-black/80 md:backdrop-blur-sm pointer-events-auto"
              >
                {/* Copy success visual confirmation */}
                <AnimatePresence>
                  {inviteSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, x: "-50%" }}
                      animate={{ opacity: 1, y: 0, x: "-50%" }}
                      exit={{ opacity: 0, y: -20, x: "-50%" }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="absolute top-8 left-1/2 bg-emerald-500 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-55 flex items-center gap-2 border border-emerald-400/25 backdrop-blur-md whitespace-nowrap"
                    >
                      <Check className="w-4 h-4" />
                      <span>{language === "ru" ? "Ссылка скопирована!" : "Invite link copied!"}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  className="pointer-events-auto transition-all duration-[400ms] w-full h-full md:w-auto md:h-auto"
                  style={isMobile ? undefined : { transform: `scale(${uiScale})`, transformOrigin: "center" }}
                >
                  <motion.div
                    initial={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, scale: 0.95 }}
                    animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1 }}
                    exit={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, scale: 0.95 }}
                    transition={{ type: "tween", ease: "easeOut", duration: 0.25 }}
                    className="bg-zinc-950/95 backdrop-blur-2xl text-white flex flex-col gap-5 shadow-3xl w-full h-full md:h-[85vh] md:max-h-[640px] md:w-[92vw] md:max-w-[620px] p-6 md:p-8 rounded-none md:squircle-panel border-0 overflow-hidden fixed inset-0 md:relative"
                  >
                    {/* Header: Title and Tab Selection */}
                    <div className="shrink-0 flex flex-col gap-3">
                      <div className="flex bg-white/5 p-1.5 squircle-card gap-1 border-0">
                        <button
                          type="button"
                          onClick={() => setActiveOverlayTab("settings")}
                          className={`flex-1 py-2 text-center text-xs md:text-sm font-bold tracking-wider transition-all uppercase cursor-pointer border-0 ${
                            activeOverlayTab === "settings"
                              ? "bg-white text-black squircle-btn"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {t.settingsTab}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveOverlayTab("servers")}
                          className={`flex-1 py-2 text-center text-xs md:text-sm font-bold tracking-wider transition-all uppercase cursor-pointer border-0 ${
                            activeOverlayTab === "servers"
                              ? "bg-white text-black squircle-btn"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {t.serversTab}
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Container Content Body */}
                    <div className="flex-1 overflow-y-auto pr-1 pb-16 flex flex-col gap-6 custom-scrollbar">
                      {activeOverlayTab === "settings" ? (
                        <>
                          {/* SDK Auth status reminder */}
                          {sdkAuthWarning && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-2xl flex flex-col items-center justify-between gap-3 text-xs font-semibold backdrop-blur-md mb-2 shrink-0 animate-fade-in animate-pulse-subtle">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 shrink-0 text-yellow-500" />
                                <span className="text-left font-sans">{sdkAuthWarning}</span>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  const loggedUser = await platformSdk.login();
                                  if (loggedUser) {
                                    setProfName(loggedUser.name);
                                    if (loggedUser.avatarUrl) {
                                      setSdkAvatarUrl(loggedUser.avatarUrl);
                                    }
                                    const keysToLoad = [
                                      "avatar_coins", "owned_skins", "owned_trails", "owned_effects",
                                      "owned_decor_frames", "eq_skin", "eq_trail", "eq_effect", "eq_decor"
                                    ];
                                    const loadedSaveData = await platformSdk.loadData(keysToLoad);
                                    if (loadedSaveData) {
                                      if (loadedSaveData.avatar_coins !== undefined) setCoins(Number(loadedSaveData.avatar_coins));
                                      if (loadedSaveData.owned_skins) setOwnedSkins(loadedSaveData.owned_skins);
                                      if (loadedSaveData.owned_trails) setOwnedTrails(loadedSaveData.owned_trails);
                                      if (loadedSaveData.owned_effects) setOwnedEffects(loadedSaveData.owned_effects);
                                      if (loadedSaveData.owned_decor_frames) setOwnedDecorFrames(loadedSaveData.owned_decor_frames);
                                      if (loadedSaveData.eq_skin) setEquippedSkin(loadedSaveData.eq_skin);
                                      if (loadedSaveData.eq_trail) setEquippedTrail(loadedSaveData.eq_trail);
                                      if (loadedSaveData.eq_effect) setEquippedEffect(loadedSaveData.eq_effect);
                                      if (loadedSaveData.eq_decor) setEquippedDecorFrame(loadedSaveData.eq_decor);
                                    }
                                  }
                                }}
                                className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-black font-extrabold rounded-xl uppercase tracking-widest text-[10px] border-0 transition-all cursor-pointer"
                              >
                                {language === "ru" ? "Войти в аккаунт" : "Sign In to Save"}
                              </button>
                            </div>
                          )}

                          {/* Nickgroup / Customizer */}
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
                                {t.operatorConfig}
                              </span>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-semibold">
                                {t.nicknameLabel}
                              </label>
                              <div className="flex items-center gap-3">
                                 {/* Custom circle indicator with padding and full crown rendering without clipping */}
                                 <div className="relative shrink-0 flex items-center justify-center p-1.5 overflow-visible">
                                   <div 
                                     className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white select-none shrink-0 relative shadow-inner bg-cover bg-center"
                                     style={{ 
                                       backgroundColor: profColor,
                                       backgroundImage: sdkAvatarUrl ? `url(${sdkAvatarUrl})` : "none"
                                     }}
                                   >
                                     {!sdkAvatarUrl && (profName || "B").trim()[0].toUpperCase()}
                                     <AvatarFrame decorFrame={equippedDecorFrame} playerColor={profColor} />
                                   </div>
                                 </div>
                                <input
                                  type="text"
                                  value={profName}
                                  onChange={(e) => {
                                    setProfName(e.target.value.substring(0, 16));
                                    setAdminError(null);
                                  }}
                                  className="flex-1 bg-white/5 px-4 py-2.5 text-sm text-white squircle-card outline-none focus:bg-white/10 transition-all font-semibold border-0"
                                />
                              </div>
                            </div>

                            {/* Dynamic Administrator Authenticator Panel */}
                            <AnimatePresence>
                              {profName.trim().toUpperCase() === "NODE" && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0, marginTop: -8 }}
                                  animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                                  exit={{ opacity: 0, height: 0, marginTop: -8 }}
                                  transition={{ type: "spring", stiffness: 320, damping: 25 }}
                                  className="overflow-hidden flex flex-col gap-2 pt-3 mt-1"
                                >
                                  {isAdmin ? (
                                    <div className="flex flex-col gap-2">
                                      <div 
                                        className="flex items-center gap-2 p-3 squircle-card text-xs font-semibold border-0 transition-all duration-300"
                                        style={{
                                          backgroundColor: `${profColor}15`,
                                          color: profColor,
                                        }}
                                      >
                                        <VerifiedBadge className="w-4 h-4 shrink-0" color={profColor} />
                                        <span>{t.nodeAuthorized}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={handleClearCache}
                                        disabled={purgingCache}
                                        className="w-full py-2 bg-teal-600 hover:bg-teal-750 disabled:opacity-50 text-white squircle-btn border-0 text-[11px] font-bold uppercase tracking-wide transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md shrink-0 font-sans cursor-pointer"
                                      >
                                        {purgingCache ? (
                                          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                                        ) : (
                                          <span className="text-xs">⚡</span>
                                        )}
                                        {t.clearCacheBtn}
                                      </button>
                                      {purgeMessage && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -4 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          className={`text-[10px] font-semibold py-1.5 px-2 bg-black/40 rounded-lg flex items-center gap-1.5 mt-0.5 ${
                                            purgeMessage.isError ? "text-red-400" : "text-emerald-400 animate-pulse"
                                          }`}
                                        >
                                          <span>{purgeMessage.text}</span>
                                        </motion.div>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-semibold">
                                        {t.adminPasswordLabel}
                                      </label>
                                      <input
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => {
                                          setAdminPassword(e.target.value);
                                          setAdminError(null);
                                        }}
                                        placeholder={t.adminPasswordPlaceholder}
                                        className="bg-white/5 px-4 py-2.5 text-sm text-white squircle-card outline-none focus:bg-white/10 transition-all font-semibold border-0"
                                      />
                                      {adminError && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -4 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          className="text-[11px] font-bold text-red-400 flex items-center gap-1.5 mt-0.5 animate-pulse"
                                        >
                                          <AlertCircle className="w-3.5 h-3.5" />
                                          <span>{adminError}</span>
                                        </motion.div>
                                      )}
                                    </>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Graphics Quality Control Slider */}
                          <div className="flex flex-col gap-3 pt-4">
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
                                  {t.performanceHeader}
                                </span>
                                <span className="text-[11px] font-semibold text-zinc-300 mt-0.5">
                                  {t.graphicsQualityLabel}
                                </span>
                              </div>
                              <span className="text-[10px] px-2.5 py-1 bg-white/10 squircle-btn font-bold text-white uppercase tracking-wide">
                                {graphicsQuality === 1 && t.low}
                                {graphicsQuality === 2 && t.medium}
                                {graphicsQuality === 3 && t.high}
                                {graphicsQuality === 4 && t.ultra}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="4"
                              step="1"
                              value={graphicsQuality}
                              onChange={(e) => handleGraphicsChange(parseInt(e.target.value))}
                              className="w-full h-1 bg-white/10 accent-white rounded-lg cursor-pointer appearance-none"
                            />
                            <div className="flex justify-between text-[8px] text-zinc-500 font-bold px-0.5 uppercase leading-none mt-1">
                              <span>{t.low}</span>
                              <span>{t.medium}</span>
                              <span>{t.high}</span>
                              <span>{t.ultra}</span>
                            </div>
                          </div>

                          {/* Sound Volume Slider with dynamic mute indicators */}
                          <div className="flex flex-col gap-3 pt-4">
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
                                  {t.acousticsHeader}
                                </span>
                                <span className="text-[11px] font-semibold text-zinc-300 mt-0.5">
                                  {t.soundVolumeLabel}
                                </span>
                              </div>
                              <span className="text-xs font-mono font-bold text-zinc-400">{soundVolume}%</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/5 p-2 squircle-card border-0">
                              {soundVolume === 0 ? (
                                <VolumeX className="w-4 h-4 text-zinc-500 shrink-0" />
                              ) : soundVolume <= 33 ? (
                                <Volume1 className="w-4 h-4 text-zinc-400 shrink-0" />
                              ) : (
                                <Volume2 className="w-4 h-4 text-zinc-200 shrink-0" />
                              )}
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={soundVolume}
                                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                                onMouseUp={(e) => handleVolumeChangeComplete(parseInt((e.target as HTMLInputElement).value))}
                                onTouchEnd={(e) => handleVolumeChangeComplete(parseInt((e.target as HTMLInputElement).value))}
                                className="w-full h-1 bg-white/15 accent-white rounded-lg cursor-pointer appearance-none"
                              />
                            </div>
                          </div>

                          {/* Language Settings */}
                          <div className="flex flex-col gap-4 pt-4">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
                              {language === "ru" ? "Глобализация" : "Globalization"}
                            </span>
                            
                            {/* Interface Language Dropdown -> Arrow switcher */}
                            <div className="flex justify-between items-center bg-white/5 p-3 squircle-card border-0">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-semibold text-zinc-300">
                                  {t.languageSetting}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleLanguageChange(language === "ru" ? "en" : "ru")}
                                  className="w-8 h-8 rounded-full bg-[#121319] hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center font-bold text-sm text-zinc-400 hover:text-white cursor-pointer select-none"
                                >
                                  &lt;
                                </button>
                                <span className="text-xs font-bold min-w-[120px] text-center text-white select-none whitespace-nowrap flex items-center justify-center gap-2" style={{ fontFamily: '"Rubik", "Montserrat", "Nunito", sans-serif' }}>
                                  {language === "ru" ? (
                                    <>
                                      <svg className="w-4.5 h-3 rounded-sm border border-white/10 shrink-0" viewBox="0 0 3 2">
                                        <rect width="3" height="2" fill="#d52b1e" />
                                        <rect width="3" height="1.333" fill="#0039a6" />
                                        <rect width="3" height="0.667" fill="#fff" />
                                      </svg>
                                      <span>Русский </span><span style={{ fontWeight: 400 }}>(RU)</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4.5 h-3 rounded-sm border border-white/10 shrink-0" viewBox="0 0 7410 3900">
                                        <rect width="7410" height="3900" fill="#b22234" />
                                        <path d="M0,300H7410M0,900H7410M0,1500H7410M0,2100H7410M0,2700H7410M0,3300H7410" stroke="#fff" strokeWidth="300" />
                                        <rect width="2964" height="2100" fill="#3c3b6e" />
                                        <g fill="#fff">
                                          <circle cx="494" cy="350" r="100" />
                                          <circle cx="1482" cy="350" r="100" />
                                          <circle cx="2470" cy="350" r="100" />
                                          <circle cx="988" cy="700" r="100" />
                                          <circle cx="1976" cy="700" r="100" />
                                          <circle cx="494" cy="1050" r="100" />
                                          <circle cx="1482" cy="1050" r="100" />
                                          <circle cx="2470" cy="1050" r="100" />
                                          <circle cx="988" cy="1400" r="100" />
                                          <circle cx="1976" cy="1400" r="100" />
                                          <circle cx="494" cy="1750" r="100" />
                                          <circle cx="1482" cy="1750" r="100" />
                                          <circle cx="2470" cy="1750" r="100" />
                                        </g>
                                      </svg>
                                      <span>English (EN)</span>
                                    </>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleLanguageChange(language === "ru" ? "en" : "ru")}
                                  className="w-8 h-8 rounded-full bg-[#121319] hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center font-bold text-sm text-zinc-400 hover:text-white cursor-pointer select-none"
                                >
                                  &gt;
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Room Players list with invitation button */}
                          <div className="flex flex-col gap-3 pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
                                  {t.playerListHeader}
                                </span>
                                <span className="text-[11px] font-semibold text-zinc-300 mt-0.5">
                                  {t.currentServerSub}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={handleAdminKickAllPrompt}
                                    className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white transition text-[11px] font-bold squircle-btn uppercase tracking-wide flex items-center gap-1.5 cursor-pointer border-0 active:scale-95"
                                  >
                                    Kick All
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={handleCopyInviteLink}
                                  className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 transition text-[11px] font-bold squircle-btn uppercase tracking-wide flex items-center gap-1.5 cursor-pointer border-0 text-teal-300 hover:text-white"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  {t.copyInviteBtn}
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-0.5 pt-3">
                              {roomInfo && Object.values(roomInfo.players).length > 0 ? (
                                Object.values(roomInfo.players as Record<string, Player>).map((p: Player) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between p-2.5 bg-white/5 squircle-card border-0"
                                  >
                                    <div className="flex items-center gap-3 pr-2 truncate flex-1">
                                      {friends.includes(p.name) && (
                                        <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0 select-none" />
                                      )}
                                      <div className="relative shrink-0 flex items-center justify-center p-1">
                                        {p.decorFrame === "crown" && (
                                          <span className="decor-crown-badge !text-[8px] !top-[-6px]">👑</span>
                                        )}
                                        <div
                                          className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs select-none shadow-inner text-white relative"
                                          style={{ backgroundColor: p.color }}
                                        >
                                          {p.name.charAt(0).toUpperCase()}
                                          
                                          {/* Frame ring overlays */}
                                          <AvatarFrame decorFrame={p.decorFrame} playerColor={p.color} />
                                          
                                          
                                        </div>
                                      </div>

                                      <span className="text-xs font-semibold text-zinc-200 truncate max-w-[150px] flex items-center gap-1">
                                        <AdaptiveUsername
                                          name={p.name}
                                          effect={p.nameEffect || "none"}
                                          color={p.color}
                                          size="sm"
                                          isAdmin={p.isAdmin}
                                        />
                                        {p.id === playerId && <span className="text-[10.0px] text-zinc-500 font-normal ml-1.5 shrink-0">{t.youLabel}</span>}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {p.id !== playerId && (
                                        (() => {
                                          const isFriend = friends.includes(p.name);
                                          const isPending = sentRequests.includes(p.id);

                                          if (isFriend) {
                                            return (
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveFriend(p.name)}
                                                className="px-2.5 py-1.5 bg-zinc-800/60 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 rounded-xl text-[10px] font-bold uppercase transition border border-white/5 hover:border-red-500/20 shrink-0 cursor-pointer whitespace-nowrap"
                                              >
                                                {t.removeFriendBtn}
                                              </button>
                                            );
                                          } else if (isPending) {
                                            return (
                                              <button
                                                type="button"
                                                disabled
                                                className="px-2.5 py-1.5 bg-zinc-800/60 text-zinc-500 rounded-xl text-[10px] font-bold uppercase cursor-not-allowed border border-white/5 shrink-0 select-none whitespace-nowrap"
                                              >
                                                {t.pendingFriend}
                                              </button>
                                            );
                                          } else {
                                            return (
                                              <button
                                                type="button"
                                                onClick={() => handleSendFriendRequest(p.id)}
                                                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 rounded-xl text-[10px] font-bold uppercase transition border border-white/5 shrink-0 cursor-pointer whitespace-nowrap"
                                              >
                                                {t.addFriendBtn}
                                              </button>
                                            );
                                          }
                                        })()
                                      )}
                                      {isAdmin && p.id !== playerId && (
                                        <button
                                          type="button"
                                          onClick={() => handleAdminKickPlayerPrompt(p.id, p.name)}
                                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white squircle-btn border-0 text-[10px] font-bold uppercase transition active:scale-95 ml-1.5 shrink-0"
                                        >
                                          Kick
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-xs text-zinc-500 font-medium">
                                  {language === "ru" ? "Сервер пуст..." : "Server is empty..."}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Danger Zone: Reset Account */}
                          <div className="flex flex-col gap-3.5 pt-4 border-t border-white/10 shrink-0 select-none">
                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest font-mono">
                              {language === "ru" ? "⚠️ Опасная зона" : "⚠️ Danger Zone"}
                            </span>
                            <div className="flex flex-col gap-2.5 p-3.5 bg-red-950/10 hover:bg-red-950/20 squircle-card border border-red-900/20 rounded-2xl">
                              <span className="text-[11px] text-zinc-300 font-semibold leading-relaxed">
                                {language === "ru" 
                                  ? "Полный сброс прогресса, монет и купленных предметов. Прогресс очистится, и вы вернетесь в игру как новый игрок." 
                                  : "Complete reset of progress, coins, and purchased items. Your progress will be cleared, and you will enter as a new player."}
                              </span>
                              
                              {resetConfirm ? (
                                <div className="flex flex-col gap-3 mt-1">
                                  <span className="text-[10px] font-black uppercase text-red-400 tracking-wider text-center">
                                    {language === "ru" ? "Потяните ползунок вправо до конца для удаления!" : "DRAG THE SLIDER TO THE END TO DELETE!"}
                                  </span>

                                  <SwipeToReset 
                                    language={language}
                                    onStartReset={() => {
                                      localStorage.clear();
                                      window.location.reload();
                                    }}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => setResetConfirm(false)}
                                    className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-extrabold uppercase text-[10.5px] rounded-xl cursor-pointer transition active:scale-95 text-center border-0"
                                  >
                                    {language === "ru" ? "Отмена" : "Cancel"}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setResetConfirm(true)}
                                  className="w-full py-2.5 bg-red-600/30 hover:bg-red-600 text-white font-extrabold uppercase text-[10.5px] rounded-xl cursor-pointer transition active:scale-95 text-center border-0"
                                >
                                  {language === "ru" ? "Сбросить аккаунт" : "Reset Account"}
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Servers (Separate Section Page) tab */
                        <div className="flex flex-col gap-5">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono">{t.availableRooms}</span>
                            <span className="text-[11px] text-zinc-400 mt-1">{t.serversSubtitleDesc}</span>
                          </div>

                          {/* Create Private Server & Administrative Shutdown Buttons */}
                          <div className="flex flex-col gap-2.5 shrink-0">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={handleAdminShutdownAllPrompt}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white squircle-btn border-0 text-xs font-bold uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shrink-0 font-sans"
                              >
                                Shut down all
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setIsCreatePrivateModalOpen(true)}
                              className="w-full py-3 bg-white text-black hover:bg-zinc-200 squircle-btn border-0 text-xs font-bold uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shrink-0 font-sans"
                            >
                              {t.createPrivateRoomAction}
                            </button>
                          </div>

                          {/* Filter Inputs block */}
                          <div className="flex flex-col gap-2 bg-white/5 p-3 squircle-card border-0">
                            <div className="relative">
                              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                              <input
                                type="text"
                                placeholder={t.searchRoomPlaceholder}
                                value={roomSearch}
                                onChange={(e) => setRoomSearch(e.target.value)}
                                className="w-full bg-black/20 pl-9 pr-4 py-2 text-xs text-white squircle-btn border-0 outline-none focus:bg-black/40 transition-all font-medium placeholder-zinc-500"
                              />
                            </div>
                            <div className="flex gap-1">
                              {(["all", "available", "full"] as const).map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setRoomFilter(tag)}
                                  className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider squircle-btn border-0 transition duration-200 cursor-pointer ${
                                    roomFilter === tag
                                      ? "bg-white text-black font-bold font-sans"
                                      : "bg-white/5 text-zinc-400 hover:bg-white/10 font-sans"
                                  }`}
                                >
                                  {tag === "all" ? t.filterAll : tag === "available" ? t.filterAvailable : t.filterFull}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 1. SECTION: ACTIVE PLAYERS LOBBIES */}
                          <div className="flex flex-col gap-2.5">
                            <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              {t.activeServersHeading} ({availableRooms.length})
                            </h3>
                            <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-0.5 scrollbar-thin">
                              {(() => {
                                const filtered = availableRooms.filter((room) => {
                                  const matchesSearch = room.name.toLowerCase().includes(roomSearch.toLowerCase()) || room.id.toLowerCase().includes(roomSearch.toLowerCase());
                                  const count = room.activePlayers;
                                  if (roomFilter === "available") return matchesSearch && count < 5;
                                  if (roomFilter === "full") return matchesSearch && count >= 5;
                                  return matchesSearch;
                                });

                                if (filtered.length === 0) {
                                  return (
                                    <div className="text-center py-6 flex flex-col items-center gap-1 text-zinc-500 bg-white/[0.02] squircle-card border-0">
                                      <AlertCircle className="w-5 h-5 text-zinc-600" />
                                      <span className="text-[11px] font-semibold font-sans">{t.noServersFound}</span>
                                    </div>
                                  );
                                }

                                return filtered.map((room) => {
                                  const isCurrent = room.id === currentRoomId;
                                  const isFull = room.activePlayers >= 5;
                                  return (
                                    <div
                                      key={room.id}
                                      className="flex items-center justify-between p-3 bg-white/5 squircle-card border-0 hover:bg-white/10 transition-all gap-4"
                                    >
                                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Server className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                          <span className="text-xs font-bold text-white truncate max-w-[130px]">{room.name}</span>
                                          {room.mode === "only_me" && (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-red-500/15 text-red-300 border border-red-500/30 font-bold squircle-btn uppercase tracking-wide">
                                              🔒 {language === "ru" ? "Для себя" : "Only me"}
                                            </span>
                                          )}
                                          {room.mode === "friends" && (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold squircle-btn uppercase tracking-wide">
                                              👥 {language === "ru" ? "Для друзей" : "Friends"}
                                            </span>
                                          )}
                                          <span className={`text-[10px] px-1.5 py-0.5 font-mono font-bold squircle-btn bg-black/40 ${
                                            isFull ? "text-red-400 border-0" : "text-emerald-400 border-0"
                                          }`}>
                                            {room.activePlayers} / 5
                                          </span>
                                        </div>

                                        {/* Player Indicators */}
                                        <div className="flex gap-1.5 items-center flex-wrap pt-0.5">
                                          {room.players && room.players.length > 0 ? (
                                            room.players.map((p: any) => (
                                              <div key={p.id} className="relative shrink-0 flex items-center justify-center p-1" title={p.name}>
                                                {p.decorFrame === "crown" && (
                                                  <span className="decor-crown-badge !text-[6px] !top-[-4.5px]">👑</span>
                                                )}
                                                <div
                                                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[7.5px] font-black text-white shadow-md border border-black/30 relative animate-fade-in"
                                                  style={{ backgroundColor: p.color }}
                                                >
                                                  {p.name.charAt(0).toUpperCase()}
                                                  
                                                  {/* Frame micro ring overlays */}
                                                  <AvatarFrame decorFrame={p.decorFrame} playerColor={p.color} />
                                                  
                                                  
                                                </div>
                                              </div>
                                            ))
                                          ) : (
                                            <span className="text-[10px] text-zinc-500 font-medium font-sans">{t.noPlayers}</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Connection actions */}
                                      {isCurrent ? (
                                        <span className="text-[10px] px-2.5 py-1.5 squircle-btn font-black uppercase bg-white/15 text-white/90 border-0 flex items-center gap-1 shrink-0 font-sans">
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          {t.youAreHere}
                                        </span>
                                      ) : isFull ? (
                                        <button
                                          type="button"
                                          disabled
                                          className="px-3 py-1.5 bg-zinc-850 text-zinc-600 text-[10px] font-bold uppercase squircle-btn cursor-not-allowed shrink-0 border-0 font-sans"
                                        >
                                          {t.fullServer}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleTryJoinRoom(room)}
                                          className="px-3.5 py-1.5 bg-white text-black hover:bg-neutral-200 text-[10px] font-bold uppercase squircle-btn border-0 tracking-wider active:scale-95 transition-all shrink-0 cursor-pointer font-sans"
                                        >
                                          {t.enterActionBtn}
                                        </button>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Fixed action buttons: Exit and Continue */}
                    <div className="shrink-0 flex flex-col gap-3 pt-4">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={saveProfileChanges}
                          className="flex-1 py-3 bg-white text-black hover:bg-zinc-200 squircle-btn border-0 text-xs font-bold uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {t.continueBtn}
                        </button>
                        <button
                          type="button"
                          onClick={handleLeaveGame}
                          className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold squircle-btn border-0 text-xs tracking-wider uppercase transition-all cursor-pointer"
                        >
                          {t.exitBtn}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Create Private Server Modal */}
          <AnimatePresence>
            {isCreatePrivateModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans pointer-events-auto"
              >
                <div
                  className="pointer-events-auto transition-all duration-[400ms] w-full max-w-sm flex items-center justify-center"
                  style={isMobile ? undefined : { transform: `scale(${uiScale})`, transformOrigin: "center" }}
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="bg-zinc-950 squircle-panel-lg border-0 p-8 w-full shadow-2xl flex flex-col gap-5 text-white"
                  >
                    <div className="flex flex-col gap-1.5 text-left">
                      <h3 className="text-sm font-black uppercase tracking-wider text-white">
                        {t.createPrivateRoomAction}
                      </h3>
                      <span className="text-zinc-400 text-xs">
                        {t.setServerOptions}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                          {t.serverNameLabel}
                        </label>
                        <input
                          type="text"
                          placeholder={t.newServerName}
                          value={newPrivateServerName}
                          onChange={(e) => setNewPrivateServerName(e.target.value.substring(0, 24))}
                          className="bg-white/5 px-4 py-2.5 text-xs text-white squircle-btn border-0 outline-none focus:bg-white/10 transition"
                          autoFocus
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-left font-sans">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                          {language === "ru" ? "Режим приватности" : "Privacy Mode"}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setPrivacyMode("only_me")}
                            className={`py-2.5 px-1.5 text-[10px] font-bold uppercase tracking-wider squircle-btn border-0 transition cursor-pointer ${
                              privacyMode === "only_me"
                                ? "bg-red-500 text-white font-extrabold shadow-lg shadow-red-500/10"
                                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {language === "ru" ? "Только я" : "Only Me"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrivacyMode("friends")}
                            className={`py-2.5 px-1.5 text-[10px] font-bold uppercase tracking-wider squircle-btn border-0 transition cursor-pointer ${
                              privacyMode === "friends"
                                ? "bg-sky-500 text-white font-extrabold shadow-lg shadow-sky-500/10"
                                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {language === "ru" ? "Друзья" : "Friends"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrivacyMode("all")}
                            className={`py-2.5 px-1.5 text-[10px] font-bold uppercase tracking-wider squircle-btn border-0 transition cursor-pointer ${
                              privacyMode === "all"
                                ? "bg-emerald-500 text-white font-extrabold shadow-lg shadow-emerald-500/10"
                                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {language === "ru" ? "Для всех" : "Everyone"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 mt-2">
                      <button
                        type="button"
                        onClick={handleCreateServerAction}
                        disabled={!newPrivateServerName.trim()}
                        className={`flex-1 py-2.5 squircle-btn border-0 text-xs font-bold uppercase tracking-wider transition ${
                          newPrivateServerName.trim()
                            ? "bg-white text-black hover:bg-zinc-200 cursor-pointer"
                            : "bg-white/15 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        {t.createBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatePrivateModalOpen(false);
                          setNewPrivateServerName("");
                          setPrivacyMode("all");
                        }}
                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 squircle-btn border-0 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        {t.cancelBtn}
                      </button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Join Error / Access Denied Modal */}
          <AnimatePresence>
            {isJoinErrorModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  className="bg-zinc-950 squircle-panel border-0 p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 text-white text-center"
                >
                  <div className="flex flex-col gap-2 items-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-1">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-red-400">
                      {language === "ru" ? "Доступ ограничен" : "Access Restricted"}
                    </h3>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      {joinErrorMessage}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsJoinErrorModalOpen(false);
                      setJoinErrorMessage("");
                    }}
                    className="w-full py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider squircle-btn border-0 transition-all cursor-pointer"
                  >
                    {t.backBtn}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top-Right Scoreboard with toggle support and smooth slide animations */}
          <AnimatePresence>
            {isScoreboardVisible && roomInfo && (
              <div
                className="absolute top-5 right-5 z-10 pointer-events-none transition-all duration-[400ms]"
                style={isMobile ? undefined : { transform: `scale(${uiScale})`, transformOrigin: "top right" }}
              >
                <motion.div
                  initial={{ opacity: 0, x: 40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <Scoreboard
                    roomName={roomInfo.name}
                    players={roomInfo.players}
                    currentPlayerId={playerId}
                    onClose={() => setIsScoreboardVisible(false)}
                    language={language}
                    friendsList={friends}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Admin Action Prompt Modal */}
          <AnimatePresence>
            {adminActionModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  className="bg-zinc-950 squircle-panel border-0 p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 text-white"
                >
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-sm font-black uppercase tracking-wider text-red-500">
                      {adminActionModal.type === "shutdown" && "Завершение работы"}
                      {adminActionModal.type === "kick_all" && "Кик всех игроков"}
                      {adminActionModal.type === "kick_player" && `Кикнуть игрока ${adminActionModal.targetPlayerName}`}
                    </h3>
                    <span className="text-zinc-400 text-xs">
                      Вы собираетесь выполнить административное действие. Пожалуйста, укажите причину для игроков:
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="Укажите причину..."
                    value={adminReasonText}
                    onChange={(e) => setAdminReasonText(e.target.value.substring(0, 100))}
                    className="bg-white/5 px-4 py-2.5 text-xs text-white squircle-btn border-0 outline-none focus:bg-white/10 transition"
                    autoFocus
                  />

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={submitAdminAction}
                      disabled={!adminReasonText.trim()}
                      className={`flex-1 py-2.5 squircle-btn border-0 text-xs font-bold uppercase tracking-wider transition ${
                        adminReasonText.trim()
                          ? "bg-red-650 hover:bg-red-700 text-white cursor-pointer"
                          : "bg-red-600/20 text-red-300/35 cursor-not-allowed"
                      }`}
                    >
                      Подтвердить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminActionModal(null);
                        setAdminReasonText("");
                      }}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 squircle-btn border-0 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player Kicked Warning Notice Screen */}
          <AnimatePresence>
            {adminKickedMessage !== null && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 font-sans text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-zinc-950/85 p-8 max-w-sm squircle-panel border-0 shadow-3xl flex flex-col items-center gap-5"
                >
                  <div className="w-12 h-12 rounded-full bg-red-600/10 border-0 flex items-center justify-center animate-pulse">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <h2 className="text-base font-black uppercase tracking-wider text-red-400 font-sans">
                      {language === "ru" ? "Вы были кикнуты администратором" : "You have been kicked by the administrator"}
                    </h2>
                    <p className="text-zinc-400 text-xs px-2 leading-relaxed font-sans">
                      {adminKickedMessage ? (
                        language === "ru" ? `Причина: "${adminKickedMessage}"` : `Reason: "${adminKickedMessage}"`
                      ) : (
                        language === "ru" ? "Причина не указана" : "No reason specified"
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="w-full py-3 bg-white hover:bg-zinc-200 text-black squircle-btn border-0 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-md font-sans"
                  >
                    {language === "ru" ? "Переподключиться" : "Reconnect"}
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Admin Room Shutdown Confirmation Screen */}
          <AnimatePresence>
            {adminShutdownMessage !== null && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 font-sans text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-zinc-950/85 p-8 max-w-sm squircle-panel border-0 shadow-3xl flex flex-col items-center gap-5"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-600/10 border-0 flex items-center justify-center animate-pulse">
                    <Server className="w-6 h-6 text-amber-500" />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <h2 className="text-base font-black uppercase tracking-wider text-amber-500 font-sans">
                      {language === "ru" ? "Комната закрыта администратором" : "Room closed by administrator"}
                    </h2>
                    <p className="text-zinc-400 text-xs px-2 leading-relaxed font-sans">
                      {adminShutdownMessage ? (
                        language === "ru" ? `Причина: "${adminShutdownMessage}"` : `Reason: "${adminShutdownMessage}"`
                      ) : (
                        language === "ru" ? "Причина не указана" : "No reason specified"
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="w-full py-3 bg-white hover:bg-zinc-200 text-black squircle-btn border-0 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-md font-sans"
                  >
                    {language === "ru" ? "Переподключиться" : "Reconnect"}
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Avatar Customizer / Shop Slide Panel */}
          <AnimatePresence>
            {isAvatarShopOpen && (
              <motion.div
                key="avatar-shop-panel"
                initial={isMobile ? { y: "100%", opacity: 1 } : { x: "100%", opacity: 1 }}
                animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
                exit={isMobile ? { y: "100%", opacity: 1 } : { x: "100%", opacity: 1 }}
                transition={{ type: "tween", ease: "easeOut", duration: 0.25 }}
                className={`fixed z-40 bg-black/80 backdrop-blur-md flex flex-col shadow-2xl overflow-hidden font-sans ${
                  isMobile
                    ? "bottom-0 left-0 w-full h-[55%] border-t border-white/10 rounded-t-[28px]"
                    : "top-0 right-0 h-full w-[440px] border-l border-white/5"
                }`}
              >
                {/* Header Section */}
                <div className="py-2.5 px-4 md:p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-transparent">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={shopIconUrl} 
                      className="w-7 h-7 object-contain select-none pointer-events-none" 
                      alt="Shop" 
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-white">
                        {language === "ru" ? "Ателье Аватаров" : "Avatar Atelier"}
                      </h3>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
                        {language === "ru" ? "Кастомизация" : "Customization"}
                      </p>
                    </div>
                  </div>

                  {/* Coin balance with + pill to buy */}
                  <div className="flex items-center gap-2">
                    <div className="bg-white/10 pl-3 pr-2.5 py-1.5 rounded-full border border-white/20 flex items-center gap-2 shadow-[0_0_12px_rgba(255,255,255,0.08)] shrink-0 select-none">
                      <span className="text-white font-extrabold text-xs flex items-center gap-1">
                        <CoinIcon className="w-4 h-4 text-white" />
                        {coins}
                      </span>
                      <button
                        onClick={() => setIsBuyCoinsModalOpen(true)}
                        className="w-5 h-5 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 text-white transition cursor-pointer select-auto"
                        title={language === "ru" ? "Пополнить баланс" : "Refill Balance"}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tab select slider */}
                <div className="px-4 py-2 border-b border-white/5 bg-black/20 shrink-0 flex gap-1">
                  {([
                    { id: "skin", label: language === "ru" ? "Скин" : "Skin" },
                    { id: "name", label: language === "ru" ? "Стиль" : "Style" },
                    { id: "decor", label: language === "ru" ? "Рамка" : "Frame" }
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setShopTab(tab.id)}
                      className={`flex-1 py-1.5 text-center text-[10px] md:text-xs font-black uppercase tracking-wider transition squircle-panel cursor-pointer ${
                        shopTab === tab.id
                          ? "bg-white text-black"
                          : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>



                {/* Items grid container */}
                {(() => {
                  // Auto-migrate legacy equipped local storage statuses
                  if (equippedSkin === "default") {
                    setTimeout(() => setEquippedSkin("Avatar_1.png"), 0);
                  } else if (equippedSkin === "newavatar") {
                    setTimeout(() => setEquippedSkin("Avatar_2.png"), 0);
                  }

                  const SKINS_CATALOG = loadedAvatars
                    .filter(avatar => avatar.flags !== "admin" || isAdmin)
                    .map(avatar => {
                      const id = avatar.path;
                      const label = language === "ru" ? avatar.name_ru : avatar.name_en;
                      
                      return {
                        id,
                        label,
                        img: `https://cdn.jsdelivr.net/gh/calloradj-png/NodeAvatars@main/${avatar.path}`,
                        cost: avatar.cost,
                        flags: avatar.flags
                      };
                    });

                  const EFFECTS_CATALOG = [
                    { id: "none", label: language === "ru" ? "Обычный" : "Normal", cost: 0 },
                    { id: "glow", label: language === "ru" ? "Золотое сияние" : "Golden Glow", cost: 120 },
                    { id: "neon", label: language === "ru" ? "🔋 Неон с помехами" : "🔋 Glitched Neon", cost: 150 },
                    { id: "glitch", label: language === "ru" ? "💥 Кибер Глич" : "💥 Cyber Glitch", cost: 220 },
                    { id: "slime", label: language === "ru" ? "🤢 Жидкая слизь" : "🤢 Liquid Slime", cost: 250 },
                    { id: "rainbow", label: language === "ru" ? "🌈 Прыгающая радуга" : "🌈 Bouncing Rainbow", cost: 280 },
                    { id: "lava", label: language === "ru" ? "🔥 Лава и искры" : "🔥 Lava Sparks", cost: 300 },
                    { id: "pixel", label: language === "ru" ? "👾 Пиксельная вывеска" : "👾 Pixel Sign", cost: 320 },
                    { id: "runes", label: language === "ru" ? "🔮 Стол зачарования" : "🔮 Enchanting Table", cost: 350 },
                    { id: "hacker", label: language === "ru" ? "👽 Хакер-матрица" : "👽 Hacker Matrix", cost: 380 },
                    { id: "gold", label: language === "ru" ? "✨ Золотой блеск" : "✨ Golden Shimmer", cost: 450 }
                  ];

                  const dynamicFrames = loadedFrames.map(frame => {
                    const id = frame.path;
                    const label = language === "ru" ? frame.name_ru : frame.name_en;
                    return {
                      id,
                      label,
                      cost: frame.cost
                    };
                  });

                  const DECOR_CATALOG = [
                    { id: "none", label: language === "ru" ? "Без рамки" : "No Frame", cost: 0 },
                    { id: "color_ring", label: language === "ru" ? "Цветной обод" : "Color Rim", cost: 120 },
                    { id: "candy_cane", label: language === "ru" ? "Карамельная трость" : "Candy Cane", cost: 180 },
                    ...dynamicFrames
                  ];

                  // Calculate selected unowned items to buy
                  const unownedSelectedItems: Array<{ category: "skin" | "effect" | "decor"; id: string; label: string; cost: number }> = [];

                  // Treat cost: 0 and "default" skin (now Avatar_1.png) as auto-owned
                  const isSkinOwnedLocal = (id: string) => {
                    return isSkinOwnedHelper(id);
                  };

                  const isDecorOwnedLocal = (id: string) => {
                    const found = DECOR_CATALOG.find(d => d.id === id);
                    if (found && found.cost === 0) return true;
                    return id === "none" || ownedDecorFrames.includes(id);
                  };

                  if (!isSkinOwnedLocal(equippedSkin)) {
                    const item = SKINS_CATALOG.find(s => s.id === equippedSkin);
                    if (item && item.cost > 0) {
                      unownedSelectedItems.push({ category: "skin", id: equippedSkin, label: item.label, cost: item.cost });
                    }
                  }
                  if (!ownedEffects.includes(equippedEffect)) {
                    const item = EFFECTS_CATALOG.find(e => e.id === equippedEffect);
                    if (item && item.cost > 0) {
                      unownedSelectedItems.push({ category: "effect", id: equippedEffect, label: item.label, cost: item.cost });
                    }
                  }
                  if (!isDecorOwnedLocal(equippedDecorFrame)) {
                    const item = DECOR_CATALOG.find(d => d.id === equippedDecorFrame);
                    if (item && item.cost > 0) {
                      unownedSelectedItems.push({ category: "decor", id: equippedDecorFrame, label: item.label, cost: item.cost });
                    }
                  }

                  const totalCost = unownedSelectedItems.reduce((acc, curr) => acc + curr.cost, 0);

                  return (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0 bg-transparent flex flex-col gap-3">
                        {shopTab === "skin" && (
                          <div className="flex flex-col gap-2.5">
                            <div className="grid grid-cols-2 gap-3.5 pb-4">
                              {SKINS_CATALOG.map((s) => {
                                const isOwned = isSkinOwnedLocal(s.id);
                                const isEquipped = equippedSkin === s.id;
                                
                                return (
                                  <motion.div 
                                    key={s.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setEquippedSkin(s.id)}
                                    className="aspect-[10/13] w-full flex flex-col justify-between p-3.5 bg-zinc-900/50 hover:bg-zinc-900/70 relative transition duration-200 rounded-[24px] select-none cursor-pointer group shadow-lg"
                                  >
                                    {/* Favorite / Heart button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFavorites(prev => 
                                          prev.includes(s.id) 
                                            ? prev.filter(tid => tid !== s.id) 
                                            : [...prev, s.id]
                                        );
                                      }}
                                      className="absolute top-2.5 left-2.5 p-1.5 rounded-full bg-black/45 hover:bg-black/60 border border-white/5 text-white transition backdrop-blur-md shadow-sm z-20 flex items-center justify-center pointer-events-auto"
                                    >
                                      <Heart 
                                        className={`w-3.5 h-3.5 transition ${
                                          favorites.includes(s.id) 
                                            ? "fill-rose-500 text-rose-500 scale-110" 
                                            : "text-zinc-300 hover:text-white"
                                        }`} 
                                      />
                                    </button>

                                    {/* Selected Checkmark badge, no outlines */}
                                    {isEquipped && (
                                      <div className="absolute top-2.5 right-2.5 bg-white text-zinc-950 w-5.5 h-5.5 rounded-full shadow-lg flex items-center justify-center z-20">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      </div>
                                    )}

                                    {/* Avatar Graphic */}
                                    <div className="flex-1 flex items-center justify-center relative overflow-visible group my-1 px-1.5">
                                      <img 
                                        src={s.img} 
                                        className="w-full max-h-[85px] object-contain scale-[1.3] group-hover:scale-[1.45] transition-all duration-300" 
                                        referrerPolicy="no-referrer" 
                                        alt={s.label} 
                                      />
                                    </div>
                                    
                                    <div className="text-center mt-1 z-10 shrink-0">
                                      <h4 className="text-[11px] font-black tracking-wide text-white font-sans">{s.label}</h4>
                                    </div>
                                    
                                    <div className="mt-2.5 z-10 w-full shrink-0">
                                      {isOwned ? (
                                        isEquipped ? (
                                          <div className="w-full py-2 bg-white/20 text-white font-extrabold uppercase text-[11px] rounded-xl text-center shadow-inner">
                                            {language === "ru" ? "Активен" : "Equipped"}
                                          </div>
                                        ) : (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEquippedSkin(s.id);
                                            }}
                                            className="w-full py-2 bg-white/10 hover:bg-white/20 text-zinc-100 font-bold uppercase tracking-wider text-[11px] rounded-xl cursor-pointer transition active:scale-95"
                                          >
                                            {language === "ru" ? "Выбрать" : "Equip"}
                                          </button>
                                        )
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            buyOrEquipItem("skin", s.id, s.cost);
                                          }}
                                          className="w-full py-2 bg-white hover:bg-zinc-100 text-zinc-950 font-black uppercase tracking-wider text-[11px] rounded-xl cursor-pointer transition active:scale-95 flex items-center justify-center gap-1 shadow-md"
                                        >
                                          <CoinIcon className="w-3.5 h-3.5 text-zinc-950" />
                                          <span>{s.cost}</span>
                                        </button>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {shopTab === "name" && (
                          <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3 pb-3">
                              {EFFECTS_CATALOG.map((e) => {
                                const isOwned = ownedEffects.includes(e.id);
                                const isEquipped = equippedEffect === e.id;
                                
                                return (
                                  <motion.div 
                                    key={e.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setEquippedEffect(e.id)}
                                    className="w-full flex flex-col justify-between p-3.5 bg-zinc-900/50 hover:bg-zinc-900/70 relative transition duration-200 rounded-[24px] select-none cursor-pointer group shadow-lg"
                                  >
                                    {/* Favorite / Heart button */}
                                    <button
                                      type="button"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        setFavorites(prev => 
                                          prev.includes(e.id) 
                                            ? prev.filter(tid => tid !== e.id) 
                                            : [...prev, e.id]
                                        );
                                      }}
                                      className="absolute top-2.5 left-2.5 p-1.5 rounded-full bg-black/45 hover:bg-black/60 border border-white/5 text-white transition backdrop-blur-md shadow-sm z-20 flex items-center justify-center pointer-events-auto"
                                    >
                                      <Heart 
                                        className={`w-3.5 h-3.5 transition ${
                                          favorites.includes(e.id) 
                                            ? "fill-rose-500 text-rose-500 scale-110" 
                                            : "text-zinc-300 hover:text-white"
                                        }`} 
                                      />
                                    </button>

                                    {/* Selected Checkmark badge, no outlines */}
                                    {isEquipped && (
                                      <div className="absolute top-2.5 right-2.5 bg-white text-zinc-950 w-5.5 h-5.5 rounded-full shadow-lg flex items-center justify-center z-20">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      </div>
                                    )}

                                    {/* Preview demo block */}
                                    <div className="flex-1 flex flex-col items-center justify-center my-4 overflow-visible">
                                      <h4 className="text-[10px] font-black text-white/40 uppercase tracking-wider mb-2">{e.label}</h4>
                                      <div className="p-1.5 overflow-visible">
                                        <AdaptiveUsername
                                          name={profName || "Operator"}
                                          effect={e.id}
                                          color={profColor}
                                          size="sm"
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="mt-2.5 z-10 w-full shrink-0">
                                      {isOwned ? (
                                        isEquipped ? (
                                          <div className="w-full py-2 bg-white/20 text-white font-extrabold uppercase text-[11px] rounded-xl text-center shadow-inner">
                                            {language === "ru" ? "Активен" : "Equipped"}
                                          </div>
                                        ) : (
                                          <button
                                            onClick={(ev) => {
                                              ev.stopPropagation();
                                              setEquippedEffect(e.id);
                                            }}
                                            className="w-full py-2 bg-white/10 hover:bg-white/20 text-zinc-100 font-bold uppercase tracking-wider text-[11px] rounded-xl cursor-pointer transition active:scale-95"
                                          >
                                            {language === "ru" ? "Выбрать" : "Equip"}
                                          </button>
                                        )
                                      ) : (
                                        <button
                                          onClick={(ev) => {
                                            ev.stopPropagation();
                                            buyOrEquipItem("effect", e.id, e.cost);
                                          }}
                                          className="w-full py-2 bg-white hover:bg-zinc-100 text-zinc-950 font-black uppercase tracking-wider text-[11px] rounded-xl cursor-pointer transition active:scale-95 flex items-center justify-center gap-1 shadow-md"
                                        >
                                          <CoinIcon className="w-3.5 h-3.5 text-zinc-950" />
                                          <span>{e.cost}</span>
                                        </button>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>

                            {/* Tone Picker container inside Style category */}
                            <div className="mt-1 flex flex-col gap-2 bg-zinc-900/40 p-3.5 rounded-[22px] border border-white/5 shadow-inner">
                              <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider select-none">
                                {language === "ru" ? "Тон имени" : "Name Tone"}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {["#ff5964", "#35a7ff", "#38b000", "#ffb703", "#9d4edd", "#f72585", "#00f0ff", "#ffffff"].map((col) => (
                                  <button
                                    key={`prof-col-${col}`}
                                    onClick={() => {
                                      setProfColor(col);
                                      playCoinChime();
                                    }}
                                    className="w-6.5 h-6.5 rounded-full border-2 transition cursor-pointer flex items-center justify-center active:scale-95"
                                    style={{ 
                                      backgroundColor: col, 
                                      borderColor: profColor === col ? "white" : "transparent"
                                    }}
                                  >
                                    {profColor === col && (
                                      <Check className="w-3 h-3 text-black drop-shadow" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {shopTab === "decor" && (
                          <div className="flex flex-col gap-2.5">
                            <div className="grid grid-cols-2 gap-3 pb-4">
                              {DECOR_CATALOG.map((d) => {
                                const isOwned = isDecorOwnedLocal(d.id);
                                const isEquipped = equippedDecorFrame === d.id;
                                
                                return (
                                  <motion.div 
                                    key={d.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setEquippedDecorFrame(d.id)}
                                    className="w-full flex flex-col justify-between p-3.5 bg-zinc-900/50 hover:bg-zinc-900/70 relative transition duration-200 rounded-[24px] select-none cursor-pointer group shadow-lg"
                                  >
                                    {/* Favorite / Heart button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFavorites(prev => 
                                          prev.includes(d.id) 
                                            ? prev.filter(tid => tid !== d.id) 
                                            : [...prev, d.id]
                                        );
                                      }}
                                      className="absolute top-2.5 left-2.5 p-1.5 rounded-full bg-black/45 hover:bg-black/60 border border-white/5 text-white transition backdrop-blur-md shadow-sm z-20 flex items-center justify-center pointer-events-auto"
                                    >
                                      <Heart 
                                        className={`w-3.5 h-3.5 transition ${
                                          favorites.includes(d.id) 
                                            ? "fill-rose-500 text-rose-500 scale-110" 
                                            : "text-zinc-300 hover:text-white"
                                        }`} 
                                      />
                                    </button>

                                    {/* Selected Checkmark badge, no outlines */}
                                    {isEquipped && (
                                      <div className="absolute top-2.5 right-2.5 bg-white text-zinc-950 w-5.5 h-5.5 rounded-full shadow-lg flex items-center justify-center z-20">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </div>
                                    )}

                                    {/* Profile Frame visual preview */}
                                    <div className="flex-1 flex flex-col items-center justify-center my-3.5 overflow-visible">
                                      <div className="relative flex-shrink-0 flex items-center justify-center p-1.5 overflow-visible mb-2.5">
                                        <div 
                                          className="w-8.5 h-8.5 rounded-full flex items-center justify-center relative text-white font-extrabold text-[10px] shadow-inner bg-cover bg-center"
                                          style={{ 
                                            backgroundColor: profColor,
                                            backgroundImage: sdkAvatarUrl ? `url(${sdkAvatarUrl})` : "none"
                                          }}
                                        >
                                          {!sdkAvatarUrl && (profName || "B").trim()[0].toUpperCase()}
                                          <AvatarFrame decorFrame={d.id} playerColor={profColor} />
                                        </div>
                                      </div>
                                      <h4 className="text-[10px] font-black text-center text-white font-sans">{d.label}</h4>
                                    </div>
                                    
                                    <div className="mt-2.5 z-10 w-full shrink-0">
                                      {isOwned ? (
                                        isEquipped ? (
                                          <div className="w-full py-2 bg-white/20 text-white font-extrabold uppercase text-[11px] rounded-xl text-center shadow-inner">
                                            {language === "ru" ? "Активен" : "Equipped"}
                                          </div>
                                        ) : (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEquippedDecorFrame(d.id);
                                            }}
                                            className="w-full py-2 bg-white/10 hover:bg-white/20 text-zinc-100 font-bold uppercase tracking-wider text-[11px] rounded-xl cursor-pointer transition active:scale-95"
                                          >
                                            {language === "ru" ? "Выбрать" : "Equip"}
                                          </button>
                                        )
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            buyOrEquipItem("decor", d.id, d.cost);
                                          }}
                                          className="w-full py-2 bg-white hover:bg-zinc-100 text-zinc-950 font-black uppercase tracking-wider text-[11px] rounded-xl cursor-pointer transition active:scale-95 flex items-center justify-center gap-1 shadow-md"
                                        >
                                          <CoinIcon className="w-3.5 h-3.5 text-zinc-950" />
                                          <span>{d.cost}</span>
                                        </button>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Section holding either checkout total pricing or normal return */}
                      <div className="p-3.5 border-t border-white/5 bg-black/45 flex flex-col gap-2 shrink-0 select-none overflow-hidden min-h-[75px] justify-center">
                        <AnimatePresence mode="wait">
                          {unownedSelectedItems.length > 0 ? (
                            <motion.div
                              key="checkout-footer"
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.2 }}
                              className="flex flex-col gap-1.5 w-full animate-pulse-once"
                            >
                              {/* Summary information */}
                              <div className="flex items-center justify-between px-1 text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">
                                <span>{language === "ru" ? "Финальная цена:" : "Total price:"}</span>
                                <span className="flex items-center gap-1 text-white">
                                  {unownedSelectedItems.length} {language === "ru" ? "поз." : "items"}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {/* Cancel Left Button */}
                                <button
                                  onClick={handleCloseShop}
                                  className="w-1/3 py-3 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer transition active:scale-95 text-center"
                                >
                                  {language === "ru" ? "Отмена" : "Cancel"}
                                </button>

                                {/* Pay & Buy Right Button */}
                                <button
                                  onClick={() => {
                                    if (coins >= totalCost) {
                                      // Purchase immediately
                                      setCoins(prev => prev - totalCost);
                                      
                                      const newOwnedSkins = [...ownedSkins];
                                      const newOwnedEffects = [...ownedEffects];
                                      const newOwnedDecor = [...ownedDecorFrames];
                                      
                                      unownedSelectedItems.forEach(item => {
                                        if (item.category === "skin" && !newOwnedSkins.includes(item.id)) {
                                          newOwnedSkins.push(item.id);
                                        } else if (item.category === "effect" && !newOwnedEffects.includes(item.id)) {
                                          newOwnedEffects.push(item.id);
                                        } else if (item.category === "decor" && !newOwnedDecor.includes(item.id)) {
                                          newOwnedDecor.push(item.id);
                                        }
                                      });
                                      
                                      setOwnedSkins(newOwnedSkins);
                                      setOwnedEffects(newOwnedEffects);
                                      setOwnedDecorFrames(newOwnedDecor);
                                      
                                      // Update snapshot memory so they remain equipped!
                                      setLastSavedCosmetics({
                                        skin: equippedSkin,
                                        effect: equippedEffect,
                                        decor: equippedDecorFrame
                                      });
                                      
                                      playCoinChime();
                                      
                                      const isRu = language === "ru";
                                      const text = isRu 
                                        ? `Приобретено товаров: ${unownedSelectedItems.length} за ${totalCost}` 
                                        : `Successfully purchased ${unownedSelectedItems.length} items for ${totalCost}`;
                                      setPurchaseToast({ text, showCoin: true });
                                      setTimeout(() => setPurchaseToast(null), 3000);
                                    } else {
                                      // Switch/redirect to currency purchase
                                      setIsBuyCoinsModalOpen(true);
                                    }
                                  }}
                                  className="flex-1 py-3 bg-white hover:bg-zinc-100 text-black rounded-xl text-[10.5px] font-black uppercase tracking-widest cursor-pointer transition shadow-lg flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                  <span>{language === "ru" ? "Купить" : "Buy"}</span>
                                  <div className="bg-zinc-950 px-2 py-0.5 rounded-full flex items-center gap-1 text-white font-black font-mono text-[9px] scale-90">
                                    <CoinIcon className="w-3 h-3 text-white" />
                                    <span>{totalCost}</span>
                                  </div>
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.button
                              key="back-footer"
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.2 }}
                              onClick={handleCloseShop}
                              className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition shadow-md font-sans active:scale-95"
                            >
                              {language === "ru" ? "Вернуться в игру" : "Return to Game"}
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* SQUIRCLE CENTER COINS PURCHASE OVERLAY MODAL */}
          <AnimatePresence>
            {isBuyCoinsModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none"
              >
                <div 
                  className="pointer-events-auto transition-all duration-[400ms] flex items-center justify-center"
                  style={isMobile ? undefined : { transform: `scale(${uiScale})`, transformOrigin: "center" }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", damping: 30, stiffness: 350 }}
                    style={{ backgroundImage: `url(${marketCoverUrl})` }}
                    className="relative w-[370px] h-[450px] bg-cover bg-center bg-no-repeat rounded-[32px] squircle-panel shadow-[0_30px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col justify-end pb-5 px-5 border-0"
                  >
                    {/* Close button - absolute in top corner */}
                    <button
                      onClick={() => setIsBuyCoinsModalOpen(false)}
                      className="absolute top-4 right-4 text-zinc-300 hover:text-white transition cursor-pointer p-1.5 rounded-full bg-black/35 hover:bg-black/55 z-20 select-auto outline-none border-0"
                    >
                      <X className="w-5 h-5 pointer-events-none" />
                    </button>

                    {/* Title Section - slightly above the buttons, left-aligned, not caps */}
                    <div className="w-full flex flex-col items-start justify-center mb-4 px-2 select-none">
                      <h3 className="text-[20px] font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] font-sans">
                        {language === "ru" ? "Пополнение баланса" : "Refill balance"}
                      </h3>
                    </div>

                    {/* Buttons Row - Side by side (unrounded images) */}
                    <div className="w-full flex items-center justify-center gap-4">
                      {/* AD Watch Button */}
                      <button
                        onClick={() => {
                          setIsBuyCoinsModalOpen(false);
                          startWatchingAd();
                        }}
                        className="w-[150px] h-[215px] active:scale-95 hover:scale-[1.025] transition-all cursor-pointer select-auto focus:outline-none flex-shrink-0 bg-transparent border-0 p-0"
                      >
                        <img
                          src={language === "ru" ? adButtonRuUrl : adButtonEnUrl}
                          alt="Watch Promo Ad (+25)"
                          className="w-full h-full object-contain pointer-events-none rounded-none"
                          referrerPolicy="no-referrer"
                        />
                      </button>

                      {/* Pay Purchase Button */}
                      <button
                        onClick={() => {
                          setIsBuyCoinsModalOpen(false);
                          setCoins(prev => prev + 1000); // +1K as requested!
                          playCoinChime();
                          const isRu = language === "ru";
                          const text = isRu ? "Получено +1000" : "Received +1000";
                          setPurchaseToast({ text, showCoin: true });
                          setTimeout(() => setPurchaseToast(null), 3500);
                        }}
                        className="w-[150px] h-[215px] active:scale-95 hover:scale-[1.025] transition-all cursor-pointer select-auto focus:outline-none flex-shrink-0 bg-transparent border-0 p-0"
                      >
                        <img
                          src={language === "ru" ? passButtonRuUrl : passButtonEnUrl}
                          alt="Purchase Pack (+1K)"
                          className="w-full h-full object-contain pointer-events-none rounded-none"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    </div>

                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Simulated Video Ad Overlay (Fully Animated) */}
          <AnimatePresence>
            {isWatchingAd && activeAd && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/98 p-6 select-none cursor-wait">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="max-w-md w-full bg-[#0d0e12] p-8 border border-white/10 rounded-[28px] shadow-3xl text-center flex flex-col items-center gap-6"
                >
                  {/* Rotating video simulation widget */}
                  <div className="relative w-20 h-20 flex items-center justify-center bg-emerald-500/5 rounded-full border border-emerald-500/20">
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                    <Tv className="w-8 h-8 text-emerald-400" />
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] text-zinc-500 font-extrabold tracking-widest uppercase font-mono text-emerald-500">
                      {language === "ru" ? "РЕКЛАМНЫЙ СПОНСОР" : "AD SPONSOR"}
                    </span>
                    <h4 className="text-xl font-sans tracking-tight font-black text-white">{activeAd.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans italic px-4">"{activeAd.slogan}"</p>
                  </div>

                  {/* Real interactive Progress Bar */}
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 max-w-[280px]">
                    <motion.div 
                      key={`progress-${adCountdown}`}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 4, ease: "linear" }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase font-sans tracking-wide">
                    <span>
                      {language === "ru" 
                        ? `Вознаграждение поступит через ${adCountdown} c.` 
                        : `Reward arrives in ${adCountdown}s.`}
                    </span>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Admin Room Shutdown Confirmation Screen */}
          <AnimatePresence>
            {adminShutdownMessage !== null && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 font-sans text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-zinc-950/85 p-8 max-w-sm rounded-[24px] border border-white/10 shadow-3xl flex flex-col items-center gap-5"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-600/10 border border-amber-500/20 flex items-center justify-center animate-pulse">
                    <Server className="w-6 h-6 text-amber-500" />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <h2 className="text-base font-black uppercase tracking-wider text-amber-500 font-sans">
                      {language === "ru" ? "Комната закрыта администратором" : "Room closed by administrator"}
                    </h2>
                    <p className="text-zinc-400 text-xs px-2 leading-relaxed font-sans">
                      {adminShutdownMessage ? (
                        language === "ru" ? `Причина: "${adminShutdownMessage}"` : `Reason: "${adminShutdownMessage}"`
                      ) : (
                        language === "ru" ? "Причина не указана" : "No reason specified"
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="w-full py-3 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-md font-sans"
                  >
                    {language === "ru" ? "Переподключиться" : "Reconnect"}
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Friend requests container */}
          <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-[calc(100vw-3rem)] sm:w-[320px] max-w-full pointer-events-none select-none">
            <AnimatePresence>
              {incomingRequests.map((req) => (
                <motion.div
                  key={req.senderId}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="bg-zinc-950/90 border border-white/10 p-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md pointer-events-auto"
                >
                  <div className="relative shrink-0 flex items-center justify-center p-0.5">
                    {req.senderDecorFrame === "crown" && (
                      <span className="decor-crown-badge !text-[6px] !top-[-4px]">👑</span>
                    )}
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs select-none text-white relative shadow-inner animate-fade-in"
                      style={{ backgroundColor: req.senderColor }}
                    >
                      {req.senderName.charAt(0).toUpperCase()}
                      <AvatarFrame decorFrame={req.senderDecorFrame} playerColor={req.senderColor} />
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] text-indigo-400 font-extrabold uppercase font-mono leading-none tracking-wider select-none">
                      {t.incomingFriendRequest}
                    </span>
                    <span className="text-xs text-white font-bold truncate mt-0.5 leading-tight">
                      {req.senderName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => handleAcceptFriendRequest(req.senderId)}
                      className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white flex items-center justify-center cursor-pointer border-0 transition-all active:scale-90"
                      title={language === "ru" ? "Принять" : "Accept"}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeclineFriendRequest(req.senderId)}
                      className="w-7 h-7 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white flex items-center justify-center cursor-pointer border-0 transition-all active:scale-90"
                      title={language === "ru" ? "Отклонить" : "Decline"}
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>
      )}

      {/* Immersive Beautiful Connection & Loading Screen Overlay */}
      <AnimatePresence>
        {showOverlayActual && (
          <motion.div
            key={errorMsg ? "error" : "connecting_screen"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 font-sans select-none overflow-hidden bg-black"
          >
            {/* Custom candy cane CSS sliding animations */}
            <style>{`
              @keyframes candy-cane-slide {
                from { background-position: 0 0; }
                to { background-position: 1.5rem 0; }
              }
              .candy-cane-bar {
                background-color: #ffffff !important;
                background-image: linear-gradient(
                  45deg,
                  rgba(0, 0, 0, 0.15) 25%,
                  transparent 25%,
                  transparent 50%,
                  rgba(0, 0, 0, 0.15) 50%,
                  rgba(0, 0, 0, 0.15) 75%,
                  transparent 75%,
                  transparent
                ) !important;
                background-size: 1.5rem 1.5rem !important;
                animation: candy-cane-slide 1s linear infinite !important;
              }
            `}</style>

            {/* Immersive fullscreen background blur and darken of Cover.jpg */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <img 
                src={coverJpgUrl} 
                alt="Background blurred cover" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=640&auto=format&fit=crop";
                }}
                className="w-full h-full object-cover filter blur-lg scale-110 opacity-65 select-none"
              />
              <div className="absolute inset-0 bg-[#06070a]/40" />
            </div>

            {/* Centered clean Cover Image & Game Info (No panel background) */}
            <div 
              className="flex flex-col gap-5 w-full max-w-sm md:max-w-md z-10 relative pointer-events-auto"
              style={isMobile ? undefined : { transform: `scale(${uiScale})`, transformOrigin: 'center' }}
            >
              {/* 16:9 Game Cover Artwork (Cover Image) - Crisp, bright, fully visible without panel */}
              <div className="w-full aspect-[16/9] relative squircle-panel overflow-hidden border border-white/10 group bg-neutral-900">
                <img 
                  src={coverJpgUrl} 
                  alt="Game Cover" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to a stunning cyberpunk neon scene if Cover.jpg is empty/unreadable
                    e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=640&auto=format&fit=crop";
                  }}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 select-none pointer-events-none" 
                />
              </div>

              {/* Game branding & title left-aligned below the cover image */}
              <div className="flex flex-col gap-1 text-left px-1">
                <h1 className="text-3xl font-extrabold tracking-wider text-white uppercase select-none font-sans">
                  {language === "ru" ? "Робо Арена" : "Robo Arena"}
                </h1>
                <p className="text-[11px] text-neutral-400 font-sans tracking-widest uppercase select-none font-semibold">
                  {language === "ru" ? "СЕТЕВАЯ МУЛЬТИПЛЕЕРНАЯ ПЕСОЧНИЦА" : "ONLINE MULTIPLAYER SANDBOX"}
                </p>
              </div>

              {/* Action/Error handlers right underneath */}
              <div className="w-full mt-1">
                {errorMsg ? (
                  /* Error block */
                  <div className="flex flex-col items-start gap-4 py-1 w-full animate-fade-in">
                    <div className="flex items-center gap-2 text-red-500">
                      <Terminal className="w-5 h-5 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest font-mono">
                        {language === "ru" ? "Ошибка подключения" : "Connection Failure"}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-400 text-left leading-relaxed font-sans px-1">
                      {errorMsg}
                    </span>
                    <button
                      onClick={() => {
                        setErrorMsg(null);
                        window.location.reload();
                      }}
                      className="w-full mt-1.5 py-4 bg-white hover:bg-neutral-200 active:scale-95 text-xs font-bold text-black squircle-btn border-0 transition-all duration-200 uppercase tracking-widest cursor-pointer font-sans text-center shadow-lg"
                    >
                      {t.retryConnect}
                    </button>
                  </div>
                ) : (!connecting && !inGame) && (
                  /* Lobby / Fallback Play control button */
                  <div className="flex flex-col gap-3.5 py-1 w-full">
                    <button
                      onClick={handlePlayButtonClick}
                      className="w-full py-4 bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-black text-xs squircle-btn border-0 tracking-widest transition-all duration-200 cursor-pointer font-sans uppercase text-center shadow-lg"
                    >
                      {language === "ru" ? "ИГРАТЬ" : "PLAY GAME"}
                    </button>

                    {sdkAuthWarning && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-2xl flex flex-col items-center justify-between gap-3 text-xs font-semibold backdrop-blur-md animate-pulse-subtle">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 shrink-0 text-yellow-500 animate-pulse" />
                          <span className="text-left font-sans">{sdkAuthWarning}</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const loggedUser = await platformSdk.login();
                            if (loggedUser) {
                              setProfName(loggedUser.name);
                              if (loggedUser.avatarUrl) {
                                setSdkAvatarUrl(loggedUser.avatarUrl);
                              }
                              const keysToLoad = [
                                "avatar_coins", "owned_skins", "owned_trails", "owned_effects",
                                "owned_decor_frames", "eq_skin", "eq_trail", "eq_effect", "eq_decor"
                              ];
                              const loadedSaveData = await platformSdk.loadData(keysToLoad);
                              if (loadedSaveData) {
                                if (loadedSaveData.avatar_coins !== undefined) setCoins(Number(loadedSaveData.avatar_coins));
                                if (loadedSaveData.owned_skins) setOwnedSkins(loadedSaveData.owned_skins);
                                if (loadedSaveData.owned_trails) setOwnedTrails(loadedSaveData.owned_trails);
                                if (loadedSaveData.owned_effects) setOwnedEffects(loadedSaveData.owned_effects);
                                if (loadedSaveData.owned_decor_frames) setOwnedDecorFrames(loadedSaveData.owned_decor_frames);
                                if (loadedSaveData.eq_skin) setEquippedSkin(loadedSaveData.eq_skin);
                                if (loadedSaveData.eq_trail) setEquippedTrail(loadedSaveData.eq_trail);
                                if (loadedSaveData.eq_effect) setEquippedEffect(loadedSaveData.eq_effect);
                                if (loadedSaveData.eq_decor) setEquippedDecorFrame(loadedSaveData.eq_decor);
                              }
                            }
                          }}
                          className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-black font-extrabold rounded-xl uppercase tracking-widest text-[10.5px] border-0 transition-all cursor-pointer"
                        >
                          {language === "ru" ? "ВОЙТИ В АККАУНТ YANDEX" : "SIGN IN TO YANDEX ACCOUNT"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Spinner and active connecting status left-aligned above the bottom progress bar */}
            {connecting && (
              <div className="absolute bottom-6 left-6 md:left-8 flex items-center gap-3.5 z-40 pointer-events-none text-white/90">
                <div className="w-4 h-4 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                <span className="text-[11px] font-bold tracking-widest uppercase font-sans select-none">
                  {language === "ru" ? "ПОДКЛЮЧЕНИЕ..." : "CONNECTING..."}
                </span>
              </div>
            )}

            {/* Premium full-width white candy cane progress bar at the absolute bottom of page */}
            {loadingProgress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 w-full h-2 bg-neutral-950/40 z-50 overflow-hidden pointer-events-none">
                <motion.div 
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="h-full bg-white candy-cane-bar shadow-[0_0_15px_rgba(255,255,255,0.7)]"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

