import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { Player, ChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";
import AdaptiveUsername from "./AdaptiveUsername";
import VerifiedBadge from "./VerifiedBadge";

const SCENE_CONFIG = {
  toneMapping: THREE.ACESFilmicToneMapping,
  dirLightIntensity: 2.8, // Slightly softer sun light
  dirLightColor: "#fef0be",
  dirLightPositionX: -1,
  dirLightPositionY: 30,
  dirLightPositionZ: 24,
  dirLightShadowBias: 0.001,
  ambientLightIntensity: 2.15, // Lifted ambient lighting to make standard shadow term softer
  ambientLightColor: "#e09eff",
  fogColor: "#ffa3f7",
  fogDensity: 0.017,
  brightness: 110,
  contrast: 114,
  saturation: 142,
  exposure: 1.0,
};

interface GameCanvasProps {
  key?: any;
  playerId: string;
  roomInfo: {
    id: string;
    name: string;
    players: Record<string, Player>;
    obstacles: Array<{ x: number; z: number; radius: number; height: number }>;
  };
  ws: WebSocket | null;
  joystickRef?: React.RefObject<{ x: number; y: number } | null>;
  messages: ChatMessage[];
  graphicsQuality?: number; // 1 = Low, 2 = Medium, 3 = High, 4 = Ultra
  avatarShopOpen?: boolean;
  avatars?: Array<{ name?: string; name_en?: string; name_ru?: string; cost: number; path: string; flags: string }>;
  uiScale?: number;
}

const PLAYER_RADIUS = 0.8;

export default function GameCanvas({ playerId, roomInfo, ws, joystickRef, messages, graphicsQuality = 3, avatarShopOpen = false, avatars, uiScale = 1 }: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep references to access inside the loop without re-running effects
  const playersStateRef = useRef<Record<string, Player>>(roomInfo.players);
  const playerIdRef = useRef<string>(playerId);

  const avatarShopOpenRef = useRef(avatarShopOpen);
  useEffect(() => {
    avatarShopOpenRef.current = avatarShopOpen;
  }, [avatarShopOpen]);

  const avatarsRef = useRef(avatars);
  useEffect(() => {
    avatarsRef.current = avatars;
  }, [avatars]);

  // Active chat bubble tracking
  const [activeBubbles, setActiveBubbles] = useState<Array<ChatMessage & { createdAt: number }>>([]);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const bubblePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!messages) return;
    const newBubblesToAppend: Array<ChatMessage & { createdAt: number }> = [];
    messages.forEach(msg => {
      if (!processedMessageIds.current.has(msg.id)) {
        processedMessageIds.current.add(msg.id);
        newBubblesToAppend.push({
          ...msg,
          createdAt: Date.now()
        });
      }
    });

    if (newBubblesToAppend.length > 0) {
      setActiveBubbles(prev => [...prev, ...newBubblesToAppend]);
    }
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveBubbles(prev => {
        const filtered = prev.filter(b => now - b.createdAt < 10000);
        if (filtered.length !== prev.length) {
          return filtered;
        }
        return prev;
      });
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Local movement physics variables
  const playerPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const playerVel = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const playerRotY = useRef<number>(0);

  // Keyboard state
  const keysPressed = useRef<Record<string, boolean>>({});

  // Handle updates to refs
  useEffect(() => {
    playersStateRef.current = roomInfo.players;
    
    // Set local player's spawn position from server init once
    const me = roomInfo.players[playerId];
    if (me && playerPos.current.lengthSq() === 0) {
      playerPos.current.set(me.x, me.y, me.z);
    }
  }, [roomInfo.players, playerId]);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  // Main Three.js setup effect
  useEffect(() => {
    if (!mountRef.current || !canvasRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // --- 1. Scene Setup ---
    const scene = new THREE.Scene();
    // Soft preset background and fog matching your custom atmosphere
    scene.background = new THREE.Color(SCENE_CONFIG.fogColor);
    scene.fog = new THREE.FogExp2(SCENE_CONFIG.fogColor, SCENE_CONFIG.fogDensity);

    // --- 2. Camera Setup ---
    // Top-down perspective isometric camera
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    const baseAspect = 1.777; // 16:9 ratio

    // Symmetrical diagonal offset for accurate zoomed-in isometric look (closer view)
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const mobileOffsetModifier = isMobileDevice ? 0.8 : 1.0;
    const baseOffset = new THREE.Vector3(-4.2, 4.5, 4.2).multiplyScalar(mobileOffsetModifier);
    
    // Start camera high up in sky for a smooth fly-down intro swoop on scene mount
    camera.position.set(playerPos.current.x - 15, playerPos.current.y + 60, playerPos.current.z + 15);
    
    // Aim the camera slightly higher than player base (shifts player slightly lower on screen, keeping visual focus beautiful and upward)
    const baseTarget = new THREE.Vector3().copy(playerPos.current);
    baseTarget.y += 0.75;
    camera.lookAt(baseTarget);

    // Apply graphicsQuality presets (1: Low, 2: Medium, 3: High, 4: Ultra)
    let maxPixelRatio = 2.0;
    let shadowsEnabled = true;
    let shadowMapSize = 1024;

    if (graphicsQuality === 1) { // Low
      maxPixelRatio = 0.85;
      shadowsEnabled = false;
    } else if (graphicsQuality === 2) { // Medium
      maxPixelRatio = 1.2;
      shadowsEnabled = false;
    } else if (graphicsQuality === 3) { // High
      maxPixelRatio = 1.8;
      shadowsEnabled = true;
      shadowMapSize = 512;
    } else if (graphicsQuality === 4) { // Ultra
      maxPixelRatio = 2.2;
      shadowsEnabled = true;
      shadowMapSize = 1024;
    }

    // --- 3. Renderer Setup ---
    // Primary WebGPURenderer with automatic seamless fallback to WebGL if WebGPU is unsupported.
    let isRendererReady = false;
    let renderer: any;
    try {
      renderer = new WebGPURenderer({
        canvas: canvasRef.current,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.init().then(() => {
        isRendererReady = true;
      }).catch((e: any) => {
        console.warn("WebGPURenderer custom initialization fell back due to error:", e);
        try { renderer.dispose(); } catch (_) {}
        renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
        if (renderer.shadowMap) {
          renderer.shadowMap.enabled = shadowsEnabled;
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        renderer.toneMapping = SCENE_CONFIG.toneMapping;
        renderer.toneMappingExposure = SCENE_CONFIG.exposure;
        isRendererReady = true;
      });
    } catch (e) {
      console.warn("WebGPURenderer custom initialization is unsupported, falling back to WebGLRenderer:", e);
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        powerPreference: "high-performance",
      });
      isRendererReady = true;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = shadowsEnabled;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Beautiful, extremely soft blurry cartoon shadows!
    }
    renderer.toneMapping = SCENE_CONFIG.toneMapping;
    renderer.toneMappingExposure = SCENE_CONFIG.exposure;

    // --- 4. Lights Setup ---
    // Lavender/purple-tinted ambient light supply
    const ambientLight = new THREE.AmbientLight(SCENE_CONFIG.ambientLightColor, SCENE_CONFIG.ambientLightIntensity);
    scene.add(ambientLight);

    // Main Directional Sun Light (Warm sunset glow)
    const sunLight = new THREE.DirectionalLight(SCENE_CONFIG.dirLightColor, SCENE_CONFIG.dirLightIntensity);
    sunLight.position.set(
      SCENE_CONFIG.dirLightPositionX,
      SCENE_CONFIG.dirLightPositionY,
      SCENE_CONFIG.dirLightPositionZ
    );
    sunLight.castShadow = shadowsEnabled;
    sunLight.shadow.mapSize.width = shadowMapSize;
    sunLight.shadow.mapSize.height = shadowMapSize;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 120;
    
    // Soft shadow radius for high blur width
    sunLight.shadow.radius = 7.0;
    
    // Tighter bounding frustum focused around active player results in extremely dense, sharp shadow pixels
    const d = 16;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = SCENE_CONFIG.dirLightShadowBias;
    scene.add(sunLight);

    // Warm soft bounce lighting pointing upward
    const bounceLight = new THREE.DirectionalLight(0x352945, 0.6);
    bounceLight.position.set(-10, -20, -10);
    scene.add(bounceLight);

    // --- 5. Checked Dark Floor ---
    const gridCanvas = document.createElement("canvas");
    gridCanvas.width = 128;
    gridCanvas.height = 128;
    const gridCtx = gridCanvas.getContext("2d")!;
    // Deep dark base
    gridCtx.fillStyle = "#090a0d";
    gridCtx.fillRect(0, 0, 128, 128);
    // Lighter checkered subtle grid blocks
    gridCtx.fillStyle = "#0f1014";
    gridCtx.fillRect(0, 0, 64, 64);
    gridCtx.fillRect(64, 64, 64, 64);
    // Grid lines
    gridCtx.strokeStyle = "rgba(255, 255, 255, 0.015)";
    gridCtx.lineWidth = 1;
    gridCtx.strokeRect(0, 0, 128, 128);

    const floorTexture = new THREE.CanvasTexture(gridCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(36, 36); // 3 times smaller cells! 12 * 3 = 36

    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.9,
      metalness: 0.1,
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // --- 6. Obstacles Setup (Empty list) ---
    const obstacleGeometries: Array<{ mesh: THREE.Mesh; x: number; z: number; radius: number }> = [];

    // --- 6.5 Particles Setup (Walk dust billboards) ---
    const activeParticles: Array<{
      mesh: THREE.Object3D;
      velocity: THREE.Vector3;
      life: number;
      maxLife: number;
      type: string;
      rotationSpeed?: number;
      baseScale?: number;
    }> = [];

    // Generate beautiful procedural fallbacks for Particle_1 and Particle_2
    const buildProceduralDustTexture = (type: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 64, 64);

      if (type === 1) {
        // AAA style cartoon fluffy smoke/dust cluster
        ctx.fillStyle = "rgba(235, 235, 240, 0.75)";
        
        // Left puff
        ctx.beginPath();
        ctx.arc(22, 38, 11, 0, Math.PI * 2);
        ctx.fill();

        // Right puff
        ctx.beginPath();
        ctx.arc(42, 38, 11, 0, Math.PI * 2);
        ctx.fill();

        // Center puff
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(32, 28, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = "rgba(180, 180, 195, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Horizontal drifting soft dust wave
        ctx.fillStyle = "rgba(240, 240, 245, 0.8)";
        ctx.beginPath();
        ctx.arc(24, 34, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(215, 215, 225, 0.65)";
        ctx.beginPath();
        ctx.arc(42, 38, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = "rgba(180, 180, 195, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const particle1Texture = buildProceduralDustTexture(1);
    const particle2Texture = buildProceduralDustTexture(2);

    // Try loading real file textures, fallback gracefully if files are blank or error out
    const particle1Url = new URL("../assets/sprites/game/Particle_1.png", import.meta.url).href;
    const particle2Url = new URL("../assets/sprites/game/Particle_2.png", import.meta.url).href;

    const imgP1 = new Image();
    imgP1.src = particle1Url;
    imgP1.onload = () => {
      if (imgP1.width > 0 && imgP1.height > 0) {
        (particle1Texture as any).image = imgP1;
        particle1Texture.needsUpdate = true;
      }
    };

    const imgP2 = new Image();
    imgP2.src = particle2Url;
    imgP2.onload = () => {
      if (imgP2.width > 0 && imgP2.height > 0) {
        (particle2Texture as any).image = imgP2;
        particle2Texture.needsUpdate = true;
      }
    };

    const emitWalkParticle = (pos: THREE.Vector3) => {
      const useType1 = Math.random() < 0.5;
      const tex = useType1 ? particle1Texture : particle2Texture;

      const pMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.0, // Start completely transparent to allow smooth fade-in
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(pMat);
      
      // Spawn slightly above the floor and slightly randomized around feet
      sprite.position.copy(pos);
      sprite.position.x += (Math.random() - 0.5) * 0.4;
      sprite.position.y = 0.05 + Math.random() * 0.08;
      sprite.position.z += (Math.random() - 0.5) * 0.4;

      // Random scale between 0.22 and 0.44
      const baseScale = 0.22 + Math.random() * 0.22;
      // Start matching the 0.05 size factor of the birth frame
      sprite.scale.set(0.05 * baseScale, 0.05 * baseScale, 1.0);

      // Give them horizontal drift (inertia) in a random direction and elegant slow upward lift
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.22 + Math.random() * 0.28;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        0.15 + Math.random() * 0.2, // floating upwards gently
        Math.sin(angle) * speed
      );

      // Soft rotating billboard spin
      sprite.material.rotation = Math.random() * Math.PI * 2;
      const rotationSpeed = (Math.random() - 0.5) * 2.0;

      const maxLife = 0.45 + Math.random() * 0.35;

      scene.add(sprite);
      activeParticles.push({
        mesh: sprite,
        velocity,
        life: maxLife,
        maxLife,
        type: "walk",
        rotationSpeed,
        baseScale,
      });
    };

    // --- 7. Player Meshes Dictionary ---
    const localPlayerGroup = new THREE.Group();
    scene.add(localPlayerGroup);

    const otherPlayerMeshes: Record<string, THREE.Group> = {};

    // Define player sprite path using standard, TS-friendly Vite URL compiler resolution
    const playerSpriteUrl = new URL("../assets/sprites/Player.png", import.meta.url).href;
    const newAvatarSpriteUrl = new URL("../assets/sprites/NewAvatar.png", import.meta.url).href;

    // Create a texture loader and safe fallback system for Player.png
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin("anonymous");
    
    // Procedural sharp backup texture in case the PNG is empty or load fails
    const backupCanvas = document.createElement("canvas");
    backupCanvas.width = 128;
    backupCanvas.height = 128;
    const bCtx = backupCanvas.getContext("2d")!;
    bCtx.clearRect(0, 0, 128, 128);
    // Body shape
    bCtx.fillStyle = "#ffffff";
    bCtx.beginPath();
    bCtx.arc(64, 64, 55, 0, Math.PI * 2);
    bCtx.fill();
    // Eyes
    bCtx.fillStyle = "#111111";
    bCtx.beginPath();
    bCtx.arc(44, 55, 7, 0, Math.PI * 2);
    bCtx.arc(84, 55, 7, 0, Math.PI * 2);
    bCtx.fill();
    // Pink blush cheeks
    bCtx.fillStyle = "rgba(255, 105, 180, 0.5)";
    bCtx.beginPath();
    bCtx.arc(32, 72, 8, 0, Math.PI * 2);
    bCtx.arc(96, 72, 8, 0, Math.PI * 2);
    bCtx.fill();
    // Smile mouth
    bCtx.strokeStyle = "#111111";
    bCtx.lineWidth = 5;
    bCtx.lineCap = "round";
    bCtx.beginPath();
    bCtx.arc(64, 70, 15, 0.1, Math.PI - 0.1);
    bCtx.stroke();
    
    const backupTexture = new THREE.CanvasTexture(backupCanvas);
    backupTexture.colorSpace = THREE.SRGBColorSpace;

    // Load texture with filter modes custom suited to display clean sprite pixels
    const playerTexture = textureLoader.load(
      playerSpriteUrl,
      (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.minFilter = THREE.LinearFilter;
        loadedTex.magFilter = THREE.LinearFilter;
      },
      undefined,
      (err) => {
        console.warn("Could not load Player.png sprite, using procedural fallback.", err);
      }
    );

    // Load new avatar texture with filter modes custom suited to display clean sprite pixels
    const newAvatarTexture = textureLoader.load(
      newAvatarSpriteUrl,
      (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.minFilter = THREE.LinearFilter;
        loadedTex.magFilter = THREE.LinearFilter;
      },
      undefined,
      (err) => {
        console.warn("Could not load NewAvatar.png sprite, using procedural fallback.", err);
      }
    );

    // Cross-verify actual image contents to check for empty 0-byte placeholders
    const imgElement = new Image();
    imgElement.src = playerSpriteUrl;
    imgElement.onload = () => {
      if (imgElement.width > 0 && imgElement.height > 0) {
        playerTexture.image = imgElement;
        playerTexture.needsUpdate = true;
      } else {
        playerTexture.image = backupCanvas as unknown as HTMLImageElement;
        playerTexture.needsUpdate = true;
      }
    };
    imgElement.onerror = () => {
      playerTexture.image = backupCanvas as unknown as HTMLImageElement;
      playerTexture.needsUpdate = true;
    };

    const imgElement2 = new Image();
    imgElement2.src = newAvatarSpriteUrl;
    imgElement2.onload = () => {
      if (imgElement2.width > 0 && imgElement2.height > 0) {
        newAvatarTexture.image = imgElement2;
        newAvatarTexture.needsUpdate = true;
      } else {
        newAvatarTexture.image = backupCanvas as unknown as HTMLImageElement;
        newAvatarTexture.needsUpdate = true;
      }
    };
    imgElement2.onerror = () => {
      newAvatarTexture.image = backupCanvas as unknown as HTMLImageElement;
      newAvatarTexture.needsUpdate = true;
    };

    const defaultAvatars = [
      { name_en: "Basic avatar", name_ru: "Базовый аватар", cost: 0, path: "Avatar_1.png", flags: "none" },
      { name_en: "Cute avatar", name_ru: "Милый аватар", cost: 150, path: "Avatar_2.png", flags: "none" },
      { name_en: "NODE avatar", name_ru: "NODE аватар", cost: 0, path: "Avatar_node.png", flags: "admin" }
    ];

    const textureCache: Record<number, THREE.Texture> = {};

    function getAvatarTexture(styleId: number): THREE.Texture {
      if (textureCache[styleId]) return textureCache[styleId];

      const activeAvatars = avatarsRef.current || defaultAvatars;
      const avatarDef = activeAvatars[styleId];
      if (!avatarDef) return playerTexture;

      const url = `https://cdn.jsdelivr.net/gh/calloradj-png/NodeAvatars@main/${avatarDef.path}`;
      const tex = textureLoader.load(
        url,
        (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          loadedTex.minFilter = THREE.LinearFilter;
          loadedTex.magFilter = THREE.LinearFilter;
          loadedTex.needsUpdate = true;
        },
        undefined,
        (err) => {
          console.warn(`Could not load avatar texture ${url}:`, err);
        }
      );

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        if (img.width > 0 && img.height > 0) {
          tex.image = img;
          tex.needsUpdate = true;
        }
      };

      textureCache[styleId] = tex;
      return tex;
    }

    // Build larger, non-billboard upright character card standing on the arena floor
    function buildRobotMesh(colorHex: string, styleId?: number): THREE.Group {
      const g = new THREE.Group();

      const cardGroup = new THREE.Group();
      cardGroup.name = "toonCard";
      // Standing perfectly upright perpendicular to the floor, facing the isometric camera horizontally
      cardGroup.rotation.set(0, -Math.PI / 4, 0);

      // Rotator sub-group manages clean horizontal 180-degree flipping when changing direction
      const rotator = new THREE.Group();
      rotator.name = "rotator";
      cardGroup.add(rotator);

      // Clean flat plane with pivot moved downwards to represent feet (Y=0)
      const bodyGeo = new THREE.PlaneGeometry(2.4, 2.4);
      bodyGeo.translate(0, 1.2, 0);
      
      const activeTexture = getAvatarTexture(styleId || 0);

      const faceMat = new THREE.MeshStandardMaterial({
        map: activeTexture,
        transparent: true,
        side: THREE.DoubleSide,
        color: 0xffffff, // Keep it neutral white so the player's custom sprite colors are displayed prinstinely!
        alphaTest: 0.25, // Cutout threshold to let Three.js cast actual paper-style sprite shape shadows!
        roughness: 0.7,
        metalness: 0.1,
      });

      const bodyMesh = new THREE.Mesh(bodyGeo, faceMat);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = false; // Prevent receiving self-shadows incorrectly
      rotator.add(bodyMesh);

      g.add(cardGroup);

      return g;
    }

    // Spawn local mesh
    const localInfo = playersStateRef.current[playerIdRef.current];
    let localRobot: THREE.Group;
    let localActiveStyleId = localInfo ? localInfo.avatarStyle : 0;
    if (localInfo) {
      localRobot = buildRobotMesh(localInfo.color, localInfo.avatarStyle);
      localPlayerGroup.add(localRobot);
    }

    // --- 8. Collectibles disabled ---

    // --- 9. Physics parameters ---
    const MAX_SPEED = 7.5; // cozy movement speed
    const keyboard = keysPressed.current;

    // Smooth movement animation states
    let localWalkTime = 0;
    let localAnimIntensity = 0;
    let localIdleTime = 0;
    const otherAnimStates: Record<string, { walkTime: number; idleTime: number; animIntensity: number; lastFaceY: number; loadedStyleId?: number }> = {};

    let localDistanceAccumulator = 0;
    const playerLastPos = new THREE.Vector3().copy(playerPos.current);
    const otherDistanceAccumulators: Record<string, { lastPos: THREE.Vector3; distance: number }> = {};

    const clock = new THREE.Clock();
    let animFrameId: number;
    let lastNetworkSend = 0;

    // --- 10. Frame Tick Animation Loop ----
    const tick = () => {
      animFrameId = requestAnimationFrame(tick);

      const dt = Math.min(clock.getDelta(), 0.1); // clamp logic glitches
      if (dt <= 0) return;

      const myId = playerIdRef.current;
      const allPlayers = playersStateRef.current;
      const activeMe = allPlayers[myId];

      // Dynamically recreate local player visual mesh if skin changes in real-time
      if (activeMe) {
        if (localActiveStyleId !== activeMe.avatarStyle) {
          while (localPlayerGroup.children.length > 0) {
            localPlayerGroup.remove(localPlayerGroup.children[0]);
          }
          localRobot = buildRobotMesh(activeMe.color, activeMe.avatarStyle);
          localPlayerGroup.add(localRobot);
          localActiveStyleId = activeMe.avatarStyle;
        }
      }

      // Get camera relative directions projected onto horizontal XZ plane
      const camForward = new THREE.Vector3(0, 0, -1);
      const camRight = new THREE.Vector3(1, 0, 0);

      camForward.applyQuaternion(camera.quaternion);
      camForward.y = 0;
      camForward.normalize();

      camRight.applyQuaternion(camera.quaternion);
      camRight.y = 0;
      camRight.normalize();

      // 10a. LOCAL PHYSICS FOR PLAYER WASD (relative to isometric camera)
      let inputX = 0;
      let inputZ = 0;

      if (!avatarShopOpenRef.current) {
        inputX = joystickRef?.current?.x || 0;
        inputZ = joystickRef?.current?.y || 0;

        if (keyboard["KeyW"] || keyboard["ArrowUp"]) inputZ -= 1;
        if (keyboard["KeyS"] || keyboard["ArrowDown"]) inputZ += 1;
        if (keyboard["KeyA"] || keyboard["ArrowLeft"]) inputX -= 1;
        if (keyboard["KeyD"] || keyboard["ArrowRight"]) inputX += 1;

        // Ensure clamped inputs when using keyboard and joystick together
        inputX = Math.max(-1, Math.min(1, inputX));
        inputZ = Math.max(-1, Math.min(1, inputZ));
      }

      // Blend inputs on horizontal camera vectors
      const moveDir = new THREE.Vector3();
      moveDir.addScaledVector(camForward, -inputZ); // W/Up moves deep into the screenspace view
      moveDir.addScaledVector(camRight, inputX);

      const isMoving = moveDir.lengthSq() > 0.01;
      if (isMoving) {
        moveDir.normalize();
      }

      // Direct, crisp movement relative to camera projection
      const targetVelX = moveDir.x * MAX_SPEED;
      const targetVelZ = moveDir.z * MAX_SPEED;

      // Interpolate extremely quickly to the target velocity (no slippery sliding)
      playerVel.current.x += (targetVelX - playerVel.current.x) * 35.0 * dt;
      playerVel.current.z += (targetVelZ - playerVel.current.z) * 35.0 * dt;

      // Hard cut when keys are released
      if (!isMoving) {
        if (Math.abs(playerVel.current.x) < 0.15) playerVel.current.x = 0;
        if (Math.abs(playerVel.current.z) < 0.15) playerVel.current.z = 0;
      }

      // Update position
      playerPos.current.x += playerVel.current.x * dt;
      playerPos.current.z += playerVel.current.z * dt;

      // Check arena outer borders (50x50, coordinate limit is -25 to +25)
      const borderLimit = 24.2;
      if (playerPos.current.x < -borderLimit) { playerPos.current.x = -borderLimit; playerVel.current.x = 0; }
      if (playerPos.current.x > borderLimit) { playerPos.current.x = borderLimit; playerVel.current.x = 0; }
      if (playerPos.current.z < -borderLimit) { playerPos.current.z = -borderLimit; playerVel.current.z = 0; }
      if (playerPos.current.z > borderLimit) { playerPos.current.z = borderLimit; playerVel.current.z = 0; }

      // Check obstacle collisions (sliding circle bounds pushing radially outward)
      obstacleGeometries.forEach((o) => {
        const dx = playerPos.current.x - o.x;
        const dz = playerPos.current.z - o.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = o.radius + PLAYER_RADIUS;

        if (dist < minDist) {
          // Push player out of collision
          const pushX = (dx / dist) * minDist;
          const pushZ = (dz / dist) * minDist;
          playerPos.current.x = o.x + pushX;
          playerPos.current.z = o.z + pushZ;

          // Zero out velocity components directed towards obstacle
          const nx = dx / dist;
          const nz = dz / dist;
          const dot = playerVel.current.x * nx + playerVel.current.z * nz;
          if (dot < 0) {
            playerVel.current.x -= nx * dot;
            playerVel.current.z -= nz * dot;
          }
        }
      });

      // Calculate target horizontal rotation: face left/right relative to screen's camRight vector
      if (isMoving) {
        const moveRightDot = moveDir.dot(camRight);
        if (moveRightDot > 0.05) {
          playerRotY.current = 0; // face screen-right (front of texture card)
        } else if (moveRightDot < -0.05) {
          playerRotY.current = Math.PI; // face screen-left (back of texture card, seen flipped!)
        }
      }

      // Apply to 3D local visual mesh group position
      localPlayerGroup.position.copy(playerPos.current);
      
      // Smoothly fade walking animations in and out
      if (isMoving) {
        localAnimIntensity += (1.0 - localAnimIntensity) * 8.0 * dt;
        localWalkTime += dt * 11.5; // sped up walking animation speed! (was 6.5)
      } else {
        localAnimIntensity += (0.0 - localAnimIntensity) * 10.0 * dt;
      }

      localIdleTime += dt;

      // Dynamic walking bounce (hop) and side-to-side wobble blended with a cozy squishy idle breathing animation
      const walkHop = Math.abs(Math.sin(localWalkTime)) * 0.16 * localAnimIntensity;
      const idleBob = Math.sin(localIdleTime * 3.5) * 0.035 * (1.0 - localAnimIntensity); // gentle breathing bobbing
      localPlayerGroup.position.y = 0.01 + walkHop + idleBob;
      
      const walkWobble = Math.sin(localWalkTime) * 0.06 * localAnimIntensity;
      const idleWobble = Math.cos(localIdleTime * 2.0) * 0.015 * (1.0 - localAnimIntensity); // soft idle wobble
      localPlayerGroup.rotation.z = walkWobble + idleWobble;

      // Squishy breathing stretch and squash
      const idleScaleX = 1.0 + Math.sin(localIdleTime * 3.5) * 0.025 * (1.0 - localAnimIntensity);
      const idleScaleY = 1.0 - Math.sin(localIdleTime * 3.5) * 0.025 * (1.0 - localAnimIntensity);
      localPlayerGroup.scale.set(idleScaleX, idleScaleY, 1.0);

      // Smooth rotate 180 degrees around local Y axis to turn around paper-style!
      const localRotator = localPlayerGroup.getObjectByName("rotator");
      if (localRotator) {
        let diffY = playerRotY.current - localRotator.rotation.y;
        diffY = Math.atan2(Math.sin(diffY), Math.cos(diffY));
        localRotator.rotation.y += diffY * 12.0 * dt;
      }

      // (Dynamic billing disabled to preserve locked non-billboard angle)

      // 10b. CAMERA TRACKING FOLLOWING PLAYER
      let targetCameraPos = new THREE.Vector3();
      let targetCameraLook = new THREE.Vector3();
      let lerpFactor = 0.08;

      if (avatarShopOpenRef.current) {
        // High-angle diagonal view from above (вид сверху) for both mobile and desktop!
        const isMobileScreen = window.innerWidth <= 768;
        let shopOffset: THREE.Vector3;
        if (isMobileScreen) {
          // Position camera slightly higher and further back for a perfect top-down overview
          shopOffset = new THREE.Vector3(-4.4, 4.2, 4.4);
        } else {
          shopOffset = new THREE.Vector3(-2.5, 2.4, 2.5);
        }

        targetCameraPos.copy(playerPos.current).add(shopOffset);
        targetCameraLook.copy(playerPos.current);

        if (isMobileScreen) {
          // Slightly lower target look-at Y to center the player nicely without pushing them off-screen high
          targetCameraLook.y -= 0.45;
        } else {
          targetCameraLook.y += 1.15; // Beautiful overhead framing for desktop split screen
          // Off-center shift camera more to the right (visually pushes player further leftwards)
          const camRightVec = new THREE.Vector3(1, 0, 1).normalize();
          const pShiftAmount = 1.25;
          const cameraShiftVec = camRightVec.clone().multiplyScalar(pShiftAmount);
          targetCameraPos.add(cameraShiftVec);
          targetCameraLook.add(cameraShiftVec);
        }

        // Force perpendicular camera facing Y rotation
        playerRotY.current = 0;

        lerpFactor = 0.12;
      } else {
        // Standard high isometric follow
        const currentAspect = camera.aspect || 1.777;
        const aspectFactor = baseAspect / currentAspect;
        const zoomScale = isMobileDevice
          ? Math.max(1, Math.pow(aspectFactor, 0.45))
          : Math.max(1, aspectFactor);
        
        const dynamicOffset = new THREE.Vector3().copy(baseOffset).multiplyScalar(zoomScale);

        targetCameraPos.copy(playerPos.current).add(dynamicOffset);
        
        targetCameraLook.copy(playerPos.current);
        targetCameraLook.y += 0.75;
        
        lerpFactor = 0.08;
      }

      // Frame-rate independent camera tracking. We use exponential decay based on 'dt'
      // to make the movement perfectly smooth across all refresh rates, completely
      // eliminating VSync/frame-tick timing mismatches (jitter).
      const trackingSpeed = avatarShopOpenRef.current ? 12.0 : 7.5;
      const t = 1.0 - Math.exp(-trackingSpeed * dt);
      camera.position.lerp(targetCameraPos, t);

      // Instantly direct camera focus at target look-at point (keeps player perfectly framed as originally)
      camera.lookAt(targetCameraLook);

      // 10d. INTERPOLATE OTHER ONLINE PLAYERS WITH SMOOTH DRIFT
      Object.keys(allPlayers).forEach((pId) => {
        if (pId === myId) return;

        const info = allPlayers[pId];
        let pMesh = otherPlayerMeshes[pId];

        if (!otherAnimStates[pId]) {
          otherAnimStates[pId] = { 
            walkTime: 0, 
            idleTime: Math.random() * 10, 
            animIntensity: 0, 
            lastFaceY: info.ry || 0,
            loadedStyleId: info.avatarStyle
          };
        }

        if (pMesh) {
          if (otherAnimStates[pId].loadedStyleId !== info.avatarStyle) {
            scene.remove(pMesh);
            pMesh = buildRobotMesh(info.color, info.avatarStyle);
            pMesh.position.set(info.x, info.y, info.z);
            scene.add(pMesh);
            otherPlayerMeshes[pId] = pMesh;
            otherAnimStates[pId].loadedStyleId = info.avatarStyle;
          }
        } else {
          pMesh = buildRobotMesh(info.color, info.avatarStyle);
          pMesh.position.set(info.x, info.y, info.z);
          scene.add(pMesh);
          otherPlayerMeshes[pId] = pMesh;
          otherAnimStates[pId].loadedStyleId = info.avatarStyle;
        }

        // Calculate visual movement speed and direction
        const lastPos = new THREE.Vector3().copy(pMesh.position);
        const targetPos = new THREE.Vector3(info.x, info.y, info.z);
        pMesh.position.lerp(targetPos, 0.15); // beautifully smooth transition
        
        const otherMoveX = pMesh.position.x - lastPos.x;
        const otherMoveZ = pMesh.position.z - lastPos.z;
        const otherDispLen = Math.sqrt(otherMoveX * otherMoveX + otherMoveZ * otherMoveZ);
        const otherIsMoving = info.isMoving || (otherDispLen > 0.01);

        const aState = otherAnimStates[pId];
        if (aState.idleTime === undefined) {
          aState.idleTime = Math.random() * 10;
        }

        aState.idleTime += dt;

        if (otherIsMoving) {
          aState.animIntensity += (1.0 - aState.animIntensity) * 8.0 * dt;
          aState.walkTime += dt * 11.5; // sped up walking!

          if (otherDispLen > 0.005) {
            const dirVec = new THREE.Vector3(otherMoveX, 0, otherMoveZ).normalize();
            const dotVal = dirVec.dot(camRight);
            if (dotVal > 0.05) {
              aState.lastFaceY = 0; // face screen-right
            } else if (dotVal < -0.05) {
              aState.lastFaceY = Math.PI; // face screen-left
            }
          }
        } else {
          aState.animIntensity += (0.0 - aState.animIntensity) * 10.0 * dt;
        }

        const otherHop = Math.abs(Math.sin(aState.walkTime)) * 0.16 * aState.animIntensity;
        const otherIdleBob = Math.sin(aState.idleTime * 3.5) * 0.035 * (1.0 - aState.animIntensity);
        pMesh.position.y = 0.01 + otherHop + otherIdleBob;

        const otherWobble = Math.sin(aState.walkTime) * 0.06 * aState.animIntensity;
        const otherIdleWobble = Math.cos(aState.idleTime * 2.0) * 0.015 * (1.0 - aState.animIntensity);
        pMesh.rotation.z = otherWobble + otherIdleWobble;

        const otherScaleX = 1.0 + Math.sin(aState.idleTime * 3.5) * 0.02 * (1.0 - aState.animIntensity);
        const otherScaleY = 1.0 - Math.sin(aState.idleTime * 3.5) * 0.02 * (1.0 - aState.animIntensity);
        pMesh.scale.set(otherScaleX, otherScaleY, 1.0);

        // Smoothly rotate the rotator child to face left/right
        const oRotator = pMesh.getObjectByName("rotator");
        if (oRotator) {
          let oDiffY = aState.lastFaceY - oRotator.rotation.y;
          oDiffY = Math.atan2(Math.sin(oDiffY), Math.cos(oDiffY));
          oRotator.rotation.y += oDiffY * 12.0 * dt;
        }

        // (Dynamic billing disabled for other players to preserve locked non-billboard angle)
      });

      // --- 10e. PARTICLES TICK DRAWS ---
      // Update custom visual particles
      for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          if (p.mesh instanceof THREE.Mesh) {
            p.mesh.geometry.dispose();
          }
          const meshAny = p.mesh as any;
          if (Array.isArray(meshAny.material)) {
            meshAny.material.forEach((m: any) => m.dispose());
          } else if (meshAny.material) {
            meshAny.material.dispose();
          }
          activeParticles.splice(i, 1);
        } else {
          p.mesh.position.addScaledVector(p.velocity, dt);
          const ageRatio = 1.0 - (p.life / p.maxLife);
          
          // Smoother fade-in and fade-out envelope to avoid sudden pop-in
          let opacityFactor = 1.0;
          if (ageRatio < 0.3) {
            opacityFactor = ageRatio / 0.3; // ultra-smooth fade-in
          } else {
            opacityFactor = (1.0 - ageRatio) / 0.7; // smooth fade-out
          }

          // Growing puff effect for dust dissipation starting from almost 0
          const sizeFactor = 0.05 + 1.25 * ageRatio;
          const baseScale = p.baseScale || 1.0;
          p.mesh.scale.set(sizeFactor * baseScale, sizeFactor * baseScale, 1.0);
          
          const meshAny = p.mesh as any;
          if (p.mesh instanceof THREE.Sprite) {
            if (p.rotationSpeed) {
              meshAny.material.rotation += p.rotationSpeed * dt;
            }
            meshAny.material.opacity = 0.65 * opacityFactor;
          } else if (p.mesh instanceof THREE.Mesh && !Array.isArray(meshAny.material)) {
            meshAny.material.opacity = 0.9 * opacityFactor;
          }
        }
      }

      // Emit new walk particles based on physical distance traveled (completely uniform, zero stutter)
      if (isMoving) {
        const distMoved = playerPos.current.distanceTo(playerLastPos);
        if (distMoved < 5.0) { // filter out teleports/glitches
          localDistanceAccumulator += distMoved;
          // Emit every 0.85 virtual units walked to reduce clutter
          if (localDistanceAccumulator >= 0.85) {
            emitWalkParticle(playerPos.current);
            localDistanceAccumulator = 0;
          }
        }
      }
      playerLastPos.copy(playerPos.current);

      Object.keys(otherPlayerMeshes).forEach((oId) => {
        const oInfo = allPlayers[oId];
        const oMesh = otherPlayerMeshes[oId];
        const aState = otherAnimStates[oId];
        const otherIsMoving = oInfo && (oInfo.isMoving || (aState && aState.animIntensity > 0.15));

        if (otherIsMoving && oMesh) {
          if (!otherDistanceAccumulators[oId]) {
            otherDistanceAccumulators[oId] = {
              lastPos: new THREE.Vector3().copy(oMesh.position),
              distance: 0,
            };
          }
          const tracker = otherDistanceAccumulators[oId];
          const distMoved = oMesh.position.distanceTo(tracker.lastPos);
          if (distMoved < 5.0) {
            tracker.distance += distMoved;
            if (tracker.distance >= 0.85) {
              emitWalkParticle(oMesh.position);
              tracker.distance = 0;
            }
          }
          tracker.lastPos.copy(oMesh.position);
        }
      });

      // Remove players that left game
      Object.keys(otherPlayerMeshes).forEach((pId) => {
        if (!allPlayers[pId]) {
          scene.remove(otherPlayerMeshes[pId]);
          delete otherPlayerMeshes[pId];
          delete otherAnimStates[pId];
          delete otherDistanceAccumulators[pId];
        }
      });

      // 10e. THROTTLED POSITION BROADCAST TO WS SERVER (10 times per second)
      const now = Date.now();
      if (now - lastNetworkSend > 100) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "move",
            payload: {
              x: playerPos.current.x,
              y: playerPos.current.y,
              z: playerPos.current.z,
              rx: 0,
              ry: playerRotY.current,
              rz: 0,
              isMoving: isMoving
            }
          }));
        }
        lastNetworkSend = now;
      }

      // Direct sun shadow-casting window dynamically tracking the local player
      if (sunLight) {
        sunLight.position.set(
          playerPos.current.x + SCENE_CONFIG.dirLightPositionX,
          playerPos.current.y + SCENE_CONFIG.dirLightPositionY,
          playerPos.current.z + SCENE_CONFIG.dirLightPositionZ
        );
        sunLight.target.position.copy(playerPos.current);
        sunLight.target.updateMatrixWorld();
      }

      // 10f. PROJECT 3D PLAYER POSITIONS TO 2D SCREEN COORDINATES FOR BUBBLE OVERLAYS AND LERP SMOOTHLY
      if (mountRef.current) {
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        const tempV = new THREE.Vector3();

        // Clean up stale coordinates for disconnected players
        Object.keys(bubblePositionsRef.current).forEach((key) => {
          if (key !== myId && !allPlayers[key]) {
            delete bubblePositionsRef.current[key];
          }
        });

        // Project local player using stable, non-bouncing physics position
        if (playerPos.current) {
          tempV.copy(playerPos.current);
          tempV.y = 2.2; // fixed ground offset height for perfect non-jumping alignment
          tempV.project(camera);
          
          const targetX = (tempV.x * 0.5 + 0.5) * w;
          const targetY = (tempV.y * -0.5 + 0.5) * h;
          
          let currentPos = bubblePositionsRef.current[myId];
          if (!currentPos) {
            currentPos = { x: targetX, y: targetY };
            bubblePositionsRef.current[myId] = currentPos;
          } else {
            // Smoothly move current screen position towards target position (lerp factor 0.35)
            currentPos.x += (targetX - currentPos.x) * 0.35;
            currentPos.y += (targetY - currentPos.y) * 0.35;
          }
          
          const posX = Math.round(currentPos.x);
          const posY = Math.round(currentPos.y);
          
          const el = document.getElementById(`bubble-container-${myId}`);
          if (el) {
            const isMobile = window.innerWidth <= 768;
            const scaleVal = isMobile ? 1 : uiScale;
            const scaleStr = scaleVal !== 1 ? ` scale(${scaleVal})` : "";
            el.style.transform = `translate3d(${posX}px, ${posY}px, 0)${scaleStr}`;
            el.style.transformOrigin = "bottom center";
          }
        }

        // Project other players using stable, non-bouncing lerped position
        Object.keys(allPlayers).forEach((pId) => {
          if (pId === myId) return;
          const pMesh = otherPlayerMeshes[pId];
          if (pMesh) {
            tempV.copy(pMesh.position);
            tempV.y = 2.2; // fixed height above ground to avoid active bounce animations
            tempV.project(camera);
            
            const targetX = (tempV.x * 0.5 + 0.5) * w;
            const targetY = (tempV.y * -0.5 + 0.5) * h;
            
            let currentPos = bubblePositionsRef.current[pId];
            if (!currentPos) {
              currentPos = { x: targetX, y: targetY };
              bubblePositionsRef.current[pId] = currentPos;
            } else {
              // Smoothly move current screen position towards target position (lerp factor 0.35)
              currentPos.x += (targetX - currentPos.x) * 0.35;
              currentPos.y += (targetY - currentPos.y) * 0.35;
            }
            
            const posX = Math.round(currentPos.x);
            const posY = Math.round(currentPos.y);
            const el = document.getElementById(`bubble-container-${pId}`);
            if (el) {
              const isMobile = window.innerWidth <= 768;
              const scaleVal = isMobile ? 1 : uiScale;
              const scaleStr = scaleVal !== 1 ? ` scale(${scaleVal})` : "";
              el.style.transform = `translate3d(${posX}px, ${posY}px, 0)${scaleStr}`;
              el.style.transformOrigin = "bottom center";
            }
          }
        });
      }

      if (isRendererReady && renderer) {
        renderer.render(scene, camera);
      }
    };

    // Begin looping
    animFrameId = requestAnimationFrame(tick);

    // --- 11. Handle Resizing with ResizeObserver for precise container alignment ---
    const resizeObserver = new ResizeObserver((entries) => {
      if (!renderer || !mountRef.current) return;
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });

    if (mountRef.current) {
      resizeObserver.observe(mountRef.current);
    }

    // --- 12. Cleanup on Dismount ---
    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();

      scene.remove(localPlayerGroup);
      Object.values(otherPlayerMeshes).forEach((mesh) => scene.remove(mesh));

      // Dispose remaining particles
      activeParticles.forEach((p) => {
        scene.remove(p.mesh);
        if (p.mesh instanceof THREE.Mesh) {
          p.mesh.geometry.dispose();
        }
        const meshAny = p.mesh as any;
        if (Array.isArray(meshAny.material)) {
          meshAny.material.forEach((m: any) => m.dispose());
        } else if (meshAny.material) {
          meshAny.material.dispose();
        }
      });

      floorGeo.dispose();
      floorMat.dispose();
      floorTexture.dispose();
      gridCanvas.remove();

      renderer.dispose();
    };
  }, [roomInfo.obstacles, graphicsQuality]);

  // Handle Event Key Triggers without stealing focus while editing settings JSON
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      keysPressed.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      keysPressed.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Group active bubbles by player
  const bubblesByPlayer: Record<string, Array<ChatMessage & { createdAt: number }>> = {};
  activeBubbles.forEach(b => {
    if (!bubblesByPlayer[b.playerId]) {
      bubblesByPlayer[b.playerId] = [];
    }
    bubblesByPlayer[b.playerId].push(b);
  });

  return (
    <div ref={mountRef} className="w-full h-full relative overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full outline-none"
        style={{
          filter: `brightness(${SCENE_CONFIG.brightness}%) contrast(${SCENE_CONFIG.contrast}%) saturate(${SCENE_CONFIG.saturation}%)`
        }}
      />

      {/* 2D Overlay Chat Messages Bubbles */}
      {Object.keys(roomInfo.players).map(pId => {
        const playerBubbles = bubblesByPlayer[pId] || [];
        const pInfo = roomInfo.players[pId];
        if (!pInfo) return null;

        const initialPos = bubblePositionsRef.current[pId];
        const isMobileScreen = window.innerWidth <= 768;
        const scaleVal = isMobileScreen ? 1 : uiScale;
        const scaleStr = scaleVal !== 1 ? ` scale(${scaleVal})` : "";
        const initialTransform = initialPos 
          ? `translate3d(${Math.round(initialPos.x)}px, ${Math.round(initialPos.y)}px, 0)${scaleStr}` 
          : "translate3d(-9999px, -9999px, 0)";

        return (
          <div
            key={`bubble-player-${pId}`}
            id={`bubble-container-${pId}`}
            className="absolute top-0 left-0 pointer-events-none z-30"
            style={{
              transform: initialTransform,
              transformOrigin: "bottom center"
            }}
          >
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 w-[180px] md:w-[220px]">
              {/* Chat bubble list */}
              <AnimatePresence>
                {playerBubbles.map((b, idx) => {
                  const isLast = idx === playerBubbles.length - 1;
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="bg-black/95 backdrop-blur-md text-white rounded-full px-3.5 py-1 md:px-4.5 md:py-1.5 shadow-xl text-[11px] md:text-xs font-medium text-center leading-snug break-words w-max max-w-[160px] md:max-w-[200px] select-none relative border-0"
                    >
                      <span>{b.text}</span>
                      {isLast && (
                        <svg
                          width="16"
                          height="8"
                          viewBox="0 0 16 8"
                          className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 pointer-events-none"
                        >
                          <path
                            d="M0 0 C4 0, 5 7, 8 7 C11 7, 12 0, 16 0 Z"
                            fill="rgba(0,0,0,0.9)"
                          />
                        </svg>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Player Floating Nickname Tag */}
              <div className="flex items-center gap-1.5 justify-center select-none pointer-events-none transition-transform duration-250 hover:scale-105">
                <AdaptiveUsername
                  name={pInfo.name}
                  effect={pInfo.nameEffect || "none"}
                  color={pInfo.color}
                  size="sm"
                  isAdmin={pInfo.isAdmin}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
