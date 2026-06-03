import React from "react";
// @ts-ignore
import summer1PngUrl from "../assets/sprites/profileeffects/Summer_1.png";

interface AvatarFrameProps {
  decorFrame?: string;
  playerColor?: string;
}

export default function AvatarFrame({ decorFrame, playerColor = "#ffffff" }: AvatarFrameProps) {
  if (!decorFrame || decorFrame === "none") return null;

  switch (decorFrame) {
    case "color_ring":
      return (
        <div 
          className="absolute inset-[-1.5px] rounded-full pointer-events-none"
          style={{
            border: "1.5px solid " + playerColor,
            boxShadow: `0 0 5px ${playerColor}, inset 0 0 2px ${playerColor}`,
          }}
        />
      );

    case "candy_cane":
      return (
        <div 
          className="absolute inset-[-1.5px] rounded-full pointer-events-none"
          style={{
            padding: "1.2px",
            backgroundImage: `repeating-linear-gradient(45deg, ${playerColor}, ${playerColor} 4.5px, #ffffff 4.5px, #ffffff 9px)`,
            backgroundSize: "12.73px 12.73px",
            backgroundRepeat: "repeat",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            animation: "candy-cane-slide 1.5s linear infinite"
          }}
        />
      );

    case "summer_1":
      return (
        <img 
          src={summer1PngUrl} 
          alt="Summer Frame" 
          className="absolute pointer-events-none select-none z-10" 
          style={{
            inset: "-27.5%",
            width: "155%",
            height: "155%",
            maxWidth: "none",
            objectFit: "contain"
          }} 
        />
      );

    default:
      if (decorFrame && (decorFrame.endsWith(".png") || decorFrame.includes("Frame"))) {
        return (
          <img 
            src={`https://cdn.jsdelivr.net/gh/calloradj-png/NodeAvatars@main/${decorFrame}`} 
            alt="Dynamic Frame" 
            className="absolute pointer-events-none select-none z-10" 
            style={{
              inset: "-27.5%",
              width: "155%",
              height: "155%",
              maxWidth: "none",
              objectFit: "contain"
            }} 
          />
        );
      }
      return null;
  }
}
