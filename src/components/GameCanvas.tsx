import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Player, ChatMessage } from "../types";
import { encodeClientMove } from "../binaryProtocol";
import { motion, AnimatePresence } from "motion/react";
import AdaptiveUsername from "./AdaptiveUsername";
import VerifiedBadge from "./VerifiedBadge";
import ProximityPromptUI from "./ProximityPromptUI";
import DynamicJoystick from "./DynamicJoystick";
import { ClientScriptController } from "../game/ClientScriptController";
import { GameLocalization } from "../game/GameLocalization";
import CasualCoinsHUD from "./CasualCoinsHUD";

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
  graphicsQuality?: number; // 1 = Low (old Medium), 2 = Medium (old High), 3 = High (old Ultra)
  avatarShopOpen?: boolean;
  editingProfile?: boolean;
  avatars?: Array<{ name?: string; name_en?: string; name_ru?: string; cost: number; path: string; flags: string }>;
  avatarsTimestamp?: number;
  uiScale?: number;
  showHitboxes?: boolean;
  isChatVisible?: boolean;
  coins: number;
  onAddCoins: () => void;
  language: "ru" | "en";
  onOpenShop?: () => void;
  onOpenGift?: () => void;
}

interface WorldTriangle {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  normal: THREE.Vector3;
  min: THREE.Vector3;
  max: THREE.Vector3;
  isFloor: boolean;
}

function getClosestPointOnTriangle(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, out: THREE.Vector3) {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ac = new THREE.Vector3().subVectors(c, a);
  const ap = new THREE.Vector3().subVectors(p, a);
  const d1 = ab.dot(ap);
  const d2 = ac.dot(ap);
  if (d1 <= 0 && d2 <= 0) {
    out.copy(a);
    return;
  }

  const bp = new THREE.Vector3().subVectors(p, b);
  const d3 = ab.dot(bp);
  const d4 = ac.dot(bp);
  if (d3 >= 0 && d4 <= d3) {
    out.copy(b);
    return;
  }

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    out.copy(a).addScaledVector(ab, v);
    return;
  }

  const cp = new THREE.Vector3().subVectors(p, c);
  const d5 = ab.dot(cp);
  const d6 = ac.dot(cp);
  if (d6 >= 0 && d5 <= d6) {
    out.copy(c);
    return;
  }

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    out.copy(a).addScaledVector(ac, w);
    return;
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    out.copy(b).addScaledVector(new THREE.Vector3().subVectors(c, b), w);
    return;
  }

  const denom = 1.0 / (va + vb + vc);
  const vScale = vb * denom;
  const wScale = vc * denom;
  out.copy(a).addScaledVector(ab, vScale).addScaledVector(ac, wScale);
}

function extractWorldTriangles(mesh: THREE.Mesh): WorldTriangle[] {
  const triangles: WorldTriangle[] = [];
  const geometry = mesh.geometry;
  if (!geometry) return triangles;

  mesh.updateMatrixWorld(true);
  const matrix = mesh.matrixWorld;

  const positionAttr = geometry.attributes.position;
  if (!positionAttr) return triangles;

  const indexAttr = geometry.index;

  const getVertex = (idx: number, out: THREE.Vector3) => {
    out.set(
      positionAttr.getX(idx),
      positionAttr.getY(idx),
      positionAttr.getZ(idx)
    );
    out.applyMatrix4(matrix);
  };

  const numIndices = indexAttr ? indexAttr.count : positionAttr.count;

  for (let i = 0; i < numIndices; i += 3) {
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();

    if (indexAttr) {
      if (i + 2 < indexAttr.count) {
        getVertex(indexAttr.getX(i), a);
        getVertex(indexAttr.getX(i + 1), b);
        getVertex(indexAttr.getX(i + 2), c);
      } else {
        continue;
      }
    } else {
      if (i + 2 < positionAttr.count) {
        getVertex(i, a);
        getVertex(i + 1, b);
        getVertex(i + 2, c);
      } else {
        continue;
      }
    }

    const edge1 = new THREE.Vector3().subVectors(b, a);
    const edge2 = new THREE.Vector3().subVectors(c, a);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    const min = new THREE.Vector3(
      Math.min(a.x, b.x, c.x),
      Math.min(a.y, b.y, c.y),
      Math.min(a.z, b.z, c.z)
    );
    const max = new THREE.Vector3(
      Math.max(a.x, b.x, c.x),
      Math.max(a.y, b.y, c.y),
      Math.max(a.z, b.z, c.z)
    );

    const isFloor = normal.y > 0.5;

    triangles.push({ a, b, c, normal, min, max, isFloor });
  }

  return triangles;
}

const PLAYER_RADIUS = 0.53;
const CAPSULE_HEIGHT = 1.8;
const CAPSULE_LENGTH = Math.max(0.1, CAPSULE_HEIGHT - 2 * PLAYER_RADIUS);
const CAPSULE_CENTER_Y = (2 * PLAYER_RADIUS + CAPSULE_LENGTH) / 2;
const STAND_RADIUS = 0.42; // Thinner foot radius for ground-standing/snapping to avoid snapping when leaning against boxes/walls

function queryGroundHeight(x: number, y: number, z: number, mapTriangles: WorldTriangle[]): number {
  let activeGroundY = -999.0;
  const pQuery = new THREE.Vector3(x, y, z);
  const closestPt = new THREE.Vector3();

  for (let i = 0; i < mapTriangles.length; i++) {
    const tri = mapTriangles[i];
    if (!tri.isFloor) continue;

    if (x < tri.min.x - STAND_RADIUS || x > tri.max.x + STAND_RADIUS ||
        z < tri.min.z - STAND_RADIUS || z > tri.max.z + STAND_RADIUS) {
      continue;
    }

    getClosestPointOnTriangle(pQuery, tri.a, tri.b, tri.c, closestPt);

    const hDx = x - closestPt.x;
    const hDz = z - closestPt.z;
    if (hDx * hDx + hDz * hDz < STAND_RADIUS * STAND_RADIUS) {
      if (closestPt.y <= y + 0.35) {
        if (closestPt.y > activeGroundY) {
          activeGroundY = closestPt.y;
        }
      }
    }
  }
  return activeGroundY;
}

// Module-level GLTF cache so switching graphics settings (or re-rendering the ThreeJS viewport) 
// is completely instantaneous and doesn't trigger asynchronous network re-downloads/flickering.
interface GLTFCacheEntry {
  scene: THREE.Group;
  triangles: WorldTriangle[];
  spawnLoc: THREE.Vector3 | null;
}
let mapGltfCache: GLTFCacheEntry | null = null;

