import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface DynamicJoystickProps {
  joystickRef: React.MutableRefObject<{ x: number; y: number } | null>;
  disabled?: boolean;
}

export default function DynamicJoystick({ joystickRef, disabled = false }: DynamicJoystickProps) {
  const [active, setActive] = useState(false);
  const [basePos, setBasePos] = useState({ x: 0, y: 0 });
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);

  const LIMIT = 60; // radius in pixels

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || active) return;
    
    // Capture pointer to track movement outside the touch zone
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    setActive(true);
    setBasePos({ x: e.clientX, y: e.clientY });
    setStickPos({ x: e.clientX, y: e.clientY });
    
    if (joystickRef) {
      joystickRef.current = { x: 0, y: 0 };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !active || activePointerIdRef.current !== e.pointerId) return;

    const dx = e.clientX - basePos.x;
    const dy = e.clientY - basePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let currentBaseX = basePos.x;
    let currentBaseY = basePos.y;

    if (dist > LIMIT) {
      // Dynamic shift: base follows the finger so it's always at distance LIMIT
      currentBaseX = e.clientX - (dx / dist) * LIMIT;
      currentBaseY = e.clientY - (dy / dist) * LIMIT;
      setBasePos({ x: currentBaseX, y: currentBaseY });
    }

    setStickPos({ x: e.clientX, y: e.clientY });

    // Recalculate vector relative to the (possibly updated) base
    const finalDx = e.clientX - currentBaseX;
    const finalDy = e.clientY - currentBaseY;
    const vx = Math.max(-1, Math.min(1, finalDx / LIMIT));
    const vy = Math.max(-1, Math.min(1, finalDy / LIMIT));

    if (joystickRef) {
      joystickRef.current = { x: vx, y: vy };
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      
      activePointerIdRef.current = null;
      setActive(false);
      
      if (joystickRef) {
        joystickRef.current = { x: 0, y: 0 };
      }
    }
  };

  const HANDLE_SIZE = 76; // Larger handle diameter (was 50)

  return (
    <>
      {/* Invisible Touch overlay covering the left half of the screen at layer z-[5] */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        className="fixed left-0 top-0 w-1/2 h-full z-[5] pointer-events-auto touch-none select-none"
      />

      {/* Visual representation of elements positioned absolutely on screen */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="fixed pointer-events-none rounded-full bg-black/20 backdrop-blur-[3px] flex items-center justify-center z-50"
            style={{
              left: basePos.x - LIMIT,
              top: basePos.y - LIMIT,
              width: LIMIT * 2,
              height: LIMIT * 2,
            }}
          >
            {/* Visual inner stick / handle - borderless, sleek, and beautifully translucent */}
            <div
              className="absolute rounded-full bg-gradient-to-br from-white/30 to-white/15 backdrop-blur-[6px]"
              style={{
                left: stickPos.x - basePos.x + LIMIT - HANDLE_SIZE / 2,
                top: stickPos.y - basePos.y + LIMIT - HANDLE_SIZE / 2,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
