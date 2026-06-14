import * as THREE from "three";
import React from "react";

// --- CLIENT-SIDE PLACE SCRIPT TYPES ---

export interface ClientPlaceContext {
  roomId: string;
  roomInfo: any;
  playerId: string;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: any; // EffectComposer
  ws: {
    send: (message: { type: string; payload?: any }) => void;
  };
  
  // Custom Dynamic React UI injection
  registerUI: (id: string, element: React.ReactNode) => void;
  unregisterUI: (id: string) => void;
  
  // Hook attachment mechanisms
  onUpdate: (callback: (dt: number, time: number) => void) => () => void;
  onServerMessage: (type: string, callback: (payload: any) => void) => () => void;
  onPlayerPositionSet: (callback: (pos: THREE.Vector3) => void) => () => void;
  
  // Core utility helpers
  queryGroundHeight: (x: number, y: number, z: number) => number;
  getLocalPlayerPos: () => THREE.Vector3;
  setLocalPlayerPos: (pos: THREE.Vector3) => void;
}

export interface ClientPlaceScript {
  init: (context: ClientPlaceContext) => void | Promise<void>;
  update?: (dt: number, time: number) => void;
  cleanup?: () => void;
  getLocalDeathState?: () => boolean;
}

// --- SERVER-SIDE PLACE SCRIPT TYPES ---

export interface ServerPlaceContext {
  roomId: string;
  room: any; // ServerRoom
  physicsWorld: any; // PhysicsWorld
  
  // Networking triggers
  broadcast: (message: any, excludeSocket?: any) => void;
  broadcastToPlayer: (playerId: string, message: any) => void;
  
  // Hooks
  onPlayerJoined: (callback: (playerId: string, player: any) => void) => void;
  onPlayerLeft: (callback: (playerId: string) => void) => void;
  onMessage: (type: string, callback: (playerId: string, payload: any) => void) => void;
  onTick: (callback: (dt: number) => void) => void;
}

export interface ServerPlaceScript {
  init: (context: ServerPlaceContext) => void | Promise<void>;
  cleanup?: () => void;
}