export default function GameCanvas({ playerId, roomInfo, ws, joystickRef, messages, graphicsQuality = 2, avatarShopOpen = false, editingProfile = false, avatars, avatarsTimestamp = 0, uiScale = 1, showHitboxes = false, isChatVisible = false, coins, onAddCoins, language, onOpenShop, onOpenGift }: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const uiScaleRef = useRef(uiScale);
  useEffect(() => {
    uiScaleRef.current = uiScale;
  }, [uiScale]);

  const getDynamicScaleVal = () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      return Math.min(1.25, Math.max(0.72, window.innerWidth / 375));
    }
    return uiScaleRef.current;
  };

  // Keep references to access inside the loop without re-running effects
  const playersStateRef = useRef<Record<string, Player>>(roomInfo.players);
  const playerIdRef = useRef<string>(playerId);

  // Spawning and room-transition tracking to ensure players aren't teleported on graphics changes
  const hasSpawnedRef = useRef(false);
  const previousRoomIdRef = useRef<string>("");
  useEffect(() => {
    if (roomInfo.id !== previousRoomIdRef.current) {
      previousRoomIdRef.current = roomInfo.id;
      hasSpawnedRef.current = false;
    }
  }, [roomInfo.id]);

  const avatarShopOpenRef = useRef(avatarShopOpen);
  useEffect(() => {
    avatarShopOpenRef.current = avatarShopOpen;
  }, [avatarShopOpen]);

  const editingProfileRef = useRef(editingProfile);
  useEffect(() => {
    editingProfileRef.current = editingProfile;
  }, [editingProfile]);

  const avatarsRef = useRef(avatars);
  useEffect(() => {
    avatarsRef.current = avatars;
  }, [avatars]);

  const avatarsTimestampRef = useRef(avatarsTimestamp);
  useEffect(() => {
    avatarsTimestampRef.current = avatarsTimestamp;
  }, [avatarsTimestamp]);

  const showHitboxesRef = useRef(showHitboxes);
  useEffect(() => {
    showHitboxesRef.current = showHitboxes;
  }, [showHitboxes]);

  const mobileJumpTriggered = useRef(false);

  // Active chat bubble tracking
  const [activeBubbles, setActiveBubbles] = useState<Array<ChatMessage & { createdAt: number }>>([]);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const bubblePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Roblox Proximity Prompt States & Refs
  const [promptVis, setPromptVis] = useState(false);
  const [promptProg, setPromptProg] = useState(0);
  const [hasFlashlight, setHasFlashlight] = useState(false);

  const promptVisRef = useRef(false);
  const promptProgRef = useRef(0);
  const hasFlashlightRef = useRef(false);
  const promptPosRef = useRef<{ x: number; y: number } | null>(null);
  const mobilePromptHeldRef = useRef(false);

  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const smoothMouseX = useRef(0);
  const smoothMouseY = useRef(0);

  // Interactive Button refs & state mapping
  const buttonMeshRef = useRef<THREE.Mesh | null>(null);
  const initialButtonYRef = useRef<number>(0);
  const buttonPressedStateRef = useRef<boolean>(false);
  const buttonPressedUntilRef = useRef<number>(0);
  const promptTriggeredRef = useRef<boolean>(false);

  // Custom script-driven UI injection state
  const [customUIElements, setCustomUIElements] = useState<Record<string, React.ReactNode>>({});
  const scriptControllerRef = useRef<ClientScriptController | null>(null);

  // Dynamic graphics quality refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const bloomPassRef = useRef<any | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  useEffect(() => {
    const maxPixelRatio = graphicsQuality === 1 ? 1.2 : (graphicsQuality === 2 ? 1.8 : 2.2);
    if (rendererRef.current) {
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    }
    if (sunLightRef.current) {
      sunLightRef.current.castShadow = graphicsQuality > 1;
    }
    if (bloomPassRef.current) {
      bloomPassRef.current.enabled = graphicsQuality > 1;
    }
  }, [graphicsQuality]);



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
  const cameraLook = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

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

    // Sync room-level button state if provided
    if ("buttonIsPressed" in roomInfo) {
      buttonPressedStateRef.current = !!(roomInfo as any).buttonIsPressed;
      buttonPressedUntilRef.current = (roomInfo as any).buttonPressedUntil || 0;
    }
  }, [roomInfo, playerId]);

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

    // Group to hold all static debug hitboxes & player collider
    const debugGroup = new THREE.Group();
    scene.add(debugGroup);

    // Dynamic physical balls caches and states for server-controlled obstacles
    const ballGeometry = new THREE.SphereGeometry(1, 16, 16);
    const ballMeshes = new Map<string, THREE.Object3D>();
    const ballStates = new Map<string, {
      id: string;
      x: number;
      y: number;
      z: number;
      radius: number;
      startX: number;
      startY: number;
      startZ: number;
      targetX: number;
      targetY: number;
      targetZ: number;
      color: string;
      lerpTime: number;
    }>();

    let cameraShakeIntensity = 0;
    let cameraShakeTime = 0;

    const handleWsEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.type === "bomb_exploded_fx") {
        cameraShakeIntensity = 1.6; // High, rapid, smooth shake
        cameraShakeTime = 0;
      }
    };

    const handleButtonStateChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        buttonPressedStateRef.current = !!detail.isPressed;
        buttonPressedUntilRef.current = detail.pressedUntil || 0;
      }
    };

    const handlePhysicsSync = (e: Event) => {
      const bodies = (e as CustomEvent).detail as any[];
      if (!Array.isArray(bodies)) return;

      const receivedIds = new Set<string>();

      bodies.forEach(body => {
        receivedIds.add(body.id);

        let state = ballStates.get(body.id);
        if (!state) {
          state = {
            id: body.id,
            x: body.x,
            y: body.y,
            z: body.z,
            radius: body.radius,
            startX: body.x,
            startY: body.y,
            startZ: body.z,
            targetX: body.x,
            targetY: body.y,
            targetZ: body.z,
            color: body.color || "#ffffff",
            lerpTime: 1
          };
          ballStates.set(body.id, state);
        } else {
          // Slide old extrapolated targets into start positions
          state.startX = state.x;
          state.startY = state.y;
          state.startZ = state.z;
          state.targetX = body.x;
          state.targetY = body.y;
          state.targetZ = body.z;
          state.radius = body.radius;
          state.color = body.color || state.color;
          state.lerpTime = 0; // reset lerp to slide over next 100ms
        }

        // Add 3D representation if absent
        if (!ballMeshes.has(body.id)) {
          let mesh: THREE.Object3D;
          if (body.replicatedType === "bomb" && (window as any).cachedBombMesh) {
            // Clone the beautiful pre-configured Bomb object from our cache
            const bombClone = (window as any).cachedBombMesh.clone();
            bombClone.visible = true;
            mesh = bombClone;
          } else {
            const ballMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(state.color),
              roughness: 0.15,
              metalness: 0.15,
              envMapIntensity: 1.5,
            });
            const sMesh = new THREE.Mesh(ballGeometry, ballMat);
            sMesh.castShadow = true;
            sMesh.receiveShadow = true;
            sMesh.scale.setScalar(state.radius);
            mesh = sMesh;
          }
          mesh.position.set(state.x, state.y, state.z);

          // Add a wireframe sphere for the ball's hitbox
          const wireframeGeo = new THREE.SphereGeometry(1.005, 12, 12);
          const wireframeMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff, // distinct cyan color
            wireframe: true,
            transparent: true,
            opacity: 0.8,
            depthTest: false,
            depthWrite: false
          });
          const wireframeMesh = new THREE.Mesh(wireframeGeo, wireframeMat);
          wireframeMesh.name = "hitboxWireframe";
          wireframeMesh.visible = showHitboxesRef.current;
          if (body.id.startsWith("bomb")) {
            wireframeMesh.scale.setScalar(0.5); // scales child wireframe down to representing actual 1.0x physics radius
          }
          mesh.add(wireframeMesh);

          scene.add(mesh);
          ballMeshes.set(body.id, mesh);
        }
      });

      // Cleanup bodies that are no longer replicated
      ballMeshes.forEach((mesh, id) => {
        if (!receivedIds.has(id)) {
          scene.remove(mesh);
          const hitbox = mesh.getObjectByName("hitboxWireframe") as THREE.Mesh;
          if (hitbox) {
            hitbox.geometry.dispose();
            if (Array.isArray(hitbox.material)) {
              hitbox.material.forEach((m: any) => m.dispose());
            } else {
              hitbox.material.dispose();
            }
          }
          if (mesh instanceof THREE.Mesh) {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((m: any) => m.dispose());
              } else {
                mesh.material.dispose();
              }
            }
          } else {
            // Traverse visual bomb groups and clean up their meshes' details
            mesh.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach((m: any) => m.dispose());
                  } else {
                    child.material.dispose();
                  }
                }
              }
            });
          }
          ballMeshes.delete(id);
          ballStates.delete(id);
        }
      });
    };

    document.addEventListener("physics_sync", handlePhysicsSync as any);
    document.addEventListener("button_state_changed", handleButtonStateChange as any);
    document.addEventListener("ws_event", handleWsEvent as any);

    // Build wireframe lines representing our custom high-fidelity floor and wall static colliders
    const buildWireframeFromTriangles = (triangles: WorldTriangle[]) => {
      const positions: number[] = [];
      triangles.forEach(tri => {
        positions.push(tri.a.x, tri.a.y, tri.a.z);
        positions.push(tri.b.x, tri.b.y, tri.b.z);

        positions.push(tri.b.x, tri.b.y, tri.b.z);
        positions.push(tri.c.x, tri.c.y, tri.c.z);

        positions.push(tri.c.x, tri.c.y, tri.c.z);
        positions.push(tri.a.x, tri.a.y, tri.a.z);
      });

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xff3333,
        depthWrite: false,
        depthTest: true,
        transparent: true,
        opacity: 0.8
      });
      return new THREE.LineSegments(geom, mat);
    };

    // Load panoramic sky background (equirectangular sky dome)
    let loadedSkyTexture: THREE.Texture | null = null;
    const skyUrl = new URL("../assets/sprites/Sky.jpg", import.meta.url).href;
    const skyTextureLoader = new THREE.TextureLoader();
    skyTextureLoader.load(skyUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture; // Global reflection source for all materials!
      loadedSkyTexture = texture;

      // Automatically apply to any material in the scene that wants environment/reflection
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          // Skip the lasers so they don't reflect the sky texture, keeping them purely unshaded and red
          if (child.name?.includes("laser") || child.userData?.isLaser) {
            return;
          }
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => {
            if ("envMap" in mat) {
              (mat as any).envMap = texture;
              mat.needsUpdate = true;
            }
          });
        }
      });
    }, undefined, (err) => {
      console.warn("Failed to load sky texture, status: ", err);
    });

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

    // Apply graphicsQuality presets (1: Low, 2: Medium, 3: High)
    let maxPixelRatio = 2.0;
    let shadowsEnabled = true;
    let shadowMapSize = 1024;
    let antialiasEnabled = false; // Disable anti-aliasing by default to improve sharpness/perf

    if (graphicsQuality === 1) { // Low
      maxPixelRatio = 1.2;
      shadowsEnabled = false;
      antialiasEnabled = false;
    } else if (graphicsQuality === 2) { // Medium
      maxPixelRatio = 1.8;
      shadowsEnabled = true;
      shadowMapSize = 1024; // Increased resolution for cleaner shadows
      antialiasEnabled = false;
    } else if (graphicsQuality === 3) { // High
      maxPixelRatio = 2.2;
      shadowsEnabled = true;
      shadowMapSize = 2048; // Ultra resolution for pixel-perfect soft shadows
      antialiasEnabled = true; // MSAA enabled on highest settings
    }

    // --- 3. Renderer Setup ---
    // Stable, highly optimized WebGLRenderer with flawless shadow, fog, and reflection compile support
    let isRendererReady = true;
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: antialiasEnabled,
      powerPreference: "high-performance",
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    rendererRef.current = renderer;
    
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = shadowsEnabled;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Beautiful, extremely soft blurry cartoon shadows!
    }
    renderer.toneMapping = SCENE_CONFIG.toneMapping;
    renderer.toneMappingExposure = SCENE_CONFIG.exposure;

    // --- 3.5 Post-Processing (OutlinePass for Roblox Highlight Outline) ---
    // Use high precision HalfFloatType render target to fully eliminate color banding/stripes on surfaces in post-processing
    const composerSize = renderer.getDrawingBufferSize(new THREE.Vector2());
    const composerTarget = new THREE.WebGLRenderTarget(composerSize.width, composerSize.height, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    const composer = new EffectComposer(renderer, composerTarget);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const outlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      scene,
      camera
    );
    // Roblox Highlight-style pure white sharp outline
    outlinePass.edgeStrength = 10.0;     // Extremely sharp boundary
    outlinePass.edgeGlow = 0.0;         // Clean flat color, no neon glow as requested
    outlinePass.edgeThickness = 1.35;    // Neat thickness
    outlinePass.pulsePeriod = 0.0;      // No pulsing animation
    outlinePass.visibleEdgeColor.set("#ffffff"); // Solid pure white
    outlinePass.hiddenEdgeColor.set("#ffffff");  // Even when blocked
    composer.addPass(outlinePass);

    // --- 3.6 Unreal Bloom Pass (Beautiful Dreamy Glow!) ---
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.15,   // bloomStrength (0.15 per user's tuned setup)
      0.0,    // bloomRadius (0.0 per user's tuned setup)
      1.0     // bloomThreshold (1.0 per user's tuned setup)
    );
    bloomPass.enabled = graphicsQuality > 1;
    composer.addPass(bloomPass);
    bloomPassRef.current = bloomPass;

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // --- 4. Lights Setup ---
    // Lavender/purple-tinted ambient light supply
    const ambientLight = new THREE.AmbientLight(SCENE_CONFIG.ambientLightColor, SCENE_CONFIG.ambientLightIntensity);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

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
    sunLight.shadow.radius = 3.0;

    // Expanded shadow casting frustum to prevent clipping at a distance
    const d = 36;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    // Set a small positive shadow bias to completely eliminate shadow acne/banding stripes on the floor/surfaces
    sunLight.shadow.bias = 0.00015;
    sunLight.shadow.normalBias = 0.04;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

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
      roughness: 0.15,
      metalness: 0.16,
      envMapIntensity: 0.2, // Slightly higher reflections
      envMap: loadedSkyTexture || undefined,
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Store custom high-precision colliders (triangles)
    const mapTriangles: WorldTriangle[] = [];

    const setupInteractiveMaterials = (sceneGroup: THREE.Group) => {
      // Find and cache the high-fidelity Bomb mesh from map.glb, keeping it hidden on start
      sceneGroup.traverse((child) => {
        if (child.name === "Bomb" || child.name === "bomb" || child.name.toLowerCase() === "bomb") {
          child.visible = false;
          (window as any).cachedBombMesh = child;
        }
      });

      // Find and hold a reference to our physical interactive Button mesh and its default local height
      const foundBtn = sceneGroup.getObjectByName("Button");
      if (foundBtn && foundBtn instanceof THREE.Mesh) {
        buttonMeshRef.current = foundBtn;
        if (foundBtn.userData.originalY === undefined) {
          foundBtn.userData.originalY = foundBtn.position.y;
        }
        initialButtonYRef.current = foundBtn.userData.originalY;
        
        // Clone material so we can dynamically adjust colors without side-effects on shared mesh materials
        if (Array.isArray(foundBtn.material)) {
          foundBtn.material = foundBtn.material.map(m => m.clone());
        } else if (foundBtn.material) {
          foundBtn.material = foundBtn.material.clone();
        }
        
        const mats = Array.isArray(foundBtn.material) ? foundBtn.material : [foundBtn.material];
        mats.forEach((mat: any) => {
          if (mat && "emissive" in mat) {
            mat.emissive = new THREE.Color("#00E736");
            if ("emissiveIntensity" in mat) {
              mat.emissiveIntensity = 2.0;
            }
          }
          if (mat && "roughness" in mat) {
            mat.roughness = 1.0;
          }
          if (mat && "metalness" in mat) {
            mat.metalness = 0.0;
          }
        });
      }

      sceneGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Keep beautiful pre-configured materials and roughness directly from the GLTF file!
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
              if ("envMapIntensity" in mat) {
                (mat as any).envMapIntensity = 0.25; // Standard subtle environmental reflection intensity
              }
              if (loadedSkyTexture && "envMap" in mat) {
                (mat as any).envMap = loadedSkyTexture;
              }

              mat.needsUpdate = true;
            });
          }
        }
      });
    };

    const initScriptController = () => {
      if (scriptControllerRef.current) {
        scriptControllerRef.current.cleanup();
      }
      scriptControllerRef.current = new ClientScriptController(
        roomInfo.id,
        roomInfo,
        playerId,
        scene,
        camera,
        renderer,
        composer,
        ws,
        (id, element) => setCustomUIElements(prev => ({ ...prev, [id]: element })),
        (id) => setCustomUIElements(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        }),
        (x, y, z) => queryGroundHeight(x, y, z, mapTriangles),
        () => playerPos.current,
        (pos) => {
          playerPos.current.copy(pos);
          if (scriptControllerRef.current) {
            scriptControllerRef.current.triggerPositionSet(pos);
          }
        }
      );
    };

    if (mapGltfCache) {
      // Memory Cache hit: Instantly add cloned model and bypass network load
      const cachedScene = mapGltfCache.scene.clone();
      scene.add(cachedScene);
      floor.visible = false;
      setupInteractiveMaterials(cachedScene);
      mapTriangles.push(...mapGltfCache.triangles);
      debugGroup.add(buildWireframeFromTriangles(mapGltfCache.triangles));

      if (mapGltfCache.spawnLoc && !hasSpawnedRef.current) {
        playerPos.current.copy(mapGltfCache.spawnLoc);
        hasSpawnedRef.current = true;
      }
      initScriptController();
    } else {
      // Memory Cache miss: Fetch map.glb asynchronously 
      const mapUrl = new URL("../assets/models/map.glb", import.meta.url).href;
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        mapUrl,
        (gltf) => {
          scene.add(gltf.scene);
          floor.visible = false;
          setupInteractiveMaterials(gltf.scene);

          // Extract high-precision world triangles for collision
          const extractedTriangles: WorldTriangle[] = [];
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.name !== "Spawn" && child.name !== "Bomb" && child.name !== "bomb" && !child.name.toLowerCase().includes("bomb") && !child.name.includes("Sky") && !child.name.includes("Light") && !child.name.toLowerCase().includes("button")) {
                extractedTriangles.push(...extractWorldTriangles(child));
              }
            }
          });

          mapTriangles.push(...extractedTriangles);
          debugGroup.add(buildWireframeFromTriangles(extractedTriangles));

          // Extract Spawn position
          let spawnLoc: THREE.Vector3 | null = null;
          const spawnObj = gltf.scene.getObjectByName("Spawn");
          if (spawnObj) {
            spawnLoc = new THREE.Vector3();
            spawnObj.getWorldPosition(spawnLoc);
            if (!hasSpawnedRef.current) {
              playerPos.current.copy(spawnLoc);
              hasSpawnedRef.current = true;
            }
          }

          // Populate cache so next quality shifts are 100% instant
          mapGltfCache = {
            scene: gltf.scene,
            triangles: extractedTriangles,
            spawnLoc: spawnLoc
          };
          initScriptController();
        },
        undefined,
        (err) => {
          console.warn("Failed to load map.glb, keeping grid floor. Error details: ", err);
        }
      );
    }

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
      sprite.position.y = pos.y + 0.05 + Math.random() * 0.08;
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

    const emitLandingParticles = (pos: THREE.Vector3) => {
      for (let i = 0; i < 6; i++) {
        const useType1 = Math.random() < 0.5;
        const tex = useType1 ? particle1Texture : particle2Texture;

        const pMat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
        });

        const sprite = new THREE.Sprite(pMat);
        
        const angle = (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const speed = 1.35 + Math.random() * 0.75;
        const distance = 0.22;

        sprite.position.copy(pos);
        sprite.position.x += Math.cos(angle) * distance;
        sprite.position.y = pos.y + 0.05 + Math.random() * 0.04;
        sprite.position.z += Math.sin(angle) * distance;

        const baseScale = 0.32 + Math.random() * 0.28;
        sprite.scale.set(0.05 * baseScale, 0.05 * baseScale, 1.0);

        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          0.38 + Math.random() * 0.38,
          Math.sin(angle) * speed
        );

        sprite.material.rotation = Math.random() * Math.PI * 2;
        const rotationSpeed = (Math.random() - 0.5) * 4.0;

        const maxLife = 0.35 + Math.random() * 0.25;

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
      }
    };

    // --- 7. Player Meshes Dictionary ---
    const localPlayerGroup = new THREE.Group();
    scene.add(localPlayerGroup);

    // Collision capsule wireframe for local player (matches actual PLAYER_RADIUS)
    const localPlayerColliderGeo = new THREE.CapsuleGeometry(PLAYER_RADIUS, CAPSULE_LENGTH, 8, 8);
    const localPlayerColliderMat = new THREE.MeshBasicMaterial({
      color: 0x33ff33, // distinct green for local player
      wireframe: true,
      transparent: true,
      opacity: 0.7,
      depthTest: false
    });
    const localPlayerColliderMesh = new THREE.Mesh(localPlayerColliderGeo, localPlayerColliderMat);
    localPlayerColliderMesh.position.y = CAPSULE_CENTER_Y;
    localPlayerColliderMesh.visible = false;
    debugGroup.add(localPlayerColliderMesh);

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

    const textureCache: Record<string, THREE.Texture> = {};

    function getAvatarTexture(styleId: number): THREE.Texture {
      const currentTimestamp = avatarsTimestampRef.current || 0;
      const cacheKey = `${styleId}_${currentTimestamp}`;
      if (textureCache[cacheKey]) return textureCache[cacheKey];

      const activeAvatars = avatarsRef.current || defaultAvatars;
      const avatarDef = activeAvatars[styleId];
      if (!avatarDef) return playerTexture;

      const url = `https://cdn.jsdelivr.net/gh/calloradj-png/NodeAvatars@main/${avatarDef.path}?t=${currentTimestamp}`;
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

      textureCache[cacheKey] = tex;
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
        opacity: 1.0,
        side: THREE.DoubleSide,
        color: 0xffffff, // Keep it neutral white so the player's custom sprite colors are displayed prinstinely!
        alphaTest: 0.25, // Cutout threshold to let Three.js cast actual paper-style sprite shape shadows!
        roughness: 0.7,
        metalness: 0.1,
        envMapIntensity: 0.15,
        envMap: loadedSkyTexture || undefined,
      });

      const bodyMesh = new THREE.Mesh(bodyGeo, faceMat);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = false; // Prevent receiving self-shadows incorrectly
      rotator.add(bodyMesh);

      g.add(cardGroup);

      // Collision capsule wireframe for player (matches actual PLAYER_RADIUS)
      const colGeo = new THREE.CapsuleGeometry(PLAYER_RADIUS, CAPSULE_LENGTH, 8, 8);
      const colMat = new THREE.MeshBasicMaterial({
        color: 0xff33ff,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
        depthTest: false
      });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.name = "collisionWireframe";
      colMesh.position.y = CAPSULE_CENTER_Y;
      colMesh.visible = false;
      g.add(colMesh);

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

    // --- 8. Flashlight & Proximity Prompt Setup (Removed as requested) ---
    const playInteractionBeep = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {
        console.warn("Audio Context blocked: ", e);
      }
    };

    // Golden sparkler celebratory particle explosion
    const emitCelebrationParticles = (pos: THREE.Vector3) => {
      for (let i = 0; i < 28; i++) {
        const useType1 = Math.random() < 0.5;
        const tex = useType1 ? particle1Texture : particle2Texture;

        const pMat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
          color: 0xffca28 // Shimmering gold sparklers
        });

        const sprite = new THREE.Sprite(pMat);
        sprite.position.copy(pos);
        sprite.position.x += (Math.random() - 0.5) * 0.4;
        sprite.position.y += (Math.random() - 0.5) * 0.4;
        sprite.position.z += (Math.random() - 0.5) * 0.4;

        const baseScale = 0.35 + Math.random() * 0.45;
        sprite.scale.set(0.1, 0.1, 1.0);

        const angle = Math.random() * Math.PI * 2;
        const pitch = (Math.random() - 0.5) * Math.PI;
        const speed = 1.3 + Math.random() * 1.6;
        const velocity = new THREE.Vector3(
          Math.cos(angle) * Math.cos(pitch) * speed,
          Math.abs(Math.sin(pitch)) * speed + 0.5,
          Math.sin(angle) * Math.cos(pitch) * speed
        );

        const rotationSpeed = (Math.random() - 0.5) * 6.0;
        const maxLife = 0.8 + Math.random() * 0.6;

        scene.add(sprite);
        activeParticles.push({
          mesh: sprite,
          velocity,
          life: maxLife,
          maxLife,
          type: "walk",
          rotationSpeed,
          baseScale
        });
      }
    };



    // --- 9. Physics parameters ---
    const MAX_SPEED = 7.5; // cozy movement speed
    const keyboard = keysPressed.current;

    // Smooth movement animation states
    let localWalkTime = 0;
    let localAnimIntensity = 0;
    let localIdleTime = 0;
    let localWasOnGround = true;
    let localLandingSquish = 0;
    let localLandingSquishVel = 0;
    let localHighestAirY = playerPos.current.y;
    const otherAnimStates: Record<string, { 
      walkTime: number; 
      idleTime: number; 
      animIntensity: number; 
      lastFaceY: number; 
      loadedStyleId?: number; 
      wasOnGround?: boolean; 
      landingSquish?: number;
      landingSquishVel?: number;
      physPos?: THREE.Vector3;
    }> = {};

    let localDistanceAccumulator = 0;
    const playerLastPos = new THREE.Vector3().copy(playerPos.current);
    const otherDistanceAccumulators: Record<string, { lastPos: THREE.Vector3; distance: number }> = {};

    const clock = new THREE.Clock();
    let animFrameId: number;
    let lastNetworkSend = 0;
    const lastSentPos = new THREE.Vector3();
    let lastSentRotY = 0;
    let lastSentIsMoving = false;

    // --- 10. Frame Tick Animation Loop ----
    const tick = () => {
      animFrameId = requestAnimationFrame(tick);

      const dt = Math.min(clock.getDelta(), 0.1); // clamp logic glitches
      if (dt <= 0) return;

      if (scriptControllerRef.current) {
        scriptControllerRef.current.update(dt, clock.getElapsedTime());
      }



      const myId = playerIdRef.current;
      const allPlayers = playersStateRef.current;
      const activeMe = allPlayers[myId];
      const isLocalPlayerDead = !!activeMe?.isDead || !!scriptControllerRef.current?.isPlayerLocallyDead?.();

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

      // --- 10*. Roblox Proximity Flashlight calculations (flashlight removed) ---
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

      if (isLocalPlayerDead) {
        inputX = 0;
        inputZ = 0;
        playerVel.current.set(0, 0, 0);
        if (playerPos.current.y < -15.0) {
          playerPos.current.y = -15.0;
        }
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

      const isFocusedOnInput = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
      const isJumpAllowed = !avatarShopOpenRef.current && !editingProfileRef.current && !isFocusedOnInput;

      // Calculate dynamic ground height from high-fidelity map triangles underneath the player with proper hysteresis
      const mapLoaded = mapTriangles.length > 0;
      let activeGroundY = mapLoaded ? -999.0 : 4.0;
      const pPos = playerPos.current;
      const currentStandRad = localWasOnGround ? (STAND_RADIUS * 1.15) : (STAND_RADIUS * 0.9);

      mapTriangles.forEach((tri) => {
        // Fast AABB check in XZ plane with current standing radius to detect standing overlap strictly
        if (pPos.x < tri.min.x - currentStandRad || pPos.x > tri.max.x + currentStandRad ||
            pPos.z < tri.min.z - currentStandRad || pPos.z > tri.max.z + currentStandRad) {
          return;
        }

        // Only flat/mostly horizontal platforms (isFloor) can act as ground
        if (!tri.isFloor) return;

        // Query the closest point on the triangle to player's ground level
        const closestPt = new THREE.Vector3();
        getClosestPointOnTriangle(pPos, tri.a, tri.b, tri.c, closestPt);

        // Check if player's XZ falls within hysteresis standing radius of the closest point on the triangle
        const hDx = pPos.x - closestPt.x;
        const hDz = pPos.z - closestPt.z;
        const hDist = Math.sqrt(hDx * hDx + hDz * hDz);

        if (hDist < currentStandRad) {
          const isAbovePlatform = pPos.y >= closestPt.y - 0.05;
          const isFallingOrWalking = playerVel.current.y <= 0.05;
          // Step-climbing (up to 0.28 units) is only allowed when already grounded, preventing airborne jitter-snaps
          const maxStepOrOvershoot = (isFallingOrWalking && localWasOnGround) ? 0.28 : 0.02;

          const isWithinVertRange = (closestPt.y - pPos.y >= -0.05) && (closestPt.y - pPos.y <= maxStepOrOvershoot);

          if (isAbovePlatform || isWithinVertRange) {
            if (closestPt.y > activeGroundY) {
              activeGroundY = closestPt.y;
            }
          }
        }
      });

      let wantsToJump = (keyboard["Space"] || mobileJumpTriggered.current) && isJumpAllowed;
      if (isLocalPlayerDead) {
        wantsToJump = false;
      }
      mobileJumpTriggered.current = false; // consume trigger

      const isOnGround = playerPos.current.y <= activeGroundY + 0.01;
      const gravity = 25.0; // comfy gravity
      const jumpStrength = 10.0; // comfy jump height/inertia

      if (isOnGround) {
        playerPos.current.y = activeGroundY;
        if (playerVel.current.y < 0) {
          playerVel.current.y = 0;
        }
        if (wantsToJump) {
          playerVel.current.y = jumpStrength;
        }
      } else {
        // Apply gravity
        playerVel.current.y -= gravity * dt;
      }

      // Update position (vertical)
      playerPos.current.y += playerVel.current.y * dt;

      // Prevent going below ground bounds
      if (playerPos.current.y < activeGroundY) {
        playerPos.current.y = activeGroundY;
        playerVel.current.y = 0;
      }

      // Arena outer boundaries removed per user request to allow models outside map bounds

      // Check high-fidelity map triangle lateral (wall/column) collisions
      mapTriangles.forEach((tri) => {
        // Fast AABB check in XZ first
        if (pPos.x < tri.min.x - PLAYER_RADIUS || pPos.x > tri.max.x + PLAYER_RADIUS ||
            pPos.z < tri.min.z - PLAYER_RADIUS || pPos.z > tri.max.z + PLAYER_RADIUS) {
          return;
        }

        // Floor triangles only act as ground to stand on; they must NEVER push the player horizontally
        if (tri.isFloor) {
          return;
        }

        // Step height threshold: if the top edge of this obstacle/wall is below the player's soft step height (0.32 units high from feet),
        // we ignore it as a horizontal wall; this prevents sudden ejections/sliding when standing near the edge of boxes!
        if (tri.max.y <= pPos.y + 0.32) {
          return;
        }

        // Must overlap in Y (player vertical bounding span: [pPos.y, pPos.y + 2.4])
        if (pPos.y + 2.4 < tri.min.y - 0.05 || pPos.y > tri.max.y + 0.05) {
          return;
        }

        // Find closest point on the triangle to player's vertical axis at this triangle's height
        const targetY = Math.max(tri.min.y, Math.min(pPos.y + 1.2, tri.max.y));
        const pQuery = new THREE.Vector3(pPos.x, targetY, pPos.z);
        const closestPt = new THREE.Vector3();
        getClosestPointOnTriangle(pQuery, tri.a, tri.b, tri.c, closestPt);

        // Horizontal push-out
        const diffX = pPos.x - closestPt.x;
        const diffZ = pPos.z - closestPt.z;
        const horizontalDist = Math.sqrt(diffX * diffX + diffZ * diffZ);

        if (horizontalDist < PLAYER_RADIUS) {
          const overlap = PLAYER_RADIUS - horizontalDist;
          const pushDir = new THREE.Vector3(diffX, 0, diffZ);
          if (pushDir.lengthSq() < 0.0001) {
            // Push along triangle's face normal horizontally
            pushDir.set(tri.normal.x, 0, tri.normal.z);
            if (pushDir.lengthSq() < 0.0001) {
              pushDir.set(1, 0, 0);
            } else {
              pushDir.normalize();
            }
          } else {
            pushDir.normalize();
          }

          // Smooth out sudden lateral collision snaps (especially when falling off platforms)
          // by limiting the maximum snap distance per frame, making the transition seamless.
          // Grounded collisions still resolve instantly, while falling/airborne collisions slide off beautifully.
          const maxSnap = localWasOnGround ? overlap : Math.max(1.8 * dt, Math.min(overlap, 6.0 * dt + overlap * 0.1));
          const snapApplied = Math.min(overlap, maxSnap);
          pPos.x += pushDir.x * snapApplied;
          pPos.z += pushDir.z * snapApplied;

          // Slide along wall surface by canceling velocity directed inside
          const dot = playerVel.current.x * pushDir.x + playerVel.current.z * pushDir.z;
          if (dot < 0) {
            playerVel.current.x -= pushDir.x * dot;
            playerVel.current.z -= pushDir.z * dot;
          }
        }
      });

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

      // Kinematic collisions with dynamic server-simulated physical balls
      ballStates.forEach((ball) => {
        const closestY = Math.max(playerPos.current.y, Math.min(ball.y, playerPos.current.y + CAPSULE_HEIGHT));
        const pAxisPt = new THREE.Vector3(playerPos.current.x, closestY, playerPos.current.z);
        const ballPos3D = new THREE.Vector3(ball.x, ball.y, ball.z);
        const dist = pAxisPt.distanceTo(ballPos3D);
        const minDist = ball.radius + PLAYER_RADIUS;

        if (dist < minDist) {
          const overlap = minDist - dist;
          const pushDir = new THREE.Vector3().subVectors(pAxisPt, ballPos3D);
          if (pushDir.lengthSq() < 0.0001) {
            pushDir.set(1, 0, 0);
          } else {
            pushDir.normalize();
          }

          // Push player out in 3D (allows sliding over smaller balls or standing on larger ones!)
          playerPos.current.x += pushDir.x * overlap;
          playerPos.current.y += pushDir.y * overlap;
          playerPos.current.z += pushDir.z * overlap;

          // Slide velocity
          const dot = playerVel.current.x * pushDir.x + playerVel.current.y * pushDir.y + playerVel.current.z * pushDir.z;
          if (dot < 0) {
            playerVel.current.x -= pushDir.x * dot;
            playerVel.current.y -= pushDir.y * dot;
            playerVel.current.z -= pushDir.z * dot;
          }
          
          if (pushDir.y > 0.5) {
            // Stand on top of the ball dynamically!
            const standHeight = ball.y + ball.radius;
            if (standHeight > activeGroundY) {
              activeGroundY = standHeight;
            }
          }
        }
      });

      // Interpolate and rotate dynamic server-controlled dynamic sphere bodies
      ballStates.forEach((state, id) => {
        const mesh = ballMeshes.get(id);
        if (mesh) {
          state.lerpTime += dt * 10; // server replication is 10Hz (every 100ms)
          const t = Math.min(1, state.lerpTime);
          state.x = THREE.MathUtils.lerp(state.startX, state.targetX, t);
          state.y = THREE.MathUtils.lerp(state.startY, state.targetY, t);
          state.z = THREE.MathUtils.lerp(state.startZ, state.targetZ, t);
          mesh.position.set(state.x, state.y, state.z);
          // Visually scale the bomb to be exactly 3.0x larger (1.5x bigger than before) while keeping the actual physics hitbox un-scaled
          if (id.startsWith("bomb")) {
            mesh.scale.setScalar(state.radius * 3.0);
          } else {
            mesh.scale.setScalar(state.radius);
          }

          // Slowly and smoothly blink red if this is a bomb
          if (id.startsWith("bomb")) {
            const elapsed = clock.getElapsedTime();
            // Pulse smoothly using a sine wave
            const pulse = (Math.sin(elapsed * Math.PI) + 1) / 2;
            
            mesh.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((mat) => {
                  if ("color" in mat && !mat.userData.savedColor) {
                    mat.userData.savedColor = mat.color.clone();
                  }
                  if ("emissive" in mat && !mat.userData.savedEmissive) {
                    mat.userData.savedEmissive = (mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000));
                  }
                  
                  if (mat && "color" in mat && mat.userData.savedColor) {
                    const orig = mat.userData.savedColor as THREE.Color;
                    mat.color.copy(orig).lerp(new THREE.Color(0xff0000), pulse * 0.85);
                  }
                  if (mat && "emissive" in mat && mat.userData.savedEmissive) {
                    const orig = mat.userData.savedEmissive as THREE.Color;
                    mat.emissive.copy(orig).lerp(new THREE.Color(0xff0000), pulse * 0.85);
                    if ("emissiveIntensity" in mat) {
                      mat.emissiveIntensity = pulse * 2.0;
                    }
                  }
                });
              }
            });
          }

          // Update ball hitbox visibility
          const hitbox = mesh.getObjectByName("hitboxWireframe");
          if (hitbox) {
            hitbox.visible = showHitboxesRef.current;
          }

          // Rotate dynamic balls on client proportionate to velocity for full 3D rolling physics!
          const vx = (state.targetX - state.startX) / 0.1;
          const vz = (state.targetZ - state.startZ) / 0.1;
          const speed = Math.sqrt(vx * vx + vz * vz);
          if (speed > 0.1) {
            const rotAxis = new THREE.Vector3(-vz, 0, vx).normalize();
            const angleDelta = (speed / state.radius) * dt;
            mesh.rotateOnWorldAxis(rotAxis, angleDelta);
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

      if (isLocalPlayerDead) {
        localPlayerGroup.visible = false;
        localPlayerColliderMesh.visible = false;
      } else {
        localPlayerGroup.visible = true;
        localPlayerColliderMesh.visible = showHitboxesRef.current;
      }

      // Update local player collider wireframe position and visibility
      localPlayerColliderMesh.position.copy(playerPos.current);
      localPlayerColliderMesh.position.y += CAPSULE_CENTER_Y;
      debugGroup.visible = showHitboxesRef.current;

      // Animate interactive button position and material colors smoothly
      if (buttonMeshRef.current) {
        const targetY = buttonPressedStateRef.current 
          ? (initialButtonYRef.current - 0.04) // Depress button slightly downwards
          : initialButtonYRef.current;
        
        const blend = 1.0 - Math.exp(-12.0 * dt);
        buttonMeshRef.current.position.y += (targetY - buttonMeshRef.current.position.y) * blend;

        const mats = Array.isArray(buttonMeshRef.current.material)
          ? buttonMeshRef.current.material
          : [buttonMeshRef.current.material];

        const targetColorHex = buttonPressedStateRef.current ? "#ff0000" : "#00E736";
        const targetEmissiveHex = buttonPressedStateRef.current ? "#ff0000" : "#00E736";
        const targetIntensity = buttonPressedStateRef.current ? 5.7 : 2.0;

        const tempColor = new THREE.Color(targetColorHex);
        const tempEmissive = new THREE.Color(targetEmissiveHex);

        mats.forEach((mat: any) => {
          if (mat.color) {
            mat.color.lerp(tempColor, blend);
          }
          if (mat.emissive) {
            mat.emissive.lerp(tempEmissive, blend);
          }
          if ("emissiveIntensity" in mat) {
            mat.emissiveIntensity = targetIntensity;
          }
          if ("roughness" in mat) {
            mat.roughness = 1.0; // Maximum roughness to remove any specular highlight/glossiness completely
          }
          if ("metalness" in mat) {
            mat.metalness = 0.0; // No metalness
          }
        });
      }
      
      // Smoothly fade walking animations in and out
      if (isMoving) {
        localAnimIntensity += (1.0 - localAnimIntensity) * 8.0 * dt;
        localWalkTime += dt * 11.5; // sped up walking animation speed! (was 6.5)
      } else {
        localAnimIntensity += (0.0 - localAnimIntensity) * 10.0 * dt;
      }

      localIdleTime += dt;

      // Handle landing trigger with harmonic spring physics
      const currentIsOnGround = playerPos.current.y <= activeGroundY + 0.01;
      
      if (!currentIsOnGround) {
        if (localWasOnGround) {
          localHighestAirY = playerPos.current.y;
        } else {
          localHighestAirY = Math.max(localHighestAirY, playerPos.current.y);
        }
      }

      if (currentIsOnGround) {
        if (!localWasOnGround) {
          // Landing impact! Only trigger effects if they actually fell down at least 0.45 units
          const fallDistance = localHighestAirY - activeGroundY;
          if (fallDistance > 0.45) {
            localLandingSquishVel = -3.8;
            emitLandingParticles(playerPos.current);
          }
        }
        // Damped harmonic oscillator equations (F = -kx - cv)
        const k = 145.0; // Spring stiffness
        const c = 11.5;  // Spring damping
        const force = -k * localLandingSquish - c * localLandingSquishVel;
        localLandingSquishVel += force * dt;
        localLandingSquish += localLandingSquishVel * dt;
        localHighestAirY = activeGroundY; // reset
      } else {
        localLandingSquish = 0;
        localLandingSquishVel = 0;
      }
      localWasOnGround = currentIsOnGround;

      const relativeHeight = Math.max(0, playerPos.current.y - activeGroundY);
      const airRatio = Math.min(1.0, relativeHeight / 1.55);
      const groundBlend = 1.0 - airRatio;

      // Dynamic walking bounce (hop) and side-to-side wobble blended with a cozy squishy idle breathing animation
      const walkHop = Math.abs(Math.sin(localWalkTime)) * 0.16 * localAnimIntensity * groundBlend;
      const idleBob = Math.sin(localIdleTime * 3.5) * 0.035 * (1.0 - localAnimIntensity) * groundBlend;
      localPlayerGroup.position.y = playerPos.current.y + 0.01 + walkHop + idleBob;
      
      const walkWobble = Math.sin(localWalkTime) * 0.06 * localAnimIntensity * groundBlend;
      const idleWobble = Math.cos(localIdleTime * 2.0) * 0.015 * (1.0 - localAnimIntensity) * groundBlend;
      localPlayerGroup.rotation.z = walkWobble + idleWobble;

      // Squishy cartoon stretch and squash with modern landing physics
      let targetScaleX = 1.0;
      let targetScaleY = 1.0;

      if (!currentIsOnGround) {
        // Continuous organic air deformation depending on vertical speed!
        const yVel = playerVel.current.y;
        const apexWeight = Math.exp(-(yVel * yVel) / 12.0); // 1.0 at peak (0 velocity), decays smoothly

        let targetVelX = 1.0;
        let targetVelY = 1.0;
        if (yVel > 0) {
          const stretchAmount = yVel * 0.012;
          targetVelX = 1.0 - stretchAmount;
          targetVelY = 1.0 + stretchAmount;
        } else {
          const stretchAmount = Math.abs(yVel) * 0.010;
          targetVelX = 1.0 - stretchAmount * 0.8;
          targetVelY = 1.0 + stretchAmount;
        }

        // Beautiful continuous blend between flying stretch and cozy apex float squish
        targetScaleX = targetVelX * (1.0 - apexWeight) + 1.08 * apexWeight;
        targetScaleY = targetVelY * (1.0 - apexWeight) + 0.92 * apexWeight;

        // Apply visual safety boundaries to prevent unnatural extreme deformations
        targetScaleX = Math.max(0.85, Math.min(1.08, targetScaleX));
        targetScaleY = Math.max(0.92, Math.min(1.15, targetScaleY));
      } else {
        // Normal breaths blended with soft oscillating landing spring
        const idleScaleX = 1.0 + Math.sin(localIdleTime * 3.5) * 0.02 * (1.0 - localAnimIntensity);
        const idleScaleY = 1.0 - Math.sin(localIdleTime * 3.5) * 0.02 * (1.0 - localAnimIntensity);

        // When localLandingSquish is negative (squashed), we expand width / reduce height:
        targetScaleX = idleScaleX - (localLandingSquish * 0.5);
        targetScaleY = idleScaleY + (localLandingSquish * 0.45);
      }

      // Smoothly interpolate current visual scales to make animations extremely soft & fluid
      const tScale = 1.0 - Math.exp(-15.0 * dt);
      localPlayerGroup.scale.x += (targetScaleX - localPlayerGroup.scale.x) * tScale;
      localPlayerGroup.scale.y += (targetScaleY - localPlayerGroup.scale.y) * tScale;
      localPlayerGroup.scale.z = 1.0;

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

      if (isLocalPlayerDead) {
        // Position camera relative to the center of the arena (0, 0, 0)
        const center = new THREE.Vector3(0, 0, 0);
        targetCameraLook.copy(center);

        // Standard cozy 45-degree angle (isometric style, but far back and stationary)
        const deadOffset = new THREE.Vector3(-12.0, 10.0, 12.0);

        // Smoothly tilt the camera look-at direction ("its head") based on PC mouse cursor
        const isMobileDeviceCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ("ontouchstart" in window);
        if (!isMobileDeviceCheck) {
          // Lerp the mouse inputs smoothly
          smoothMouseX.current += (mouseX.current - smoothMouseX.current) * (1.0 - Math.exp(-6.0 * dt));
          smoothMouseY.current += (mouseY.current - smoothMouseY.current) * (1.0 - Math.exp(-6.0 * dt));

          // Horizontal look shift (panning parallel to camera's horizontal view axis: vector [1, 0, 1])
          const panX = smoothMouseX.current * 4.0;
          targetCameraLook.x += panX;
          targetCameraLook.z += panX;

          // Vertical look shift (tilting directly up/down along Y axis)
          // smoothMouseY is positive when cursor is UP, negative when cursor is DOWN.
          targetCameraLook.y += smoothMouseY.current * 4.0;
        } else {
          smoothMouseX.current = 0;
          smoothMouseY.current = 0;
        }

        targetCameraPos.copy(center).add(deadOffset);
        lerpFactor = 0.04; // smooth flying
      } else if (avatarShopOpenRef.current) {
        // High-angle diagonal view from above with elegant shift to the right to keep avatar visible
        const shopOffset = new THREE.Vector3(-2.5, 2.4, 2.5);

        targetCameraPos.copy(playerPos.current).add(shopOffset);
        targetCameraLook.copy(playerPos.current);

        targetCameraLook.y += 1.15; // Beautiful overhead framing
        // Off-center shift camera more to the right (visually pushes player further leftwards)
        const camRightVec = new THREE.Vector3(1, 0, 1).normalize();
        const pShiftAmount = 1.25;
        const cameraShiftVec = camRightVec.clone().multiplyScalar(pShiftAmount);
        targetCameraPos.add(cameraShiftVec);
        targetCameraLook.add(cameraShiftVec);

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
      let trackingSpeed = 7.5;
      if (avatarShopOpenRef.current) {
        trackingSpeed = 12.0;
      } else if (isLocalPlayerDead) {
        trackingSpeed = 3.2; // Slow, smooth float-up transition
      }

      const t = 1.0 - Math.exp(-trackingSpeed * dt);
      camera.position.lerp(targetCameraPos, t);

      // Smooth and rapid camera shake on explosion
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      let shakeOffsetZ = 0;
      if (cameraShakeIntensity > 0.01) {
        cameraShakeTime += dt * 55; // Fast frequency for rapid shaking
        shakeOffsetX = Math.sin(cameraShakeTime) * cameraShakeIntensity * 0.45;
        shakeOffsetY = Math.cos(cameraShakeTime * 0.9) * cameraShakeIntensity * 0.35;
        shakeOffsetZ = Math.sin(cameraShakeTime * 1.25) * cameraShakeIntensity * 0.45;
        cameraShakeIntensity *= Math.exp(-5.0 * dt); // Exponential decay (resolves quickly and smoothly)
      } else {
        cameraShakeIntensity = 0;
      }

      if (cameraShakeIntensity > 0) {
        camera.position.x += shakeOffsetX;
        camera.position.y += shakeOffsetY;
        camera.position.z += shakeOffsetZ;

        targetCameraLook.x += shakeOffsetX * 0.6;
        targetCameraLook.y += shakeOffsetY * 0.6;
        targetCameraLook.z += shakeOffsetZ * 0.6;
      }

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
            loadedStyleId: info.avatarStyle,
            wasOnGround: true,
            landingSquish: 0
          };
        }

        const aState = otherAnimStates[pId];

        if (pMesh) {
          if (aState.loadedStyleId !== info.avatarStyle) {
            scene.remove(pMesh);
            pMesh = buildRobotMesh(info.color, info.avatarStyle);
            pMesh.position.set(info.x, info.y, info.z);
            scene.add(pMesh);
            otherPlayerMeshes[pId] = pMesh;
            aState.loadedStyleId = info.avatarStyle;
          }
        } else {
          pMesh = buildRobotMesh(info.color, info.avatarStyle);
          pMesh.position.set(info.x, info.y, info.z);
          scene.add(pMesh);
          otherPlayerMeshes[pId] = pMesh;
          aState.loadedStyleId = info.avatarStyle;
        }

        // Maintain extremely clean physical coordinates to calculate movement speeds,
        // bounds, and orientation completely isolated from visual bouncing offsets.
        if (!aState.physPos) {
          aState.physPos = new THREE.Vector3(info.x, info.y, info.z);
        }

        const lastPhysPos = new THREE.Vector3().copy(aState.physPos);
        const targetPos = new THREE.Vector3(info.x, info.y, info.z);
        
        // Beautifully smooth physical transition
        aState.physPos.lerp(targetPos, 0.15);
        
        const otherMoveX = aState.physPos.x - lastPhysPos.x;
        const otherMoveZ = aState.physPos.z - lastPhysPos.z;
        const otherMoveY = aState.physPos.y - lastPhysPos.y;
        const estimatedVelY = otherMoveY / Math.max(0.001, dt);
        const otherDispLen = Math.sqrt(otherMoveX * otherMoveX + otherMoveZ * otherMoveZ);
        const otherIsMoving = info.isMoving || (otherDispLen > 0.01);

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

        const otherGroundY = queryGroundHeight(aState.physPos.x, aState.physPos.y, aState.physPos.z, mapTriangles);
        const otherRelativeHeight = Math.max(0, aState.physPos.y - otherGroundY);

        // Handle other landing trigger with robust raw-height noise hysteresis and spring physics
        if (aState.wasOnGround === undefined) aState.wasOnGround = true;
        if (aState.landingSquish === undefined) aState.landingSquish = 0;
        if (aState.landingSquishVel === undefined) aState.landingSquishVel = 0;

        // Hysteresis threshold to count as high vertical flying state
        if (otherRelativeHeight > 0.45) {
          aState.wasOnGround = false;
        }

        let triggeredLanding = false;
        // Strict ground-contact threshold coupled with pre-existing flying state
        if (!aState.wasOnGround && otherRelativeHeight <= 0.02) {
          aState.wasOnGround = true;
          triggeredLanding = true;
        }

        const otherIsOnGround = aState.physPos.y <= otherGroundY + 0.02;

        if (triggeredLanding) {
          // Instant landing impulse without interpolation delays!
          aState.landingSquishVel = -3.8;
          emitLandingParticles(new THREE.Vector3(aState.physPos.x, otherGroundY + 0.02, aState.physPos.z));
        }

        // Apply visual landing damping feedback when either touching physically or reacting to impulse
        if (otherIsOnGround || Math.abs(aState.landingSquish) > 0.001) {
          const k = 145.0;
          const c = 11.5;
          const force = -k * aState.landingSquish - c * aState.landingSquishVel;
          aState.landingSquishVel += force * dt;
          aState.landingSquish += aState.landingSquishVel * dt;
        } else {
          aState.landingSquish = 0;
          aState.landingSquishVel = 0;
        }

        const otherAirRatio = Math.min(1.0, otherRelativeHeight / 1.55);
        const otherGroundBlend = 1.0 - otherAirRatio;

        const otherHop = Math.abs(Math.sin(aState.walkTime)) * 0.16 * aState.animIntensity * otherGroundBlend;
        const otherIdleBob = Math.sin(aState.idleTime * 3.5) * 0.035 * (1.0 - aState.animIntensity) * otherGroundBlend;
        
        // Write the visual coordinates to pMesh: position on plane + height bounce
        pMesh.position.x = aState.physPos.x;
        pMesh.position.z = aState.physPos.z;
        pMesh.position.y = aState.physPos.y + 0.01 + otherHop + otherIdleBob;

        const otherWobble = Math.sin(aState.walkTime) * 0.06 * aState.animIntensity * otherGroundBlend;
        const otherIdleWobble = Math.cos(aState.idleTime * 2.0) * 0.015 * (1.0 - aState.animIntensity) * otherGroundBlend;
        pMesh.rotation.z = otherWobble + otherIdleWobble;

        let oScaleX = 1.0;
        let oScaleY = 1.0;

        if (!otherIsOnGround) {
          const yVelOther = estimatedVelY;
          const apexWeightOther = Math.exp(-(yVelOther * yVelOther) / 12.0);

          let targetVelX = 1.0;
          let targetVelY = 1.0;
          if (yVelOther > 0) {
            const stretchAmount = yVelOther * 0.012;
            targetVelX = 1.0 - stretchAmount;
            targetVelY = 1.0 + stretchAmount;
          } else {
            const stretchAmount = Math.abs(yVelOther) * 0.010;
            targetVelX = 1.0 - stretchAmount * 0.8;
            targetVelY = 1.0 + stretchAmount;
          }

          oScaleX = targetVelX * (1.0 - apexWeightOther) + 1.08 * apexWeightOther;
          oScaleY = targetVelY * (1.0 - apexWeightOther) + 0.92 * apexWeightOther;

          oScaleX = Math.max(0.85, Math.min(1.08, oScaleX));
          oScaleY = Math.max(0.92, Math.min(1.15, oScaleY));
        } else {
          const oscScaleX = 1.0 + Math.sin(aState.idleTime * 3.5) * 0.02 * (1.0 - aState.animIntensity);
          const oscScaleY = 1.0 - Math.sin(aState.idleTime * 3.5) * 0.02 * (1.0 - aState.animIntensity);

          oScaleX = oscScaleX - (aState.landingSquish * 0.5);
          oScaleY = oscScaleY + (aState.landingSquish * 0.45);
        }

        // Smoothly interpolate current visual scales for online players
        const tScaleOther = 1.0 - Math.exp(-15.0 * dt);
        pMesh.scale.x += (oScaleX - pMesh.scale.x) * tScaleOther;
        pMesh.scale.y += (oScaleY - pMesh.scale.y) * tScaleOther;
        pMesh.scale.z = 1.0;

        // Smoothly rotate the rotator child to face left/right
        const oRotator = pMesh.getObjectByName("rotator");
        if (oRotator) {
          let oDiffY = aState.lastFaceY - oRotator.rotation.y;
          oDiffY = Math.atan2(Math.sin(oDiffY), Math.cos(oDiffY));
          oRotator.rotation.y += oDiffY * 12.0 * dt;
        }

        // Update collision wireframe visibility for other player
        const colWire = pMesh.getObjectByName("collisionWireframe");
        if (colWire) {
          colWire.visible = showHitboxesRef.current;
        }

        // Force other players' visible meshes to be hidden when they are dead on the server
        pMesh.visible = !info.isDead;

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

        if (otherIsMoving && oMesh && aState && aState.physPos) {
          if (!otherDistanceAccumulators[oId]) {
            otherDistanceAccumulators[oId] = {
              lastPos: new THREE.Vector3().copy(aState.physPos),
              distance: 0,
            };
          }
          const tracker = otherDistanceAccumulators[oId];
          const distMoved = aState.physPos.distanceTo(tracker.lastPos);
          if (distMoved < 5.0) {
            tracker.distance += distMoved;
            if (tracker.distance >= 0.85) {
              emitWalkParticle(aState.physPos);
              tracker.distance = 0;
            }
          }
          tracker.lastPos.copy(aState.physPos);
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

      // 10e. THROTTLED POSITION BROADCAST TO WS SERVER (10 times per second if position/rotation changed)
      const now = Date.now();
      if (now - lastNetworkSend > 100) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          const distanceThreshold = 0.005;
          const rotationThreshold = 0.005;
          const posChanged = playerPos.current.distanceTo(lastSentPos) > distanceThreshold;
          const rotChanged = Math.abs(playerRotY.current - lastSentRotY) > rotationThreshold;
          const moveStateChanged = isMoving !== lastSentIsMoving;

          if (posChanged || rotChanged || moveStateChanged) {
            const buf = encodeClientMove(
              playerPos.current.x,
              playerPos.current.y,
              playerPos.current.z,
              0,
              playerRotY.current,
              0,
              isMoving
            );
            ws.send(buf);

            lastSentPos.copy(playerPos.current);
            lastSentRotY = playerRotY.current;
            lastSentIsMoving = isMoving;
          }
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
          tempV.y = playerPos.current.y + 2.2; // include physical height + head spacing offset
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
            const scaleVal = getDynamicScaleVal();
            const scaleStr = scaleVal !== 1 ? ` scale(${scaleVal})` : "";
            el.style.transform = `translate3d(${posX}px, ${posY}px, 0)${scaleStr}`;
            el.style.transformOrigin = "bottom center";
          }
        }

        // Project other players using stable, non-bouncing lerped position
        Object.keys(allPlayers).forEach((pId) => {
          if (pId === myId) return;
          const pMesh = otherPlayerMeshes[pId];
          const info = allPlayers[pId];
          const aState = otherAnimStates[pId];
          if (pMesh && info && aState && aState.physPos) {
            tempV.copy(aState.physPos);
            tempV.y = aState.physPos.y + 2.2; // include physical height + head spacing offset
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
              const scaleVal = getDynamicScaleVal();
              const scaleStr = scaleVal !== 1 ? ` scale(${scaleVal})` : "";
              el.style.transform = `translate3d(${posX}px, ${posY}px, 0)${scaleStr}`;
              el.style.transformOrigin = "bottom center";
            }
          }
        });

        // Project physical Button Proximity Prompt screen location if visible
        let showPrompt = false;
        if (buttonMeshRef.current) {
          const buttonPos = new THREE.Vector3();
          buttonMeshRef.current.getWorldPosition(buttonPos);
          const dist = playerPos.current.distanceTo(buttonPos);

          // Render prompt if the player is within 3.5 meters of the button AND the button is not pressed
          if (dist <= 3.5 && !buttonPressedStateRef.current) {
            showPrompt = true;

            const tempPromptV = new THREE.Vector3().copy(buttonPos);
            tempPromptV.y += 0.25; // position slightly above the physical button mesh
            tempPromptV.project(camera);

            const targetX = (tempPromptV.x * 0.5 + 0.5) * w;
            const targetY = (tempPromptV.y * -0.5 + 0.5) * h;

            let currentPos = promptPosRef.current;
            if (!currentPos) {
              currentPos = { x: targetX, y: targetY };
              promptPosRef.current = currentPos;
            } else {
              // Smoothly move current screen position towards target position (lerp factor 0.35)
              currentPos.x += (targetX - currentPos.x) * 0.35;
              currentPos.y += (targetY - currentPos.y) * 0.35;
            }

            const posX = currentPos.x.toFixed(2);
            const posY = currentPos.y.toFixed(2);

            const el = document.getElementById("proximity-prompt-container");
            if (el) {
              const scaleVal = getDynamicScaleVal();
              const scaleStr = scaleVal !== 1 ? ` scale(${scaleVal})` : "";
              el.style.transform = `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%)${scaleStr}`;
              el.style.transformOrigin = "center center";
            }
          } else {
            promptPosRef.current = null;
          }
        }

        // Sync visibility of proximity prompt UI
        if (promptVisRef.current !== showPrompt) {
          promptVisRef.current = showPrompt;
          setPromptVis(showPrompt);
        }

        // Detect and dispatch instant (0 sec Hold) button press inputs
        const isEPressed = !!(keysPressed.current["KeyE"] || mobilePromptHeldRef.current);
        if (showPrompt && isEPressed && !buttonPressedStateRef.current) {
          if (!promptTriggeredRef.current) {
            promptTriggeredRef.current = true;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "button_press", payload: {} }));
            }
          }
        } else if (!isEPressed) {
          promptTriggeredRef.current = false;
        }
      }

      if (isRendererReady && renderer) {
        composer.render();
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
          composer.setSize(w, h);
        }
      }
    });

    if (mountRef.current) {
      resizeObserver.observe(mountRef.current);
    }

    // --- 12. Cleanup on Dismount ---
    return () => {
      if (scriptControllerRef.current) {
        scriptControllerRef.current.cleanup();
        scriptControllerRef.current = null;
      }
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      document.removeEventListener("physics_sync", handlePhysicsSync as any);
      document.removeEventListener("button_state_changed", handleButtonStateChange as any);
      document.removeEventListener("ws_event", handleWsEvent as any);

      ballMeshes.forEach((mesh) => {
        scene.remove(mesh);
        const hitbox = mesh.getObjectByName("hitboxWireframe") as THREE.Mesh;
        if (hitbox) {
          hitbox.geometry.dispose();
          if (Array.isArray(hitbox.material)) {
            hitbox.material.forEach((m: any) => m.dispose());
          } else {
            hitbox.material.dispose();
          }
        }
        if (mesh instanceof THREE.Mesh) {
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m: any) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        } else {
          mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((m: any) => m.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });
        }
      });
      ballGeometry.dispose();

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

      outlinePass.dispose();
      outputPass.dispose();
      composer.dispose();
      renderer.dispose();
    };
  }, [roomInfo.obstacles]);

  // Handle Event Key Triggers without stealing focus while editing settings JSON
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
      }
      keysPressed.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      keysPressed.current[e.code] = false;
    };
    const handleCustomJump = () => {
      mobileJumpTriggered.current = true;
    };
    const handleCustomJumpHeld = (e: Event) => {
      const customEvent = e as CustomEvent;
      const active = customEvent.detail && typeof customEvent.detail === "object" && "active" in customEvent.detail ? !!customEvent.detail.active : false;
      keysPressed.current["Space"] = active;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.current = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY.current = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("local-player-jump", handleCustomJump);
    window.addEventListener("local-player-jump-held", handleCustomJumpHeld);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("local-player-jump", handleCustomJump);
      window.removeEventListener("local-player-jump-held", handleCustomJumpHeld);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ("ontouchstart" in window);

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
        const scaleVal = getDynamicScaleVal();
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
              {!pInfo.isDead && (
                <div className="flex items-center gap-1.5 justify-center select-none pointer-events-none transition-transform duration-250 hover:scale-105">
                  <AdaptiveUsername
                    name={pInfo.name}
                    effect={pInfo.nameEffect || "none"}
                    color={pInfo.color}
                    size="sm"
                    isAdmin={pInfo.isAdmin}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Custom modular script HUD injections with platform-aligned dynamic scaling */}
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-45 overflow-hidden"
        style={isMobileDevice ? undefined : {
          transform: `scale(${uiScale})`,
          transformOrigin: "top left",
          width: `${100 / uiScale}%`,
          height: `${100 / uiScale}%`,
          transition: "transform 400ms cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        {Object.values(customUIElements)}
      </div>

      {/* Virtual Dynamic / Floating Joystick for Mobile */}
      {isMobileDevice && !editingProfile && !avatarShopOpen && joystickRef && (
        <DynamicJoystick joystickRef={joystickRef as React.MutableRefObject<{ x: number; y: number } | null>} />
      )}

      {/* Casual Coins HUD (Left Center Y) - Mounted inside the actual Game Canvas for perfect design sandboxing */}
      {!editingProfile && (
        <div
          className={`absolute left-5 z-40 pointer-events-none -translate-y-1/2 ${
            !isMobileDevice && isChatVisible ? "top-[66%]" : "top-[50%]"
          }`}
          style={isMobileDevice ? undefined : {
            transformOrigin: "left center",
            transition: "transform 400ms cubic-bezier(0.16, 1, 0.3, 1), top 400ms cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <CasualCoinsHUD
            coins={coins}
            onAddCoins={onAddCoins}
            language={language}
            uiScale={uiScale}
            isMobile={isMobileDevice}
            onOpenShop={onOpenShop}
            onOpenGift={onOpenGift}
          />
        </div>
      )}

      {/* Render Roblox Proximity Prompt Overlay */}
      <div
        id="proximity-prompt-container"
        className="absolute top-0 left-0 pointer-events-auto z-50 flex items-center justify-center select-none"
        style={{
          transform: "translate3d(-9999px, -9999px, 0)",
          pointerEvents: promptVis ? "auto" : "none"
        }}
        onPointerDown={() => {
          mobilePromptHeldRef.current = true;
        }}
        onPointerUp={() => {
          mobilePromptHeldRef.current = false;
        }}
        onPointerLeave={() => {
          mobilePromptHeldRef.current = false;
        }}
      >
        <ProximityPromptUI
          visible={promptVis}
          progress={0}
          actionText={GameLocalization.t("proximityPress")}
          holdText={GameLocalization.t("proximityButton")}
          keyIndicator="E"
          isMobile={/Mobi|Android/i.test(navigator.userAgent)}
        />
      </div>
    </div>
  );
}
