import React from "react";
import { motion, AnimatePresence } from "motion/react";

export interface ProximityPromptUIProps {
  visible: boolean;
  progress: number; // 0 to 100
  actionText?: string;
  holdText?: string;
  keyIndicator?: string;
  isMobile?: boolean;
}

export default function ProximityPromptUI({
  visible,
  progress,
  actionText = "TAKE",
  holdText = "Hold to",
  keyIndicator = "E",
  isMobile = false,
}: ProximityPromptUIProps) {
  // SVG Circle length configuration (2 * PI * R) where R = 38
  const radius = 38;
  const strokeDasharray = 2 * Math.PI * radius; // Approx 238.76
  const strokeDashoffset = strokeDasharray - (strokeDasharray * progress) / 100;

  // Active state when player is holding/charging progress
  const isInteracting = progress > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="proximity-prompt"
          initial={{ opacity: 0, scale: isMobile ? 1.275 : 0.85, y: 15 }}
          animate={{ opacity: 1, scale: isMobile ? (isInteracting ? 1.425 : 1.5) : (isInteracting ? 0.95 : 1), y: 0 }}
          exit={{ opacity: 0, scale: isMobile ? 1.275 : 0.85, y: 15 }}
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
          className="absolute z-50 flex items-center bg-black/60 backdrop-blur-md rounded-full p-[6px] pr-5 gap-3.5 select-none pointer-events-auto"
          style={{
            width: "max-content",
            transformOrigin: "center center",
          }}
        >
          {/* Left Side: Circular Progress Bar Tracker + Mechanical key indicator */}
          <div className="relative flex items-center justify-center shrink-0 w-[54px] h-[54px]">
            {/* Circular Progress SVG Ring Representation */}
            <svg className="absolute w-full h-full -rotate-90 select-none" viewBox="0 0 100 100">
              {/* Solid faint background ring track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="5"
              />
              {/* White active border overlay (accent white color, completely flat, no neon glow) */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#ffffff"
                strokeWidth="6"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
 
            {/* Centered Keycap / Tap Pointer inside Ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isMobile ? (
                /* Mobile: Elegant provided touch hand SVG */
                <div className="relative flex items-center justify-center">
                  <svg
                    width="24px"
                    height="24px"
                    viewBox="0 0 24 24"
                    id="Layer_1"
                    data-name="Layer 1"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-6 h-6 text-white transition-transform duration-100 ${isInteracting ? 'scale-90 rotate-[-5deg]' : ''}`}
                  >
                    <path
                      fill="none"
                      stroke="#ffffff"
                      strokeMiterlimit={10}
                      strokeWidth={1.91}
                      d="M17.07,20.61H9.79a2,2,0,0,1-2-2,2,2,0,0,1,2-2h1.87L5,9.86a2,2,0,0,1-.19-2.65,1.88,1.88,0,0,1,1.47-.68,1.84,1.84,0,0,1,1.35.55l4.06,4.06,4.08-3.06a1.91,1.91,0,0,1,2.5.18h0A17.18,17.18,0,0,1,22.42,15l.06.19"
                    />
                    <path
                      fill="none"
                      stroke="#ffffff"
                      strokeMiterlimit={10}
                      strokeWidth={1.91}
                      d="M10.63,10.12A4.73,4.73,0,0,0,11,8.17,4.78,4.78,0,1,0,6.26,13a4.67,4.67,0,0,0,1.55-.26"
                    />
                  </svg>
                  {isInteracting && (
                    <span className="absolute w-4 h-4 bg-white/35 rounded-full animate-ping pointer-events-none" />
                  )}
                </div>
              ) : (
                /* Desktop: 3D mechanical key keycap style which depresses downward on interaction by half of the 3D shadow thickness */
                <div className="relative flex items-center justify-center w-full h-full">
                  <div
                    className="flex items-center justify-center w-[22px] h-[22px] rounded-[5px] text-[10px] font-black bg-neutral-100 text-neutral-950 select-none border-t border-white transition-all duration-[120ms] ease-out"
                    style={{
                      boxShadow: isInteracting
                        ? "0 1px 0px 0px #8e95a0"
                        : "0 4.5px 0px 0px #8e95a0",
                      transform: isInteracting
                        ? "translateY(-0.50px) scale(0.96)"
                        : "translateY(-2.25px) scale(1)",
                    }}
                  >
                    {keyIndicator}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Action Text block (smaller and refined) */}
          <div className="flex flex-col justify-center min-w-[55px] pr-1.5 leading-tight">
            {/* Gray label text like "Hold to" */}
            <span className="text-[10px] font-semibold text-neutral-400 capitalize whitespace-nowrap">
              {holdText}
            </span>
            {/* Main white highlight description like "TAKE" */}
            <span className="text-sm font-black text-white uppercase mt-0.5 whitespace-nowrap">
              {actionText}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
