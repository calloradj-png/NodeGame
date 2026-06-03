import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Reply, X, Globe, Megaphone } from "lucide-react";
import { ChatMessage, Player } from "../types";
import { translations, Language } from "../translations";
import { motion } from "motion/react";
import AdaptiveUsername from "./AdaptiveUsername";
import AvatarFrame from "./AvatarFrame";
import VerifiedBadge from "./VerifiedBadge";

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, replyTo?: ChatMessage["replyTo"]) => void;
  currentPlayerId?: string | null;
  className?: string;
  activePlayers?: Record<string, Player>;
  selfDecorFrame?: string;
  selfNameEffect?: string;
  selfColor?: string;
  selfName?: string;
  language?: Language;
  onToggleTranslation?: (msgId: string) => void;
  onSendBilingualGlobal?: (textRu: string, textEn: string) => void;
}

export default function ChatBox({ 
  messages, 
  onSendMessage, 
  currentPlayerId, 
  className = "", 
  activePlayers,
  selfDecorFrame,
  selfNameEffect,
  selfColor,
  selfName,
  language = "ru",
  onToggleTranslation,
  onSendBilingualGlobal
}: ChatBoxProps) {
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showAdminBilingualOverlay, setShowAdminBilingualOverlay] = useState(false);
  const [bilingualRu, setBilingualRu] = useState("");
  const [bilingualEn, setBilingualEn] = useState("");
  const isLocalPlayerAdmin = !!(currentPlayerId && activePlayers?.[currentPlayerId]?.isAdmin);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const t = translations[language];

  // Spam protection state
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const sentTimestampsRef = useRef<number[]>([]);
  const cooldownUntilRef = useRef<number>(0);

  // Countdown effect for visual anti-spam warning
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, cooldownUntilRef.current - Date.now());
      if (remaining <= 0) {
        setCooldownRemaining(0);
        clearInterval(interval);
      } else {
        setCooldownRemaining(remaining / 1000);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const handleReplyClick = (targetId: string) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    setHighlightedMessageId(targetId);
    
    // Calculate relative scrolling position inside the custom scroll container to prevent page-level jumping
    const targetEl = document.getElementById(`chat-msg-${targetId}`);
    if (targetEl && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      
      const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
      const targetScrollTop = relativeTop - (containerRect.height / 2) + (targetRect.height / 2);
      
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth"
      });
    }
    
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1200);
  };

  // Sync scroll on message update & reply toggle
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth"
        });
      }, 50);
    }
  }, [messages, replyingTo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || cooldownRemaining > 0) return;

    const now = Date.now();
    const tenSecsAgo = now - 10000;

    // Filter list to keep only messages within last 10s
    sentTimestampsRef.current = sentTimestampsRef.current.filter(t => t > tenSecsAgo);
    sentTimestampsRef.current.push(now);

    // If 5 or more messages sent in last 10s, activate spam filter/cooldown
    if (sentTimestampsRef.current.length >= 5) {
      cooldownUntilRef.current = now + 10000;
      setCooldownRemaining(10);
    }

    let replyData = undefined;
    if (replyingTo) {
      replyData = {
        id: replyingTo.id,
        playerName: replyingTo.playerName,
        text: replyingTo.text,
        playerColor: replyingTo.playerColor,
      };
    }

    onSendMessage(text, replyData);
    setText("");
    setReplyingTo(null);
  };

  const hasText = text.trim().length > 0;

  return (
    <div 
      className={`flex flex-col bg-black/80 backdrop-blur-md overflow-hidden pointer-events-auto text-white shadow-2xl border border-white/5 relative ${
        className.includes("rounded-b-none") 
          ? "rounded-t-[28px] md:squircle-panel rounded-b-none" 
          : "squircle-panel"
      } ${className || "w-[315px] h-[215px]"}`}
    >
      {/* Scrollable container with native momentum scrolling */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Scroll Content standard child element, padding bottom to prevent cut-off */}
        <div className="px-3 md:px-4 pt-4 pb-4 flex flex-col">
          {messages.length === 0 ? (
            <div className="text-xs md:text-sm text-zinc-500 font-medium italic text-center py-8">
              {t.noTransmissionsTitle}
            </div>
          ) : (
            messages.map((msg, index) => {
              const isSelf = msg.playerId === currentPlayerId;
              const isPrevFromSamePlayer = index > 0 && messages[index - 1].playerId === msg.playerId;
              const isNextFromSamePlayer = index < messages.length - 1 && messages[index + 1].playerId === msg.playerId;
              const showSenderDetails = !isPrevFromSamePlayer;
              const showAvatar = !isNextFromSamePlayer;

              // Minimal gap for same user, larger gap for different users as requested
              const marginTopClass = showSenderDetails ? "mt-[12px] md:mt-[10px]" : "mt-[2px]";

              return (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  isSelf={isSelf}
                  showSenderDetails={showSenderDetails}
                  showAvatar={showAvatar}
                  marginTopClass={marginTopClass}
                  onReply={setReplyingTo}
                  onReplyClick={handleReplyClick}
                  isHighlighted={highlightedMessageId === msg.id}
                  activePlayers={activePlayers}
                  selfDecorFrame={selfDecorFrame}
                  selfNameEffect={selfNameEffect}
                  selfColor={selfColor}
                  selfName={selfName}
                  language={language}
                  onToggleTranslation={onToggleTranslation}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Reply Preview Action Bar - Made significantly more transparent */}
      {replyingTo && (
        <div className="px-3.5 py-2 md:px-3 md:py-1.5 bg-neutral-950/20 backdrop-blur-sm border-t border-white/5 flex items-center justify-between gap-1.5 text-xs shrink-0">
          <div className="flex items-center gap-1 truncate border-l-2 pl-2" style={{ borderColor: replyingTo.playerColor || "#ffffff" }}>
            <Reply className="w-3.5 h-3.5 md:w-3 md:h-3 text-neutral-400 shrink-0" />
            <div className="truncate flex flex-col text-left">
              <span className="font-bold text-[11px] md:text-[9.5px]" style={{ color: replyingTo.playerColor }}>
                {t.replyTo.replace("{name}", replyingTo.playerName)}
              </span>
              <span className="text-zinc-400 truncate text-[10.5px] md:text-[9px] max-w-[200px]">
                {replyingTo.text}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-2.5 md:p-2 bg-black/40 flex gap-2 items-center border-t border-white/5 z-10 shrink-0">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={cooldownRemaining > 0}
          placeholder={
            cooldownRemaining > 0 
              ? t.antiSpamPlaceholder.replace("{time}", cooldownRemaining.toFixed(1))
              : replyingTo 
                ? t.typeReplyPlaceholder 
                : t.messagePlaceholder
          }
          maxLength={100}
          className={`flex-1 bg-white/5 px-3.5 py-2 md:px-3 md:py-1.5 text-[15px] md:text-xs text-white rounded-xl outline-none placeholder-neutral-600 focus:bg-white/10 transition-all font-sans ${
            cooldownRemaining > 0 
              ? "border border-amber-500/40 bg-amber-500/5 text-amber-200/80 cursor-not-allowed placeholder-amber-500/50" 
              : ""
          }`}
        />
        {isLocalPlayerAdmin && (
          <button
            type="button"
            onClick={() => setShowAdminBilingualOverlay(true)}
            className="w-8.5 h-8.5 md:w-7 md:h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95"
            title={language === "ru" ? "Глобальное объявление" : "Global Announcement"}
            id="admin-global-btn"
          >
            <Megaphone className="w-4.5 h-4.5 md:w-3.5 md:h-3.5 stroke-[2]" />
          </button>
        )}
        <button
          type="submit"
          className={`w-8.5 h-8.5 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
            hasText && cooldownRemaining <= 0
              ? "bg-white text-black hover:bg-neutral-200 active:scale-90"
              : "bg-white/10 text-neutral-500 cursor-not-allowed"
          }`}
          disabled={!hasText || cooldownRemaining > 0}
        >
          <ArrowUp className="w-4.5 h-4.5 md:w-3.5 md:h-3.5 stroke-[2.5]" />
        </button>
      </form>
 
      {/* Admin Bilingual Overlay */}
      {showAdminBilingualOverlay && (
        <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md flex flex-col z-30 p-4 border border-white/10 rounded-[28px] squircle-panel">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10 shrink-0">
            <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2 font-sans">
              <Megaphone className="w-4 h-4 text-blue-400" />
              {language === "ru" ? "Глобальное сообщение" : "Global Announcement"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowAdminBilingualOverlay(false);
                setBilingualRu("");
                setBilingualEn("");
              }}
              className="text-zinc-500 hover:text-white transition rounded-full hover:bg-white/10 p-1 cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
 
          <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto mb-2 pr-0.5 pb-2">
            {/* Russian Language Input */}
            <div className="flex flex-col gap-1 text-left">
              <span className="text-[10px] md:text-[9.5px] font-bold text-blue-400 uppercase tracking-wider font-sans flex items-center gap-1.5">
                <svg className="w-4 h-2.5 rounded-sm border border-white/10 shrink-0" viewBox="0 0 3 2">
                  <rect width="3" height="2" fill="#d52b1e" />
                  <rect width="3" height="1.333" fill="#0039a6" />
                  <rect width="3" height="0.667" fill="#fff" />
                </svg>
                {language === "ru" ? "Русский" : "Russian"}
              </span>
              <textarea
                value={bilingualRu}
                onChange={(e) => setBilingualRu(e.target.value)}
                placeholder={language === "ru" ? "Текст объявления..." : "Announcement text..."}
                maxLength={150}
                rows={2}
                className="w-full bg-white/5 border-none outline-none ring-0 focus:ring-0 focus:outline-none rounded-xl px-2.5 py-1.5 text-[12.5px] md:text-xs text-white placeholder-zinc-650 focus:bg-white/10 transition resize-none font-sans"
              />
            </div>
 
            {/* English Language Input */}
            <div className="flex flex-col gap-1 text-left">
              <span className="text-[10px] md:text-[9.5px] font-bold text-blue-400 uppercase tracking-wider font-sans flex items-center gap-1.5">
                <svg className="w-4 h-2.5 rounded-sm border border-white/10 shrink-0" viewBox="0 0 7410 3900">
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
                {language === "ru" ? "Английский (English)" : "English"}
              </span>
              <textarea
                value={bilingualEn}
                onChange={(e) => setBilingualEn(e.target.value)}
                placeholder={language === "ru" ? "Text in English..." : "Announcement text..."}
                maxLength={150}
                rows={2}
                className="w-full bg-white/5 border-none outline-none ring-0 focus:ring-0 focus:outline-none rounded-xl px-2.5 py-1.5 text-[12.5px] md:text-xs text-white placeholder-zinc-655 focus:bg-white/10 transition resize-none font-sans"
              />
            </div>
          </div>
 
          <div className="flex items-center gap-2 pt-1 border-t border-white/5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowAdminBilingualOverlay(false);
                setBilingualRu("");
                setBilingualEn("");
              }}
              className="flex-1 py-1.5 rounded-lg text-[11px] md:text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              {language === "ru" ? "Отмена" : "Cancel"}
            </button>
            <button
              type="button"
              disabled={!bilingualRu.trim() || !bilingualEn.trim()}
              onClick={() => {
                if (bilingualRu.trim() && bilingualEn.trim()) {
                  if (onSendBilingualGlobal) {
                    onSendBilingualGlobal(bilingualRu.trim(), bilingualEn.trim());
                  }
                  setShowAdminBilingualOverlay(false);
                  setBilingualRu("");
                  setBilingualEn("");
                }
              }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] md:text-xs font-semibold transition-all cursor-pointer ${
                bilingualRu.trim() && bilingualEn.trim()
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95"
                  : "bg-blue-950/40 text-blue-800/60 cursor-not-allowed"
              }`}
            >
              {language === "ru" ? "Отправить" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface MessageItemProps {
  key?: string | number;
  msg: ChatMessage;
  isSelf: boolean;
  showSenderDetails: boolean;
  showAvatar: boolean;
  marginTopClass: string;
  onReply: (msg: ChatMessage) => void;
  onReplyClick?: (replyToId: string) => void;
  isHighlighted?: boolean;
  activePlayers?: Record<string, Player>;
  selfDecorFrame?: string;
  selfNameEffect?: string;
  selfColor?: string;
  selfName?: string;
  language?: Language;
  onToggleTranslation?: (msgId: string) => void;
}

function MessageItem({ 
  msg, 
  isSelf, 
  showSenderDetails, 
  showAvatar, 
  marginTopClass, 
  onReply, 
  onReplyClick, 
  isHighlighted, 
  activePlayers,
  selfDecorFrame,
  selfNameEffect,
  selfColor,
  selfName,
  language = "ru",
  onToggleTranslation
}: MessageItemProps) {
  const t = translations[language];
  const activePlayer = activePlayers?.[msg.playerId];
  const decorFrame = isSelf ? (selfDecorFrame || activePlayer?.decorFrame || msg.playerDecorFrame) : (activePlayer?.decorFrame || msg.playerDecorFrame);
  const nameEffect = isSelf ? (selfNameEffect || activePlayer?.nameEffect || msg.playerNameEffect) : (activePlayer?.nameEffect || msg.playerNameEffect);
  const playerColor = isSelf ? (selfColor || activePlayer?.color || msg.playerColor) : (activePlayer?.color || msg.playerColor);
  const playerName = isSelf ? (selfName || activePlayer?.name || msg.playerName) : (activePlayer?.name || msg.playerName);
  const isAdmin = activePlayer ? activePlayer.isAdmin : msg.playerIsAdmin;

  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    setIsSwiping(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || !isSwiping) return;
    const diffX = e.clientX - pointerStartRef.current.x;
    const diffY = e.clientY - pointerStartRef.current.y;

    // Reject gesture if mostly vertical to let BetterScroll take over
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 8 && swipeX === 0) {
      setIsSwiping(false);
      pointerStartRef.current = null;
      return;
    }

    // Swipe is allowed in both directions!
    const maxSwipe = 60;
    let val = 0;
    if (diffX > 0) {
      val = Math.min(diffX * 0.65, maxSwipe);
    } else {
      val = Math.max(diffX * 0.65, -maxSwipe);
    }
    setSwipeX(val);

    if (Math.abs(diffX) > 10) {
      // Prevent BetterScroll vertical scroll intercept
      e.stopPropagation();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping) return;
    setIsSwiping(false);
    pointerStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    // Unlock reply state if swiped far enough in either direction (left or right)
    if (Math.abs(swipeX) > 32) {
      onReply(msg);
    }
    setSwipeX(0);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsSwiping(false);
    pointerStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setSwipeX(0);
  };

  // Reply icon fade/scale based on horizontal translation
  const absSwipeX = Math.abs(swipeX);
  const replyIconOpacity = Math.min(absSwipeX / 30, 0.7);
  const replyIconScale = 0.5 + Math.min(absSwipeX / 30, 0.5);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  return (
    <motion.div
      id={`chat-msg-${msg.id}`}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        isMobile
          ? { type: "tween", ease: "easeOut", duration: 0.18 }
          : { type: "spring", stiffness: 220, damping: 20 }
      }
      layout={isMobile ? undefined : "position"}
      className="relative w-full overflow-visible select-none my-0.5"
      style={{
        willChange: "transform, opacity"
      }}
    >
      {/* Left swipe reply indicator in background */}
      {swipeX > 0 && (
        <div 
          className="absolute left-[4px] top-0 bottom-0 my-auto flex items-center justify-center pointer-events-none z-0"
          style={{
            opacity: replyIconOpacity,
            transform: `scale(${replyIconScale})`,
            transition: "opacity 0.1s ease-out, transform 0.1s ease-out"
          }}
        >
          <Reply className="w-3.5 h-3.5 text-zinc-500 stroke-[2.5]" />
        </div>
      )}

      {/* Right swipe reply indicator in background */}
      {swipeX < 0 && (
        <div 
          className="absolute right-[4px] top-0 bottom-0 my-auto flex items-center justify-center pointer-events-none z-0"
          style={{
            opacity: replyIconOpacity,
            transform: `scale(${replyIconScale})`,
            transition: "opacity 0.1s ease-out, transform 0.1s ease-out"
          }}
        >
          <Reply className="w-3.5 h-3.5 text-zinc-500 stroke-[2.5] -scale-x-100" />
        </div>
      )}

      {/* Content wrapper translated by swipe position */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`relative z-10 flex gap-2 items-end cursor-grab active:cursor-grabbing ${isSelf ? "flex-row-reverse" : "flex-row"} ${marginTopClass}`}
        style={{
          transform: `translate3d(${swipeX}px, 0px, 0px)`,
          transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          touchAction: "pan-y",
          willChange: "transform"
        }}
      >
        {/* Round Avatar Container or spacer layout */}
        {showAvatar ? (
          <div className="relative shrink-0 flex items-center justify-center p-[4px]">
            <div 
              className="w-7 h-7 md:w-[22px] md:h-[22px] rounded-full flex items-center justify-center font-extrabold text-[12px] md:text-[9.5px] text-black select-none shrink-0 uppercase shadow-sm relative animate-fade-in"
              style={{ backgroundColor: playerColor || "#ffffff" }}
            >
              {playerName ? playerName.charAt(0) : "?"}
              <AvatarFrame decorFrame={decorFrame} playerColor={playerColor || "#ffffff"} />
            </div>
          </div>
        ) : (
          <div className="w-9 md:w-[28px] shrink-0" />
        )}

        {/* Bubble Content Box */}
        <div className={`flex flex-col max-w-[76%] ${isSelf ? "items-end" : "items-start"}`}>
          <div 
            className={`px-3.5 py-2 md:px-3 md:py-1.5 text-[14.5px] md:text-[12px] leading-snug break-words font-medium text-left transition-all duration-300 ease-in-out ${
              msg.isGlobal
                ? (isHighlighted
                  ? "bg-blue-600 text-white rounded-[16px] rounded-bl-[4px] scale-[1.03] shadow-md"
                  : "bg-blue-500 text-white rounded-[16px] rounded-bl-[4px] shadow-sm")
                : isSelf 
                  ? (isHighlighted 
                    ? "bg-zinc-700/95 text-white rounded-[16px] rounded-br-[4px] ring-2 ring-white/30 scale-[1.03]" 
                    : "bg-zinc-900 text-white rounded-[16px] rounded-br-[4px]")
                  : (isHighlighted 
                    ? "bg-zinc-800/95 text-zinc-100 rounded-[16px] rounded-bl-[4px] ring-2 ring-white/30 scale-[1.03]" 
                    : "bg-zinc-950 text-zinc-100 rounded-[16px] rounded-bl-[4px]")
            }`}
          >
            {/* Quoted Reply Banner */}
            {msg.replyTo && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  if (msg.replyTo && onReplyClick) {
                     onReplyClick(msg.replyTo.id);
                  }
                }}
                className="mb-1 text-[11.5px] md:text-[9.5px] bg-black/40 border-l-2 p-1 rounded-r-md leading-tight max-w-full font-sans select-none opacity-85 hover:opacity-100 hover:bg-black/60 transition-all cursor-pointer"
                style={{ borderColor: msg.replyTo.playerColor || "#ffffff" }}
              >
                <div className="font-bold text-[10px] md:text-[8.5px] mb-0.5" style={{ color: msg.replyTo.playerColor }}>
                  {msg.replyTo.playerName}
                </div>
                <div className="text-zinc-400 truncate text-[11px] md:text-[9px]">
                  {msg.replyTo.text}
                </div>
              </div>
            )}
 
            {/* Sender Display Name (Colored, Inside bubble) */}
            {showSenderDetails && (
              <AdaptiveUsername
                name={playerName}
                effect={nameEffect || "none"}
                color={playerColor}
                size="sm"
                isAdmin={isAdmin}
                className="mb-0.5"
              />
            )}
            
            <div className="font-sans text-[14.5px] md:text-[12px] font-medium leading-relaxed">
              {msg.isBilingual
                ? (language === "ru" ? msg.textRu : msg.textEn)
                : msg.text}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
