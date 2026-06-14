import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

// Resolve custom UI sprites directly using Vite new URL construct to remain typesafe
const CashIcon = new URL("../assets/sprites/UI/Cash.png", import.meta.url).href;
const PlusIcon = new URL("../assets/sprites/UI/Plus.png", import.meta.url).href;
const ShopIcon = new URL("../assets/sprites/UI/Shop.png", import.meta.url).href;
const GiftIcon = new URL("../assets/sprites/UI/Gift.png", import.meta.url).href;

interface CasualCoinsHUDProps {
  coins: number;
  onAddCoins: () => void;
  language?: "ru" | "en";
  uiScale?: number;
  isMobile?: boolean;
  onOpenShop?: () => void;
  onOpenGift?: () => void;
}

interface FloatingIndicator {
  id: number;
  text: string;
  color: string;
}

export default function CasualCoinsHUD({
  coins,
  onAddCoins,
  language = "ru",
  uiScale = 1,
  isMobile = false,
  onOpenShop,
  onOpenGift
}: CasualCoinsHUDProps) {
  // Smooth count-up animation for displayed coins
  const [displayedCoins, setDisplayedCoins] = useState(coins);
  const [indicators, setIndicators] = useState<FloatingIndicator[]>([]);
  const prevCoinsRef = useRef(coins);

  // Sync displayedCoins smoothly over exactly 0.5 seconds
  useEffect(() => {
    if (displayedCoins === coins) return;

    const startValue = displayedCoins;
    const endValue = coins;
    const duration = 500;
    const startTime = performance.now();

    let animFrame: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // smooth ease-out-quad interpolation
      const easeProgress = progress * (2 - progress);
      const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);

      setDisplayedCoins(currentValue);

      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      } else {
        setDisplayedCoins(endValue);
      }
    };

    animFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [coins]);

  // Spawn dynamic floating indicators above when coins change
  useEffect(() => {
    const change = coins - prevCoinsRef.current;
    prevCoinsRef.current = coins;

    if (change !== 0) {
      const text = change > 0 ? `+${change}` : `${change}`;
      const color = change > 0 ? "#7bee2c" : "#ef4444";
      const id = Date.now() + Math.random();

      setIndicators((prev) => [...prev, { id, text, color }]);

      setTimeout(() => {
        setIndicators((prev) => prev.filter((item) => item.id !== id));
      }, 1500);
    }
  }, [coins]);

  // Use uiScale directly so the entire HUD scales dynamically on both mobile and desktop on window resize!
  const finalScale = uiScale;

  return (
    <>
      {/* Cartoon SVG Outline Filters for PNG Sprites */}
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
        <defs>
          {/* Outlines without accumulation blur, perfectly centered */}
          <filter id="cartoon-outline-cash">
            <feMorphology in="SourceAlpha" result="dilated" operator="dilate" radius="0.9" />
            <feFlood floodColor="#0d103a" result="flood" />
            <feComposite in="flood" in2="dilated" operator="in" result="outline" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cartoon-outline-plus">
            <feMorphology in="SourceAlpha" result="dilated" operator="dilate" radius="1.0" />
            <feFlood floodColor="#0d103a" result="flood" />
            <feComposite in="flood" in2="dilated" operator="in" result="outline" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <motion.div 
        layout
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
        style={{ 
          transform: `scale(${finalScale}) translateZ(0)`, 
          transformOrigin: "left center",
          transition: "transform 150ms cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitFontSmoothing: "antialiased"
        }}
        className="pointer-events-none select-none flex flex-col items-start gap-2 w-auto min-w-[172px] max-w-[280px] overflow-visible relative p-2"
        id="casual-coins-hud"
      >
        {/* Top Row: Cash Icon + Value Count Text + Plus Add Button (Spans exactly the widget width) */}
        <motion.div layout className="relative flex items-center w-full gap-4 justify-between overflow-visible h-12 px-1">
          {/* Dynamic Floating +5 / -5 text indicators spawned exactly above the cash display */}
          <div className="absolute top-[-36px] left-[32px] pointer-events-none flex flex-col items-center gap-1 z-30 overflow-visible w-[80px]">
            <AnimatePresence>
              {indicators.map((ind) => (
                <motion.div
                  key={ind.id}
                  initial={{ opacity: 0, y: 12, scale: 0.7 }}
                  animate={{ opacity: 1, y: -22, scale: 1.15 }}
                  exit={{ opacity: 0, scale: 0.8, y: -35 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="font-black text-[22px] tracking-wider select-none whitespace-nowrap filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)] px-4 py-2 overflow-visible"
                  style={{
                    color: ind.color,
                    WebkitTextStroke: "3.5px #0d103a",
                    paintOrder: "stroke fill",
                    fontFamily: '"Rubik", "Montserrat", "Nunito", sans-serif',
                    willChange: "transform, opacity",
                    transform: "translate3d(0, 0, 0)"
                  }}
                >
                  {ind.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
  
          {/* Left Side Group: Cash Icon + Count Text spaced tightly - теперь текст левее к иконке! */}
          <div className="flex items-center gap-1.5 overflow-visible">
            {/* Cash Icon Graphic with custom solid cartoon stroke outline for the transparent PNG */}
            <img 
              src={CashIcon} 
              alt="Coins" 
              className="w-11 h-11 object-contain pointer-events-none select-none shrink-0" 
              style={{
                filter: "url(#cartoon-outline-cash) drop-shadow(0 2px 2.5px rgba(0,0,0,0.25))",
                willChange: "transform",
                transform: "translate3d(0, 0, 0)"
              }}
            />
  
            {/* Dynamic Cash Counter Text: 3D Double layered with actual DOM separation to keep original font-weight thick and intact without stroke bleed inside */}
            <div className="grid grid-cols-1 grid-rows-1 items-center justify-items-start relative min-w-[50px] h-12 select-none overflow-visible">
              {/* Layer 1: Bottom 3D shadow extrusion */}
              <span 
                className="col-start-1 row-start-1 font-black text-[28px] select-none text-[#0d103a]"
                style={{
                  fontFamily: '"Rubik", "Montserrat", "Nunito", "Fredoka", sans-serif',
                  WebkitTextStroke: "4.8px #0d103a",
                  paintOrder: "stroke fill",
                  lineHeight: 1,
                  transform: "translate3d(0px, 2.5px, 0px)",
                  letterSpacing: "0.01em"
                }}
              >
                {displayedCoins}
              </span>
  
              {/* Layer 2: Main Outer Brown Boundary Outline */}
              <span 
                className="col-start-1 row-start-1 font-black text-[28px] select-none text-[#0d103a]"
                style={{
                  fontFamily: '"Rubik", "Montserrat", "Nunito", "Fredoka", sans-serif',
                  WebkitTextStroke: "4.8px #0d103a",
                  paintOrder: "stroke fill",
                  lineHeight: 1,
                  letterSpacing: "0.01em",
                  transform: "translate3d(0px, 0px, 0px)"
                }}
              >
                {displayedCoins}
              </span>
  
              {/* Layer 3: Unstroked Inner Foreground Face (STRICTLY keeps 100% thick green volume, preventing squeezing!) */}
              <span 
                className="col-start-1 row-start-1 font-black text-[28px] select-none text-[#4cd654] z-10"
                style={{
                  fontFamily: '"Rubik", "Montserrat", "Nunito", "Fredoka", sans-serif',
                  lineHeight: 1,
                  letterSpacing: "0.01em",
                  background: "linear-gradient(180deg, #3cac43 0%, #53cc5a 35%, #82ec87 50%, #53cc5a 65%, #268d2c 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0px 1px 0.5px rgba(255,255,255,0.4))",
                  transform: "translate3d(0px, 0px, 0px)"
                }}
              >
                {displayedCoins}
              </span>
            </div>
          </div>
  
          {/* Plus / Refund Button: Custom DIV to bypass global main.tsx button ripple and overflow:hidden */}
          <motion.div
            layout
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onAddCoins();
            }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.25 }}
            className="relative flex items-center justify-center p-0.5 pointer-events-auto cursor-pointer focus:outline-none outline-none border-none bg-transparent select-none shrink-0 ml-auto"
            style={{ 
              WebkitTapHighlightColor: "transparent",
              willChange: "transform",
              transform: "translate3d(0, 0, 0)"
            }}
            title={language === "ru" ? "Пополнить баланс" : "Refill balance"}
          >
            <img 
              src={PlusIcon} 
              alt="Add" 
              className="w-[30px] h-[30px] object-contain pointer-events-none select-none" 
              style={{
                filter: "url(#cartoon-outline-plus) drop-shadow(0 1.5px 2px rgba(0,0,0,0.22))",
                willChange: "transform",
                transform: "translate3d(0, 0, 0)"
              }}
            />
          </motion.div>
        </motion.div>
  
        {/* Bottom Row: Shop Button + Gift Button (Perfect alignment with generous overflow room for shadows) */}
        <div className="flex items-start w-full justify-between overflow-visible relative px-1 pt-0 pb-1 mt-[2px] gap-2">
        
        {/* Shop Widget (72px wide container space - enlarged from 64px) */}
        <motion.div 
          className="flex flex-col items-center w-[72px] overflow-visible relative pointer-events-auto cursor-pointer select-none"
          whileTap={{ scale: 0.88 }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.2 }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          style={{ 
            WebkitTapHighlightColor: "transparent",
            willChange: "transform",
            transform: "translate3d(0, 0, 0)"
          }}
          title={language === "ru" ? "Магазин" : "Shop"}
        >
          {/* Shop Trigger Button container (only icon rotates on hover) */}
          <motion.div 
            whileHover={{ rotate: 7 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.2 }}
            className="relative shrink-0 filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.28)]"
            style={{
              willChange: "transform",
              transform: "translate3d(0, 0, 0)"
            }}
          >
            {/* Enlarged Icon to 72px */}
            <img 
              src={ShopIcon} 
              alt="Shop" 
              className="w-[72px] h-[72px] object-contain pointer-events-none select-none" 
            />
          </motion.div>

          {/* Label under the Shop Button - 3D cartoon style layered to align with the thick bottom outline style */}
          <div className="grid grid-cols-1 grid-rows-1 items-center justify-items-center relative w-full h-[18px] mt-[-21px] overflow-visible">
            {/* Layer 1: Bottom 3D shadow extrusion */}
            <span 
              className="col-start-1 row-start-1 font-black text-[13px] tracking-wider text-[#0d103a] text-center select-none pointer-events-none w-full"
              style={{
                fontFamily: '"Rubik", "Montserrat", "Nunito", sans-serif',
                WebkitTextStroke: "4.5px #0d103a",
                paintOrder: "stroke fill",
                transform: "translate3d(0px, 2px, 0px)",
                whiteSpace: "nowrap",
                lineHeight: 1
              }}
            >
              {language === "ru" ? "Магазин" : "Shop"}
            </span>

            {/* Layer 2: Main outer outline */}
            <span 
              className="col-start-1 row-start-1 font-black text-[13px] tracking-wider text-[#0d103a] text-center select-none pointer-events-none w-full"
              style={{
                fontFamily: '"Rubik", "Montserrat", "Nunito", sans-serif',
                WebkitTextStroke: "4.5px #0d103a",
                paintOrder: "stroke fill",
                transform: "translate3d(0px, 0px, 0px)",
                whiteSpace: "nowrap",
                lineHeight: 1
              }}
            >
              {language === "ru" ? "Магазин" : "Shop"}
            </span>

            {/* Layer 3: Foreground face */}
            <span 
              className="col-start-1 row-start-1 font-black text-[13px] tracking-wider text-white text-center select-none pointer-events-none z-10 w-full"
              style={{
                fontFamily: '"Rubik", "Montserrat", "Nunito", sans-serif',
                whiteSpace: "nowrap",
                filter: "drop-shadow(0px 1px 0.5px rgba(255,255,255,0.35))",
                lineHeight: 1,
                transform: "translate3d(0px, 0px, 0px)"
              }}
            >
              {language === "ru" ? "Магазин" : "Shop"}
            </span>
          </div>
        </motion.div>

        {/* Gift Widget (72px wide container space - enlarged from 64px) */}
        <motion.div 
          className="flex flex-col items-center w-[72px] overflow-visible relative pointer-events-auto cursor-pointer select-none"
          whileTap={{ scale: 0.88 }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.2 }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          style={{ 
            WebkitTapHighlightColor: "transparent",
            willChange: "transform",
            transform: "translate3d(0, 0, 0)"
          }}
          title={language === "ru" ? "Подарок" : "Gift"}
        >
          {/* Gift Trigger Button container (only icon rotates on hover) */}
          <motion.div 
            whileHover={{ rotate: 7 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.2 }}
            className="relative shrink-0 filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.28)]"
            style={{
              willChange: "transform",
              transform: "translate3d(0, 0, 0)"
            }}
          >
            {/* Enlarged Icon to 72px */}
            <img 
              src={GiftIcon} 
              alt="Gift" 
              className="w-[72px] h-[72px] object-contain pointer-events-none select-none" 
            />
          </motion.div>

          {/* Label under the Gift Button - 3D cartoon style layered to align with the thick bottom outline style */}
          <div className="grid grid-cols-1 grid-rows-1 items-center justify-items-center relative w-full h-[18px] mt-[-21px] overflow-visible">
            {/* Layer 1: Bottom 3D shadow extrusion */}
            <span 
              className="col-start-1 row-start-1 font-black text-[13px] tracking-wider text-[#0d103a] text-center select-none pointer-events-none w-full"
              style={{
                fontFamily: '"Rubik", "Montserrat", "Nunito", sans-serif',
                WebkitTextStroke: "4.5px #0d103a",
                paintOrder: "stroke fill",
                transform: "translate3d(0px, 2px, 0px)",
                whiteSpace: "nowrap",
                lineHeight: 1
              }}
            >
              {language === "ru" ? "Подарок" : "Gift"}
            </span>

            {/* Layer 2: Main outer outline */}
            <span 
              className="col-start-1 row-start-1 font-black text-[13px] tracking-wider text-[#0d103a] text-center select-none pointer-events-none w-full"
              style={{
                fontFamily: '"Rubik", "Montserrat", "Nunito", sans-serif',
                WebkitTextStroke: "4.5px #0d103a",
                paintOrder: "stroke fill",
                transform: "translate3d(0px, 0px, 0px)",
                whiteSpace: "nowrap",
                lineHeight: 1
              }}
            >
              {language === "ru" ? "Подарок" : "Gift"}
            </span>

            {/* Layer 3: Foreground face */}
            <span 
              className="col-start-1 row-start-1 font-black text-[13px] tracking-wider text-white text-center select-none pointer-events-none z-10 w-full"
              style={{
                fontFamily: '"Rubik", "Montserrat", "Nunito", sans-serif',
                whiteSpace: "nowrap",
                filter: "drop-shadow(0px 1px 0.5px rgba(255,255,255,0.35))",
                lineHeight: 1
              }}
            >
              {language === "ru" ? "Подарок" : "Gift"}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  </>
);
}
