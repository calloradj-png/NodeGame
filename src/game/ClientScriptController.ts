import * as THREE from "three";
import React from "react";
import { ClientPlaceContext, ClientPlaceScript } from "./PlaceScriptTypes";

// Place Script Registrations
import { DefaultPlaceClient } from "./client_scripts/DefaultPlaceClient";
import { ToonGardenClient } from "./client_scripts/ToonGardenClient";

const SCRIPTS_MAP: Record<string, new () => ClientPlaceScript> = {
  "neon-temple": ToonGardenClient,
};

export class ClientScriptController {
  private activeScript: ClientPlaceScript | null = null;
  private activeContext: ClientPlaceContext | null = null;
  private updateCallbacks: Array<(dt: number, time: number) => void> = [];
  private serverMessageCallbacks: Map<string, Array<(payload: any) => void>> = new Map();
  private positionSetCallbacks: Array<(pos: THREE.Vector3) => void> = [];

  private wsEventBound = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail && detail.type) {
      this.handleServerMessage(detail.type, detail.payload);
    }
  };

  constructor(
    private roomId: string,
    private roomInfo: any,
    private playerId: string,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private renderer: THREE.WebGLRenderer,
    private composer: any,
    private ws: WebSocket | null,
    private registerUI: (id: string, element: React.ReactNode) => void,
    private unregisterUI: (id: string) => void,
    private queryGroundHeightFn: (x: number, y: number, z: number) => number,
    private getLocalPlayerPosFn: () => THREE.Vector3,
    private setLocalPlayerPosFn: (pos: THREE.Vector3) => void
  ) {
    document.addEventListener("ws_event", this.wsEventBound);
    this.initScript();
  }

  private initScript() {
    // Cleanup any existing script
    this.cleanup();

    // Re-register ws_event receiver (since cleanup removes it)
    document.addEventListener("ws_event", this.wsEventBound);

    // Determine script constructor
    const ScriptClass = SCRIPTS_MAP[this.roomId] || (this.roomInfo && SCRIPTS_MAP[this.roomInfo.mode]) || ToonGardenClient;
    this.activeScript = new ScriptClass();

    // Fabricate ClientPlaceContext
    this.activeContext = {
      roomId: this.roomId,
      roomInfo: this.roomInfo,
      playerId: this.playerId,
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      composer: this.composer,
      ws: {
        send: (msg) => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
          }
        }
      },
      registerUI: this.registerUI,
      unregisterUI: this.unregisterUI,
      onUpdate: (callback) => {
        this.updateCallbacks.push(callback);
        return () => {
          this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
        };
      },
      onServerMessage: (type, callback) => {
        if (!this.serverMessageCallbacks.has(type)) {
          this.serverMessageCallbacks.set(type, []);
        }
        this.serverMessageCallbacks.get(type)!.push(callback);
        return () => {
          const list = this.serverMessageCallbacks.get(type);
          if (list) {
            this.serverMessageCallbacks.set(type, list.filter(cb => cb !== callback));
          }
        };
      },
      onPlayerPositionSet: (callback) => {
        this.positionSetCallbacks.push(callback);
        return () => {
          this.positionSetCallbacks = this.positionSetCallbacks.filter(cb => cb !== callback);
        };
      },
      queryGroundHeight: this.queryGroundHeightFn,
      getLocalPlayerPos: this.getLocalPlayerPosFn,
      setLocalPlayerPos: this.setLocalPlayerPosFn,
    };

    console.log(`[ScriptController] Initializing place script for room ${this.roomId}`);
    try {
      this.activeScript.init(this.activeContext);
    } catch (err) {
      console.error(`[ScriptController] Script init error in room ${this.roomId}:`, err);
    }
  }

  /**
   * Dispatches periodic frame ticks to the place script callbacks
   */
  public update(dt: number, time: number) {
    // Run direct active update
    if (this.activeScript && this.activeScript.update) {
      try {
        this.activeScript.update(dt, time);
      } catch (err) {
        console.error(`[ScriptController] Script update tick failed:`, err);
      }
    }

    // Run registered update callbacks
    this.updateCallbacks.forEach(callback => {
      try {
        callback(dt, time);
      } catch (err) {
        console.error(`[ScriptController] Registered update callback failed:`, err);
      }
    });
  }

  /**
   * Processes custom server messages routed through WebSocket
   */
  public handleServerMessage(type: string, payload: any) {
    const list = this.serverMessageCallbacks.get(type);
    if (list) {
      list.forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[ScriptController] Server message callback for ${type} failed:`, err);
        }
      });
    }
  }

  /**
   * Call when manual spawn or teleports change player coordinate
   */
  public triggerPositionSet(pos: THREE.Vector3) {
    this.positionSetCallbacks.forEach(cb => {
      try {
        cb(pos);
      } catch (err) {
        console.error(`[ScriptController] PositionSet callback failed:`, err);
      }
    });
  }

  public isPlayerLocallyDead(): boolean {
    if (this.activeScript && this.activeScript.getLocalDeathState) {
      return this.activeScript.getLocalDeathState();
    }
    return false;
  }

  /**
   * Resets and disposes all hooks/active place logic
   */
  public cleanup() {
    document.removeEventListener("ws_event", this.wsEventBound);
    if (this.activeScript && this.activeScript.cleanup) {
      try {
        this.activeScript.cleanup();
      } catch (err) {
        console.error(`[ScriptController] Cleanup script trigger failed:`, err);
      }
    }
    this.activeScript = null;
    this.activeContext = null;
    this.updateCallbacks = [];
    this.serverMessageCallbacks.clear();
    this.positionSetCallbacks = [];
  }
}
