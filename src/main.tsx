import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global Native-Style Button and Input Ripple + List Hover Spot Handler
if (typeof document !== 'undefined') {
  let lastTouchTime = 0;

  const handleRipple = (e: MouseEvent | TouchEvent) => {
    // Prevent duplicated triggers on mobile hybrid touch-to-mouse events
    if (e.type === 'mousedown' && Date.now() - lastTouchTime < 800) {
      return;
    }
    if (e.type === 'touchstart') {
      lastTouchTime = Date.now();
    }

    const target = e.target as HTMLElement | null;
    if (!target) return;

    let clientX = 0;
    let clientY = 0;

    if (e.type === 'touchstart') {
      const touchEvent = e as TouchEvent;
      if (touchEvent.touches && touchEvent.touches.length > 0) {
        clientX = touchEvent.touches[0].clientX;
        clientY = touchEvent.touches[0].clientY;
      } else {
        return;
      }
    } else {
      const mouseEvent = e as MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    // Otherwise, check if button is clicked
    const button = target.closest("button");
    if (!button || button.disabled) return;

    // Ensure parent button is ready to crop the ripple perfectly inside its bounds
    const computedStyle = window.getComputedStyle(button);
    if (computedStyle.position === 'static') {
      button.style.position = 'relative';
    }
    if (computedStyle.overflow !== 'hidden') {
      button.style.overflow = 'hidden';
    }

    const rect = button.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    // Calculate dimensions to fully cover the button on expansion
    const size = Math.max(rect.width, rect.height) * 2.5;
    const radius = size / 2;

    const ripple = document.createElement("span");
    ripple.className = "global-ripple-effect";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${clickX - radius}px`;
    ripple.style.top = `${clickY - radius}px`;

    // Choose contrast color automatically (darker ripple for light backgrounds, lighter for dark backgrounds)
    const textColor = computedStyle.color || "";
    let isLightBg = false;
    const colorValues = textColor.match(/\d+/g);
    if (colorValues && colorValues.length >= 3) {
      const r = parseInt(colorValues[0], 10);
      const g = parseInt(colorValues[1], 10);
      const b = parseInt(colorValues[2], 10);
      const luminance = (r * 299 + g * 587 + b * 114) / 1000;
      if (luminance < 120) {
        isLightBg = true;
      }
    }

    if (isLightBg) {
      ripple.style.backgroundColor = "rgba(0, 0, 0, 0.15)";
    } else {
      ripple.style.backgroundColor = "rgba(255, 255, 255, 0.35)";
    }

    button.appendChild(ripple);

    // Clean up DOM node once animation ends
    ripple.addEventListener("animationend", () => {
      ripple.remove();
    });
  };

  document.addEventListener("mousedown", handleRipple, { passive: true });
  document.addEventListener("touchstart", handleRipple, { passive: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

