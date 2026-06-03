import React, { useState, useEffect, useRef, useMemo } from "react";
import VerifiedBadge from "./VerifiedBadge";

export interface AdaptiveUsernameProps {
  name: string;
  effect: string; // 'none' | 'glow' | 'neon' | 'glitch' | 'slime' | 'rainbow' | 'lava' | 'pixel' | 'runes' | 'hacker' | 'water' | 'gold'
  color?: string; // primary fallback/accent color
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  isAdmin?: boolean;
}

// Global incremental generator for unique instance IDs
let instanceCounter = 0;

export default function AdaptiveUsername({
  name,
  effect = "none",
  color = "#ff5964",
  size = "md",
  className = "",
  isAdmin = false
}: AdaptiveUsernameProps) {
  // Generate a unique identifier for CSS rules and SVG filters in this component instance
  const instanceId = useMemo(() => {
    instanceCounter++;
    return `username-eff-${instanceCounter}-${Math.floor(Math.random() * 1000)}`;
  }, []);

  // Sizing scale definitions
  const sizeConfig = useMemo(() => {
    switch (size) {
      case "sm":
        return {
          fontSizeClass: "text-[11px] md:text-xs",
          fontSizeNum: 12,
          strokeWidth: "0.8px",
          shadowGlow: "3px",
          slimeDropSize: 3,
          slimeDropHeight: 12,
          slimeBlur: 1.5,
          rainbowBounce: "-3px",
          waterStroke: "0.8px",
          starSize: "8px",
          lightningLength: 10,
          emberRise: 12,
          paddingY: "py-0.5",
          paddingX: "px-1.5"
        };
      case "lg":
        return {
          fontSizeClass: "text-lg md:text-2xl",
          fontSizeNum: 24,
          strokeWidth: "2px",
          shadowGlow: "14px",
          slimeDropSize: 7,
          slimeDropHeight: 35,
          slimeBlur: 4,
          rainbowBounce: "-10px",
          waterStroke: "2.5px",
          starSize: "16px",
          lightningLength: 26,
          emberRise: 38,
          paddingY: "py-3",
          paddingX: "px-4"
        };
      case "xl":
        return {
          fontSizeClass: "text-3xl md:text-5xl",
          fontSizeNum: 48,
          strokeWidth: "3px",
          shadowGlow: "24px",
          slimeDropSize: 11,
          slimeDropHeight: 52,
          slimeBlur: 6,
          rainbowBounce: "-16px",
          waterStroke: "3.5px",
          starSize: "22px",
          lightningLength: 40,
          emberRise: 60,
          paddingY: "py-4",
          paddingX: "px-5"
        };
      case "md":
      default:
        return {
          fontSizeClass: "text-xs md:text-sm",
          fontSizeNum: 14,
          strokeWidth: "1.2px",
          shadowGlow: "6px",
          slimeDropSize: 4.5,
          slimeDropHeight: 22,
          slimeBlur: 2.5,
          rainbowBounce: "-6px",
          waterStroke: "1.5px",
          starSize: "12px",
          lightningLength: 16,
          emberRise: 24,
          paddingY: "py-1.5",
          paddingX: "px-2.5"
        };
    }
  }, [size]);

  // Adjust color shade helper
  const darkShade = useMemo(() => {
    let hex = color.replace("#", "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const num = parseInt(hex, 16);
    const amt = -60; // darken percentage
    const R = Math.max(0, (num >> 16) + amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) + amt);
    const B = Math.max(0, (num & 0x0000ff) + amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }, [color]);

  const lightShade = useMemo(() => {
    let hex = color.replace("#", "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const num = parseInt(hex, 16);
    const amt = 60; // lighten percentage
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }, [color]);

  // --- Effects State Keepers & Canvas Refs ---
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Slime drip generator inside React
  interface SlimeDropItem {
    id: string;
    left: number;
    size: number;
    delay: number;
  }
  const [slimeDrops, setSlimeDrops] = useState<SlimeDropItem[]>([]);

  // 2. Mystic runes replacement state
  const runicSymbols = "ᔑʖᓵ↸ᒷ⎓⊦⌰⍑⍊⍓╎⸗⸘⍚⍛⍜⍤⍥⍦⍧";
  const [runeStates, setRuneStates] = useState<Array<{ original: string; display: string; isRune: boolean }>>([]);

  // 3. Gold sparkle sparkles
  interface GoldSparkleItem {
    id: string;
    left: number;
    top: number;
    size: string;
    angle: number;
  }
  const [goldSparkles, setGoldSparkles] = useState<GoldSparkleItem[]>([]);

  useEffect(() => {
    if (effect !== "runes") return;
    
    // Initialize exactly as the HTML blueprint: characters start either glitched or normal
    let localState = name.split("").map(char => {
      const isGlitched = Math.random() > 0.4;
      return {
        original: char,
        display: isGlitched ? runicSymbols[Math.floor(Math.random() * runicSymbols.length)] : char,
        glitched: isGlitched,
        timer: Math.floor(Math.random() * 10)
      };
    });
    setRuneStates(localState.map(item => ({
      original: item.original,
      display: item.display,
      isRune: item.glitched
    })));

    const interval = setInterval(() => {
      localState = localState.map(state => {
        if (state.original === " ") return state;
        
        let timer = state.timer - 1;
        let glitched = state.glitched;
        if (timer <= 0) {
          glitched = !glitched;
          timer = Math.floor(5 + Math.random() * 15);
        }

        const display = glitched
          ? runicSymbols[Math.floor(Math.random() * runicSymbols.length)]
          : state.original;

        return {
          ...state,
          glitched,
          timer,
          display
        };
      });

      setRuneStates(localState.map(item => ({
        original: item.original,
        display: item.display,
        isRune: item.glitched
      })));
    }, 120);

    return () => clearInterval(interval);
  }, [name, effect]);

  useEffect(() => {
    if (effect !== "slime") return;
    const interval = setInterval(() => {
      setSlimeDrops(prev => {
        const nextId = `drip-${Math.random()}`;
        const newDrop: SlimeDropItem = {
          id: nextId,
          left: Math.random() * 90 + 5, // percentage
          size: (0.6 + Math.random() * 0.8) * sizeConfig.slimeDropSize,
          delay: Math.random() * 0.5
        };
        // Keep max 5 drippings to avoid re-render slowdowns
        return [...prev.slice(-4), newDrop];
      });
    }, 900);
    return () => clearInterval(interval);
  }, [effect, sizeConfig]);

  useEffect(() => {
    if (effect !== "gold") return;
    const interval = setInterval(() => {
      setGoldSparkles(prev => {
        const nextId = `sparkle-${Math.random()}`;
        const sSize = (size === "sm" ? 7 : size === "md" ? 12 : 18) * (0.8 + Math.random() * 0.4);
        const newSparkle: GoldSparkleItem = {
          id: nextId,
          left: Math.random() * 95 + 2.5,
          top: Math.random() * 85 + 7.5,
          size: `${sSize}px`,
          angle: Math.random() * 360
        };
        return [...prev.slice(-3), newSparkle];
      });
    }, 550);
    return () => clearInterval(interval);
  }, [effect, size]);

  // Clean dripping item timeouts
  const removeSlimeDrip = (id: string) => {
    setSlimeDrops(prev => prev.filter(d => d.id !== id));
  };
  const removeGoldSparkle = (id: string) => {
    setGoldSparkles(prev => prev.filter(s => s.id !== id));
  };

  // --- Canvas Animation Drivers (Glitch Lightning, Lava Sparks, Hacker Matrix Rain) ---
  useEffect(() => {
    if (!effect || !["glitch", "lava", "hacker"].includes(effect)) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let width = 0;
    let height = 0;

    // Resize canvas based on container bounding size
    const resize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        // Add extra padding so particle effects do not clip inside bounds!
        const paddingX = effect === "glitch" ? 25 : effect === "hacker" ? 15 : 10;
        const paddingY = effect === "glitch" ? 20 : effect === "lava" ? 15 : 8;

        width = rect.width + paddingX * 2;
        height = rect.height + paddingY * 2;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Effect states
    // A. Lava Spark particles
    interface LavaParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      decay: number;
    }
    let lavaParticles: LavaParticle[] = [];

    // B. Glitch Lightning strikes
    interface LightningStrike {
      startX: number;
      startY: number;
      points: Array<{ dx: number; dy: number }>;
      opacity: number;
      color: string;
    }
    let strikes: LightningStrike[] = [];

    // C. Matrix rain columns
    interface MatrixCol {
      x: number;
      y: number;
      speed: number;
      chars: string[];
    }
    let matrixColumns: MatrixCol[] = [];
    const matrixSigns = "10".split("");
    const initHackerMatrix = () => {
      const colWidth = size === "sm" ? 7 : 11;
      const colCount = Math.floor(width / colWidth) + 1;
      matrixColumns = [];
      for (let i = 0; i < colCount; i++) {
        matrixColumns.push({
          x: i * colWidth,
          y: Math.random() * -height,
          speed: (1.2 + Math.random() * 2.2) * (size === "sm" ? 0.7 : 1),
          chars: Array.from({ length: 6 }, () => matrixSigns[Math.floor(Math.random() * matrixSigns.length)])
        });
      }
    };

    if (effect === "hacker") {
      initHackerMatrix();
    }

    // Helper: generate rough points matching the design exactly
    const makeLightningPoints = (length: number) => {
      const points = [];
      let currentLength = 0;
      while (currentLength < length) {
        const portion = 3 + Math.random() * 6;
        const dx = portion;
        const dy = (Math.random() - 0.5) * 4.5;
        points.push({ dx, dy });
        currentLength += portion;
      }
      return points;
    };

    // Render loop
    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      const computedPaddingX = effect === "glitch" ? 25 : effect === "hacker" ? 15 : 10;
      const computedPaddingY = effect === "glitch" ? 20 : effect === "lava" ? 15 : 8;

      if (effect === "lava") {
        // Spawn sparks
        if (Math.random() < (size === "sm" ? 0.18 : 0.35)) {
          const spawnX = computedPaddingX + Math.random() * (width - computedPaddingX * 2);
          const spawnY = height - computedPaddingY;
          lavaParticles.push({
            x: spawnX,
            y: spawnY,
            vx: (Math.random() - 0.5) * (size === "sm" ? 0.6 : 1.2),
            vy: -(0.5 + Math.random() * 1.2) * (size === "sm" ? 0.7 : 1.3),
            size: (size === "sm" ? 1 : 1.8) + Math.random() * (size === "sm" ? 1.2 : 2.5),
            color: `hsl(${16 + Math.random() * 24}, 100%, ${50 + Math.random() * 35}%)`,
            life: 1.0,
            decay: 0.015 + Math.random() * 0.02
          });
        }

        // Draw and update sparks
        for (let i = lavaParticles.length - 1; i >= 0; i--) {
          const p = lavaParticles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.decay;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.shadowBlur = size === "sm" ? 2 : 4;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          if (p.life <= 0 || p.y < 0) {
            lavaParticles.splice(i, 1);
          }
        }
      }

      else if (effect === "glitch") {
        // Spawning short horizontal cracking strikes across the text area to keep it highly dynamic but bounded
        if (Math.random() < 0.12) {
          const lLength = sizeConfig.lightningLength * (0.8 + Math.random() * 0.4);
          strikes.push({
            startX: computedPaddingX + Math.random() * (width - computedPaddingX * 2 - lLength),
            startY: computedPaddingY + Math.random() * (height - computedPaddingY * 2),
            points: makeLightningPoints(lLength),
            opacity: 1.0,
            color: "#ffffff"
          });
        }

        // Draw lightning cracking
        for (let i = strikes.length - 1; i >= 0; i--) {
          const s = strikes[i];
          ctx.strokeStyle = s.color;
          ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
          ctx.shadowBlur = size === "sm" ? 4 : 8;
          ctx.lineWidth = size === "sm" ? 1.2 : 2.2;
          ctx.globalAlpha = s.opacity;

          ctx.beginPath();
          ctx.moveTo(s.startX, s.startY);
          let tx = s.startX;
          let ty = s.startY;
          s.points.forEach(p => {
            tx += p.dx;
            ty += p.dy;
            ctx.lineTo(tx, ty);
          });
          ctx.stroke();

          s.opacity -= size === "sm" ? 0.16 : 0.11; // Fast decay
          if (s.opacity <= 0) {
            strikes.splice(i, 1);
          }
        }
      }

      else if (effect === "hacker") {
        // Redrawn matrix code falling
        if (matrixColumns.length === 0 && width > 0) {
          initHackerMatrix();
        }

        ctx.font = `bold ${size === "sm" ? "8px" : "10px"} monospace`;

        matrixColumns.forEach(c => {
          c.y += c.speed;
          if (c.y > height) {
            c.y = -Math.random() * 20;
            c.speed = (1.2 + Math.random() * 2.2) * (size === "sm" ? 0.7 : 1);
          }

          // Draw column chain character
          for (let j = 0; j < c.chars.length; j++) {
            const charY = c.y - j * (size === "sm" ? 8 : 11);
            if (charY < 0 || charY > height) continue;

            const alpha = (1 - j / c.chars.length) * 0.65;
            ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;

            if (Math.random() < 0.05) {
              c.chars[j] = matrixSigns[Math.floor(Math.random() * matrixSigns.length)];
            }
            ctx.fillText(c.chars[j], c.x, charY);
          }
        });
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animFrame);
      resizeObserver.disconnect();
    };
  }, [effect, size, sizeConfig]);

  // Clean-up count to prevent overflow memory leak issues
  const letters = useMemo(() => name.split(""), [name]);

  // Global styling rules generated dynamically for perfect, non-colliding effects
  const dynamicCss = useMemo(() => {
    return `
      /* Common animation definitions scoped to this instance */
      
      /* Neon pulse keyframe mapping */
      @keyframes neon-pulse-${instanceId} {
        0%, 100% {
          opacity: 0.95;
          text-shadow: 
            0 0 ${size === "sm" ? "1px" : "2px"} #fff,
            0 0 ${size === "sm" ? "3px" : "6px"} ${color},
            0 0 ${size === "sm" ? "5px" : "12px"} ${color};
        }
        50% {
          opacity: 1;
          text-shadow: 
            0 0 ${size === "sm" ? "1.5px" : "3px"} #fff,
            0 0 ${size === "sm" ? "5px" : "10px"} ${color},
            0 0 ${size === "sm" ? "9px" : "20px"} ${color},
            0 0 ${size === "sm" ? "12px" : "30px"} ${color};
        }
      }

      /* Glitch TV scan flickers background */
      @keyframes glitch-shake-${instanceId} {
        0%, 100% { transform: translate(0); }
        20% { transform: translate(calc(${sizeConfig.strokeWidth} * -0.5), calc(${sizeConfig.strokeWidth} * 0.4)); }
        40% { transform: translate(calc(${sizeConfig.strokeWidth} * 0.4), calc(${sizeConfig.strokeWidth} * -0.5)); }
        60% { transform: translate(calc(${sizeConfig.strokeWidth} * -0.3), calc(${sizeConfig.strokeWidth} * -0.3)); }
        80% { transform: translate(calc(${sizeConfig.strokeWidth} * 0.5), calc(${sizeConfig.strokeWidth} * 0.5)); }
      }
      
      @keyframes glitch-slice-a-${instanceId} {
        0% { clip-path: inset(10% 0 25% 0); }
        50% { clip-path: inset(45% 0 10% 0); }
        100% { clip-path: inset(12% 0 44% 0); }
      }

      @keyframes glitch-slice-b-${instanceId} {
        0% { clip-path: inset(55% 0 5% 0); }
        50% { clip-path: inset(5% 0 65% 0); }
        100% { clip-path: inset(30% 0 20% 0); }
      }

      /* Drippings animation controller */
      @keyframes slime-fall-${instanceId} {
        0% { transform: translateY(0) scaleY(1); opacity: 1; }
        45% { transform: translateY(calc(${sizeConfig.slimeDropHeight}px * 0.4)) scaleY(1.3) scaleX(0.85); }
        85% { transform: translateY(calc(${sizeConfig.slimeDropHeight}px * 0.9)) scaleY(1.8) scaleX(0.5); opacity: 1; }
        100% { transform: translateY(${sizeConfig.slimeDropHeight}px) scaleY(1) scaleX(1); opacity: 0; }
      }

      /* Staggered text bounces matching pixel and rainbow */
      @keyframes rb-jump-${instanceId} {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(${sizeConfig.rainbowBounce}); }
      }

      @keyframes px-wave-${instanceId} {
        0%, 100% { transform: scale(1); color: ${color}; text-shadow: ${size === "sm" ? "1px 1px 0" : "2.5px 2.5px 0"} ${darkShade}; }
        50% { transform: scale(0.8); color: #ffffff; text-shadow: ${size === "sm" ? "1px 1px 0" : "2.5px 2.5px 0"} #555555; }
      }

      /* Water liquid flow sliding */
      @keyframes water-slide-f-${instanceId} {
        0% { mask-position: 0% 0%; -webkit-mask-position: 0% 0%; }
        100% { mask-position: -200% 0%; -webkit-mask-position: -200% 0%; }
      }
      @keyframes water-slide-b-${instanceId} {
        0% { mask-position: 100% 0%; -webkit-mask-position: 100% 0%; }
        100% { mask-position: -100% 0%; -webkit-mask-position: -100% 0%; }
      }
      @keyframes water-bob-${instanceId} {
        0% { transform: translateY(calc(${sizeConfig.rainbowBounce} * 0.3)) rotate(-3deg); }
        100% { transform: translateY(calc(${sizeConfig.rainbowBounce} * -0.3)) rotate(3deg); }
      }

      /* Star sparkles fading shimmer */
      @keyframes sparkle-fade-${instanceId} {
        0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 0; }
        40% { opacity: 1; }
        100% { transform: translate(-50%, -100%) scale(1.3) rotate(140deg); opacity: 0; }
      }

      /* Apply selectors */
      .neon-active-${instanceId} {
        animation: neon-pulse-${instanceId} 1.4s infinite alternate ease-in-out;
      }

      .glitch-active-${instanceId} {
        animation: glitch-shake-${instanceId} 0.2s infinite linear alternate-reverse;
      }
      
      .glitch-active-${instanceId}::before {
        content: attr(data-text);
        position: absolute;
        top: 0;
        left: calc(${sizeConfig.strokeWidth} * 1.5);
        width: 100%;
        height: 100%;
        text-shadow: -2px 0 #ff0055;
        animation: glitch-slice-a-${instanceId} 1s infinite linear alternate-reverse;
      }

      .glitch-active-${instanceId}::after {
        content: attr(data-text);
        position: absolute;
        top: 0;
        left: calc(${sizeConfig.strokeWidth} * -1.5);
        width: 100%;
        height: 100%;
        text-shadow: -2px 0 #00ffff;
        animation: glitch-slice-b-${instanceId} 0.8s infinite linear alternate-reverse;
      }

      .drip-active-${instanceId} {
        animation: slime-fall-${instanceId} 1.6s infinite cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
      }

      .sparkle-active-${instanceId} {
        animation: sparkle-fade-${instanceId} 1s forwards ease-out;
      }

      .rb-letter-active-${instanceId} {
        animation: rb-jump-${instanceId} 1.1s infinite ease-in-out;
      }

      .px-letter-active-${instanceId} {
        animation: px-wave-${instanceId} 1.4s infinite ease-in-out;
      }

      .water-letter-active-${instanceId} {
        animation: water-bob-${instanceId} 2.6s ease-in-out infinite alternate;
      }
    `;
  }, [instanceId, color, size, sizeConfig, darkShade]);

  // Render content according to current effect type
  const renderStyledContent = () => {
    switch (effect) {
      // 1. NEON WITH NOISE (🔋 НЕОН С ПОМЕХАМИ)
      case "neon":
        return (
          <div className="relative inline-flex items-center justify-center">
            <span
              className={`font-black uppercase tracking-wide text-white select-none whitespace-nowrap text-center neon-active-${instanceId}`}
              style={{
                fontFamily: "'Fredoka One', 'Fira Sans', sans-serif"
              }}
            >
              {name}
            </span>
          </div>
        );

      // 2. DETAILED GLITCH (💥 КИБЕР ГЛИЧ + МОЛНИИ)
      case "glitch":
        return (
          <div className="relative inline-flex items-center justify-center overflow-visible" ref={containerRef}>
            {/* Scoped Canvas underneath text lines */}
            <canvas
              ref={canvasRef}
              className="absolute pointer-events-none z-10"
              style={{
                top: "-15px",
                left: "-20px"
              }}
            />
            <span
              className={`font-black uppercase tracking-wider relative select-none whitespace-nowrap text-center text-outline glitch-active-${instanceId}`}
              data-text={name.toUpperCase()}
              style={{
                fontFamily: "'Rubik Mono One', sans-serif",
                color: color,
                textShadow: `
                  -${sizeConfig.strokeWidth} -${sizeConfig.strokeWidth} 0 ${darkShade},  
                   ${sizeConfig.strokeWidth} -${sizeConfig.strokeWidth} 0 ${darkShade},  
                  -${sizeConfig.strokeWidth}  ${sizeConfig.strokeWidth} 0 ${darkShade},  
                   ${sizeConfig.strokeWidth}  ${sizeConfig.strokeWidth} 0 ${darkShade},
                   0px ${size === "sm" ? "2px" : "4px"} ${size === "sm" ? "4px" : "8px"} rgba(0,0,0,0.6)
                `
              }}
            >
              {name}
            </span>
          </div>
        );

      // 3. ANIMATED SLIME (🤢 ЖИДКАЯ СЛИЗЬ)
      case "slime":
        const gooFilterId = `slime-filter-${instanceId}`;
        return (
          <div
            className="relative inline-flex items-center justify-center overflow-visible"
            ref={containerRef}
            style={{
              filter: `url('#${gooFilterId}')`
            }}
          >
            {/* Dynamic isolated SVG Goo filter specifically configured for current size to maintain sharpness */}
            <svg style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
              <defs>
                <filter id={gooFilterId}>
                  <feGaussianBlur in="SourceGraphic" stdDeviation={sizeConfig.slimeBlur} result="blur" />
                  <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                  <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
              </defs>
            </svg>

            {/* Simulated drippings relative container */}
            <div className="absolute inset-0 overflow-visible pointer-events-none">
              {slimeDrops.map(d => (
                <div
                  key={d.id}
                  className={`absolute rounded-full drip-active-${instanceId}`}
                  onAnimationEnd={() => removeSlimeDrip(d.id)}
                  style={{
                    backgroundColor: color,
                    left: `${d.left}%`,
                    top: "60%",
                    width: `${d.size}px`,
                    height: `${d.size}px`
                  }}
                />
              ))}
            </div>

            <span
              className="font-black uppercase tracking-widest text-center text-white select-none whitespace-nowrap"
              style={{
                fontFamily: "'Fredoka One', 'Comfortaa', sans-serif",
                textShadow: `
                  -${sizeConfig.strokeWidth} -${sizeConfig.strokeWidth} 0 ${darkShade},  
                   ${sizeConfig.strokeWidth} -${sizeConfig.strokeWidth} 0 ${darkShade},  
                  -${sizeConfig.strokeWidth}  ${sizeConfig.strokeWidth} 0 ${darkShade},  
                   ${sizeConfig.strokeWidth}  ${sizeConfig.strokeWidth} 0 ${darkShade},
                   0px ${size === "sm" ? "2.5px" : "4.5px"} 0px ${darkShade}
                `
              }}
            >
              {name}
            </span>
          </div>
        );

      // 4. JUMPING RAINBOW (🌈 ПРЫГАЮЩАЯ РАДУГА)
      case "rainbow":
        return (
          <div className="relative inline-flex items-center justify-center overflow-visible gap-0.5">
            {letters.map((char, index) => {
              const hue = (index * (360 / Math.max(letters.length, 1))) % 360;
              const delay = `${index * 0.08}s`;
              return (
                <span
                  key={`rb-letter-${index}`}
                  className={`inline-block font-black uppercase text-center select-none whitespace-nowrap rb-letter-active-${instanceId}`}
                  style={{
                    fontFamily: "'Fredoka One', sans-serif",
                    animationDelay: delay,
                    color: `hsl(${hue}, 100%, 65%)`,
                    textShadow: `
                      0 ${size === "sm" ? "1.5px" : "3.5px"} 0 hsl(${hue}, 100%, 36%),
                      0 ${size === "sm" ? "3px" : "7px"} ${size === "sm" ? "4px" : "8px"} rgba(0, 0, 0, 0.4)
                    `
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              );
            })}
          </div>
        );

      // 5. LAVA & FIRE EMBERS (🔥 ЛАВА И ИСКРЫ)
      case "lava":
        return (
          <div className="relative inline-flex items-center justify-center overflow-visible" ref={containerRef}>
            {/* Sparks canvas overlay */}
            <canvas
              ref={canvasRef}
              className="absolute pointer-events-none z-10"
              style={{
                top: "-10px",
                left: "-10px"
              }}
            />
            {/* Fire Lava text */}
            <span
              className="font-black uppercase tracking-wider text-center select-none whitespace-nowrap"
              style={{
                fontFamily: "'Fredoka One', 'Rubik Mono One', sans-serif",
                background: "linear-gradient(180deg, #ffe600 0%, #ff5d00 50%, #7c0000 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 ${size === "sm" ? "1.5px" : "3px"} ${size === "sm" ? "2.5px" : "4px"} rgba(255, 93, 0, 0.55))`
              }}
            >
              {name}
            </span>
          </div>
        );

      // 6. PIXEL RGB WAVE (👾 ПИКСЕЛЬНАЯ ВЫВЕСКА)
      case "pixel":
        return (
          <div className="relative inline-flex items-center justify-center overflow-visible gap-0.5">
            {letters.map((char, index) => {
              const delay = `${index * 0.12}s`;
              return (
                <span
                  key={`px-letter-${index}`}
                  className={`inline-block font-black uppercase text-center select-none whitespace-nowrap px-letter-active-${instanceId}`}
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    animationDelay: delay
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              );
            })}
          </div>
        );

      // 7. MYSTIC RUNES (🔮 СТОЛ ЗАЧАРОВАНИЯ)
      case "runes":
        return (
          <div className="relative inline-flex items-center justify-center gap-0 overflow-visible">
            {runeStates.map((item, index) => {
              if (item.original === " ") {
                return (
                  <span key={`rune-space-${index}`} className="select-none leading-none" style={{ width: `${sizeConfig.fontSizeNum * 0.4}px` }}>
                    &nbsp;
                  </span>
                );
              }
              return (
                <span
                  key={`rune-char-${index}`}
                  className="font-bold uppercase select-none transition-all duration-300 inline-block text-center tracking-normal leading-none"
                  style={{
                    fontFamily: item.isRune ? "monospace" : "'Share Tech Mono', sans-serif",
                    width: `${sizeConfig.fontSizeNum * 0.75}px`,
                    textShadow: `
                      0 0 ${size === "sm" ? "2px" : "4px"} #fff, 
                      0 0 ${size === "sm" ? "5px" : "10px"} ${color}, 
                      0 0 ${size === "sm" ? "8px" : "18px"} ${darkShade}
                    `
                  }}
                >
                  {item.display}
                </span>
              );
            })}
          </div>
        );

      // 8. MATRIX HACKER RAIN (👽 ХАКЕР-МАТРИЦА)
      case "hacker":
        return (
          <div className="relative inline-flex items-center justify-center overflow-hidden rounded-md" ref={containerRef}>
            {/* Columns rain canvas locked behind text bounds */}
            <canvas
              ref={canvasRef}
              className="absolute pointer-events-none z-0 inset-0"
            />
            {/* Hacker Glowing Text */}
            <span
              className="font-black uppercase tracking-wider text-center select-none whitespace-nowrap relative z-10 px-1 py-0.5"
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                color: "#10b981",
                textShadow: `
                  0 0 ${size === "sm" ? "3px" : "5px"} #10b981, 
                  0 0 ${size === "sm" ? "7px" : "15px"} rgba(16, 185, 129, 0.6)
                `
              }}
            >
              {name}
            </span>
          </div>
        );

      // 10. GLOSSY GOLD SHIMMER (✨ ЗОЛОТОЙ БЛЕСК)
      case "gold":
        return (
          <div className="relative inline-flex items-center justify-center overflow-visible" ref={containerRef}>
            {/* Sparkle Particles on overlay layer */}
            <div className="absolute inset-0 overflow-visible pointer-events-none">
              {goldSparkles.map(s => (
                <div
                  key={s.id}
                  className={`absolute sparkle-active-${instanceId} pointer-events-none text-yellow-300`}
                  onAnimationEnd={() => removeGoldSparkle(s.id)}
                  style={{
                    left: `${s.left}%`,
                    top: `${s.top}%`,
                    fontSize: s.size,
                    transform: `translate(-50%, -50%) rotate(${s.angle}deg)`,
                    textShadow: "0 0 6px #ffffff"
                  }}
                >
                  ✦
                </div>
              ))}
            </div>

            {/* Glossy golden text */}
            <span
              className="font-black uppercase tracking-wider text-center select-none whitespace-nowrap"
              style={{
                fontFamily: "'Fredoka One', 'Comfortaa', sans-serif",
                background: "linear-gradient(135deg, #ffe875 0%, #f7b11d 30%, #fff8d4 50%, #e59400 70%, #9e5b00 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 ${size === "sm" ? "1.5px" : "3px"} ${size === "sm" ? "2px" : "3.5px"} rgba(158, 91, 0, 0.45))`
              }}
            >
              {name}
            </span>
          </div>
        );

      // Classic golden-yellow text-shadow glow (Золотое сияние)
      case "glow":
        return (
          <span
            className="font-black tracking-wider text-center select-none whitespace-nowrap text-yellow-400"
            style={{
              fontFamily: "'Fredoka One', 'Fira Sans', sans-serif",
              color: "#fbbf24",
              textShadow: `
                0 0 4px #fbbf24,
                0 0 10px rgba(251, 191, 36, 0.6),
                -${sizeConfig.strokeWidth} -${sizeConfig.strokeWidth} 0 #000,  
                 ${sizeConfig.strokeWidth} -${sizeConfig.strokeWidth} 0 #000,
                -${sizeConfig.strokeWidth}  ${sizeConfig.strokeWidth} 0 #000,
                 ${sizeConfig.strokeWidth}  ${sizeConfig.strokeWidth} 0 #000
              `
            }}
          >
            {name}
          </span>
        );

      // Fallback regular name
      case "none":
      default:
        return (
          <span
            className="font-bold tracking-wider text-center select-none whitespace-nowrap"
            style={{
              color: color,
              fontFamily: "'Fredoka One', 'Nunito', sans-serif"
            }}
          >
            {name}
          </span>
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 overflow-visible ${sizeConfig.paddingX} ${sizeConfig.paddingY} ${sizeConfig.fontSizeClass} ${className}`}
    >
      <style dangerouslySetInnerHTML={{ __html: dynamicCss }} />
      {renderStyledContent()}
      {isAdmin && (
        <VerifiedBadge
          className={`shrink-0 ${
            size === "sm" ? "w-3.5 h-3.5" : size === "md" ? "w-[18px] h-[18px]" : size === "lg" ? "w-[22px] h-[22px]" : "w-[30px] h-[30px]"
          }`}
          color={color}
          effect={effect}
        />
      )}
    </div>
  );
}
