import { ServerPlaceContext, ServerPlaceScript } from "./PlaceScriptTypes";
import { DefaultPlaceServer } from "./server_scripts/DefaultPlaceServer";
import { ToonGardenServer } from "./server_scripts/ToonGardenServer";

const SERVER_SCRIPTS_MAP: Record<string, new () => ServerPlaceScript> = {
  "neon-temple": ToonGardenServer,
};

export class ServerScriptController {
  private activeScript: ServerPlaceScript | null = null;
  private activeContext: ServerPlaceContext | null = null;

  private playerJoinedCallbacks: Array<(playerId: string, player: any) => void> = [];
  private playerLeftCallbacks: Array<(playerId: string) => void> = [];
  private messageCallbacks: Map<string, Array<(playerId: string, payload: any) => void>> = new Map();
  private tickCallbacks: Array<(dt: number) => void> = [];

  constructor(
    private roomId: string,
    private room: any, // ServerRoom
    private physicsWorld: any, // PhysicsWorld
    private broadcastFn: (message: any, excludeSocket?: any) => void,
    private broadcastToPlayerFn: (playerId: string, message: any) => void
  ) {
    this.initScript();
  }

  private initScript() {
    this.cleanup();

    const ScriptClass = SERVER_SCRIPTS_MAP[this.roomId] || (this.room && SERVER_SCRIPTS_MAP[this.room.mode]) || ToonGardenServer;
    this.activeScript = new ScriptClass();

    this.activeContext = {
      roomId: this.roomId,
      room: this.room,
      physicsWorld: this.physicsWorld,
      broadcast: this.broadcastFn,
      broadcastToPlayer: this.broadcastToPlayerFn,
      onPlayerJoined: (cb) => {
        this.playerJoinedCallbacks.push(cb);
      },
      onPlayerLeft: (cb) => {
        this.playerLeftCallbacks.push(cb);
      },
      onMessage: (type, cb) => {
        if (!this.messageCallbacks.has(type)) {
          this.messageCallbacks.set(type, []);
        }
        this.messageCallbacks.get(type)!.push(cb);
      },
      onTick: (cb) => {
        this.tickCallbacks.push(cb);
      }
    };

    console.log(`[ServerScriptController] Instantiating server script for room ${this.roomId}`);
    try {
      this.activeScript.init(this.activeContext);
    } catch (err) {
      console.error(`[ServerScriptController] Server script init failed for room ${this.roomId}:`, err);
    }
  }

  public handlePlayerJoined(playerId: string, player: any) {
    this.playerJoinedCallbacks.forEach(cb => {
      try { cb(playerId, player); } catch (err) { console.error(err); }
    });
  }

  public handlePlayerLeft(playerId: string) {
    this.playerLeftCallbacks.forEach(cb => {
      try { cb(playerId); } catch (err) { console.error(err); }
    });
  }

  public handleMessage(playerId: string, type: string, payload: any): boolean {
    const list = this.messageCallbacks.get(type);
    if (list && list.length > 0) {
      list.forEach(cb => {
        try { cb(playerId, payload); } catch (err) { console.error(err); }
      });
      return true; // was handled by custom script
    }
    return false;
  }

  public tick(dt: number) {
    this.tickCallbacks.forEach(cb => {
      try { cb(dt); } catch (err) { console.error(err); }
    });
  }

  public cleanup() {
    if (this.activeScript && this.activeScript.cleanup) {
      try { this.activeScript.cleanup(); } catch (err) { console.error(err); }
    }
    this.activeScript = null;
    this.activeContext = null;
    this.playerJoinedCallbacks = [];
    this.playerLeftCallbacks = [];
    this.messageCallbacks.clear();
    this.tickCallbacks = [];
  }
}
