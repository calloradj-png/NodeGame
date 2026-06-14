import { ServerPlaceContext, ServerPlaceScript } from "../PlaceScriptTypes";
import { DefaultPlaceServer } from "./DefaultPlaceServer";

export class ToonGardenServer extends DefaultPlaceServer {
  private roundState: "intermission" | "active" = "intermission";
  private roundType: "laser" | "bomb" = "laser";
  private stateTimer: number = 0.0; // Starts with a 0s intermission, waiting for button
  private laserAngle: number = 0.0;
  private laserSpeed: number = 0.0;
  private syncTimerAccumulator: number = 0.0;
  private bombExploaded: boolean = false;
  private bombCleanupTimeout: any = null;

  public async init(context: ServerPlaceContext) {
    await super.init(context);

    // Clean collectibles list so no coins spawn on server
    this.context.room.collectibles = [];

    // Reset player states on join
    this.context.onPlayerJoined((playerId, player) => {
      if (this.roundState === "active") {
        player.isDead = true;
        player.health = 0;
        console.log(`[LaserRound] Player ${player.name} joined mid-round. Set to spectator mode.`);
      } else {
        player.isDead = false;
        player.health = 100;
      }

      // Broadcast new state to player immediately
      this.sendRoundSyncToPlayer(playerId);

      // Broadcast update to everyone so the player list is perfectly in sync
      this.context.broadcast({
        type: "player_updated",
        payload: { player }
      });
    });

    // Handle when a player reports a local collision or falling death
    this.context.onMessage("player_died", (playerId) => {
      const player = this.context.room.players[playerId];
      if (player && !player.isDead) {
        player.isDead = true;
        player.health = 0;
        console.log(`[LaserRound] Player ${player.name} (${playerId}) has died.`);

        // Broadcast player info updated to everyone
        this.context.broadcast({
          type: "player_updated",
          payload: { player }
        });

        // If in intermission/lobby, automatically revive after 2 seconds as backup
        if (this.roundState !== "active") {
          setTimeout(() => {
            if (this.roundState !== "active" && player.isDead) {
              player.isDead = false;
              player.health = 100;
              console.log(`[LaserRound] Player ${player.name} (${playerId}) auto-revived after 2s void fall during lobby.`);
              this.context.broadcast({
                type: "player_updated",
                payload: { player }
              });
            }
          }, 2000);
        }
      }
    });

    // Handle lobby/intermission self-revive signals from client
    this.context.onMessage("player_revived_lobby", (playerId, payload) => {
      const player = this.context.room.players[playerId];
      if (player) {
        player.isDead = false;
        player.health = 100;
        if (payload) {
          player.x = payload.x !== undefined ? payload.x : player.x;
          player.y = payload.y !== undefined ? payload.y : player.y;
          player.z = payload.z !== undefined ? payload.z : player.z;
        }
        console.log(`[LaserRound] Player ${player.name} (${playerId}) revived in lobby at position (${player.x}, ${player.y}, ${player.z}).`);
        this.context.broadcast({
          type: "player_updated",
          payload: { player }
        });
      }
    });

    // Handle manual request for full round and player state synchronization (e.g. on client load/init)
    this.context.onMessage("request_round_sync", (playerId) => {
      console.log(`[LaserRound] Received full round states sync request from ${playerId}`);
      this.sendRoundSyncToPlayer(playerId);

      const { room } = this.context;
      this.context.broadcastToPlayer(playerId, {
        type: "button_state_changed",
        payload: {
          isPressed: !!room.buttonIsPressed,
          pressedUntil: room.buttonPressedUntil || 0
        }
      });
      this.context.broadcastToPlayer(playerId, {
        type: "room_state_sync_revival",
        payload: { players: this.context.room.players }
      });
    });

    // Periodic tick at 20Hz (~0.05s) mapping custom state loops
    this.context.onTick((dt) => {
      this.tickLaserRound(dt);
    });
  }

  protected handleButtonPress(playerId: string) {
    // If we're currently in intermission, instantly start the active round!
    if (this.roundState === "intermission") {
      console.log(`[LaserRound] Button pressed by ${playerId} -> Starting random round immediately!`);
      this.transitionToActiveRound();
    }
  }

  private sendRoundSync() {
    this.context.broadcast({
      type: "laser_round_sync",
      payload: {
        roundState: this.roundState,
        stateTimer: this.stateTimer,
        laserAngle: this.laserAngle,
        laserSpeed: this.laserSpeed,
        roundType: this.roundType
      }
    });
  }

  private sendRoundSyncToPlayer(playerId: string) {
    this.context.broadcastToPlayer(playerId, {
      type: "laser_round_sync",
      payload: {
        roundState: this.roundState,
        stateTimer: this.stateTimer,
        laserAngle: this.laserAngle,
        laserSpeed: this.laserSpeed,
        roundType: this.roundType
      }
    });
  }

  private spawnBombs() {
    // Prevent any stale/pending bomb cleanups from a prior round from triggering now
    if (this.bombCleanupTimeout) {
      clearTimeout(this.bombCleanupTimeout);
      this.bombCleanupTimeout = null;
    }

    // Clear any old bomb bodies
    this.context.physicsWorld.removeBody("bomb-1");
    this.context.physicsWorld.removeBody("bomb-2");

    const bomb1 = {
      id: "bomb-1",
      type: "sphere" as const,
      replicatedType: "bomb",
      // Distributed randomly around the garden-temple platform
      x: (Math.random() * 20) - 10,
      y: 15.0,
      z: (Math.random() * 20) - 10,
      vx: (Math.random() * 4) - 2,
      vy: 1.0,
      vz: (Math.random() * 4) - 2,
      radius: 1.25,
      mass: 1.0,
      replicated: true
    };

    const bomb2 = {
      id: "bomb-2",
      type: "sphere" as const,
      replicatedType: "bomb",
      x: (Math.random() * 20) - 10,
      y: 15.0,
      z: (Math.random() * 20) - 10,
      vx: (Math.random() * 4) - 2,
      vy: 1.0,
      vz: (Math.random() * 4) - 2,
      radius: 1.25,
      mass: 1.0,
      replicated: true
    };

    this.context.physicsWorld.addBody(bomb1);
    this.context.physicsWorld.addBody(bomb2);
    console.log("[BombRound] 2 physical bombs spawned in server physics!");
  }

  private triggerBombExplosion() {
    console.log("[BombRound] Boom! Bombs are exploding!");
    const b1 = this.context.physicsWorld.bodies.get("bomb-1");
    const b2 = this.context.physicsWorld.bodies.get("bomb-2");

    const pos1 = b1 ? { x: b1.x, y: b1.y, z: b1.z } : { x: 0, y: 1, z: 0 };
    const pos2 = b2 ? { x: b2.x, y: b2.y, z: b2.z } : { x: 0, y: 1, z: 0 };

    // Broadcast explosion fx trigger to connected clients
    this.context.broadcast({
      type: "bomb_exploded_fx",
      payload: { pos1, pos2 }
    });

    // Kill any player within a localized 10.0 meter blast radius (highly lethal, but escapable if players run away!)
    Object.keys(this.context.room.players).forEach((pId) => {
      const player = this.context.room.players[pId];
      if (player && !player.isDead) {
        let minDistance = 999;
        if (b1) {
          const d = Math.sqrt(Math.pow(player.x - b1.x, 2) + Math.pow(player.y - b1.y, 2) + Math.pow(player.z - b1.z, 2));
          if (d < minDistance) minDistance = d;
        }
        if (b2) {
          const d = Math.sqrt(Math.pow(player.x - b2.x, 2) + Math.pow(player.y - b2.y, 2) + Math.pow(player.z - b2.z, 2));
          if (d < minDistance) minDistance = d;
        }

        if (minDistance < 10.0) {
          player.isDead = true;
          player.health = 0;
          console.log(`[BombRound] Player ${player.name} died in bomb blast radius (dist: ${minDistance.toFixed(2)}m)`);
          
          this.context.broadcast({
            type: "player_updated",
            payload: { player }
          });
        }
      }
    });

    // Remove bomb bodies immediately upon explosion so they disappear right on time
    this.context.physicsWorld.removeBody("bomb-1");
    this.context.physicsWorld.removeBody("bomb-2");
  }

  private transitionToActiveRound() {
    this.roundState = "active";
    // Choose randomly between "laser" and "bomb"
    this.roundType = Math.random() < 0.5 ? "bomb" : "laser";

    if (this.roundType === "bomb") {
      this.stateTimer = 10.0; // 8 seconds ticking + 2 seconds aftermath
      this.bombExploaded = false;
      this.spawnBombs();
    } else {
      this.stateTimer = 15.0; // 15-second laser round
      this.laserAngle = Math.random() * Math.PI * 2;
      this.laserSpeed = 0.0;
    }

    console.log(`[Round] Round selected: ${this.roundType.toUpperCase()}`);

    // Set the button to pressed/locked for the entire duration of the active round.
    const { room } = this.context;
    room.buttonIsPressed = true;
    room.buttonPressedUntil = Date.now() + (this.roundType === "bomb" ? 10000 : 15000);

    // Clear any persistent 5-second reset timers scheduled by server.ts core
    if ((room as any).buttonTimer) {
      clearTimeout((room as any).buttonTimer);
      (room as any).buttonTimer = undefined;
    }

    // Broadcast visual button lock state
    this.context.broadcast({
      type: "button_state_changed",
      payload: {
        isPressed: true,
        pressedUntil: room.buttonPressedUntil
      }
    });

    // Revive all players for the active round
    Object.keys(this.context.room.players).forEach((pId) => {
      const player = this.context.room.players[pId];
      if (player) {
        player.isDead = false;
        player.health = 100;
      }
    });

    // Broadcast state synchronizations
    this.context.broadcast({
      type: "room_state_sync_revival",
      payload: { players: this.context.room.players }
    });
    
    // Ensure all clients get updated player data
    Object.values(this.context.room.players).forEach((player: any) => {
      this.context.broadcast({
        type: "player_updated",
        payload: { player }
      });
    });

    // Broadcast the active state immediately
    this.sendRoundSync();
  }

  private tickLaserRound(dt: number) {
    if (this.roundState === "active") {
      this.stateTimer -= dt;

      if (this.roundType === "bomb") {
        if (this.stateTimer <= 2.0 && !this.bombExploaded) {
          this.bombExploaded = true;
          this.triggerBombExplosion();
        }
      } else {
        const activeElapsed = 15.0 - this.stateTimer;
        if (activeElapsed < 3.0) {
          this.laserSpeed = 0.0;
        } else {
          const accelerateSecs = activeElapsed - 3.0;
          this.laserSpeed = 0.15 + accelerateSecs * 0.14;
        }
        this.laserAngle += this.laserSpeed * dt;
      }

      if (this.stateTimer <= 0) {
        // Transition back to INTERMISSION
        this.roundState = "intermission";
        this.stateTimer = 5.0; // Rest period
        this.laserSpeed = 0.0;

        console.log(`[LaserRound] Active round finished! Entering intermission.`);

        // Clean up bomb bodies immediately when the active round is completely finished!
        const physicsWorldRef = this.context.physicsWorld;
        if (this.bombCleanupTimeout) {
          clearTimeout(this.bombCleanupTimeout);
          this.bombCleanupTimeout = null;
        }
        physicsWorldRef.removeBody("bomb-1");
        physicsWorldRef.removeBody("bomb-2");

        // Kept pressed (red/locked) for 2 seconds after the active round finishes
        const { room } = this.context;
        room.buttonIsPressed = true;
        room.buttonPressedUntil = Date.now() + 2000;

        if ((room as any).buttonTimer) {
          clearTimeout((room as any).buttonTimer);
        }

        (room as any).buttonTimer = setTimeout(() => {
          room.buttonIsPressed = false;
          room.buttonPressedUntil = 0;
          (room as any).buttonTimer = undefined;

          this.context.broadcast({
            type: "button_state_changed",
            payload: {
              isPressed: false,
              pressedUntil: 0
            }
          });
        }, 2000);

        // Revive players for the intermission time
        Object.keys(this.context.room.players).forEach((pId) => {
          const player = this.context.room.players[pId];
          if (player) {
            player.isDead = false;
            player.health = 100;
          }
        });

        this.context.broadcast({
          type: "room_state_sync_revival",
          payload: { players: this.context.room.players }
        });

        Object.values(this.context.room.players).forEach((player: any) => {
          this.context.broadcast({
            type: "player_updated",
            payload: { player }
          });
        });

        // Broadcast intermission state immediately
        this.sendRoundSync();
      }
    } else {
      if (this.stateTimer > 0) {
        this.stateTimer -= dt;
      }
      this.laserSpeed = 0.0;
    }
    this.syncTimerAccumulator += dt;

    if (this.syncTimerAccumulator >= 0.1) {
      this.syncTimerAccumulator = 0.0;
      this.sendRoundSync();
    }
  }

  public cleanup() {
    if (this.bombCleanupTimeout) {
      clearTimeout(this.bombCleanupTimeout);
      this.bombCleanupTimeout = null;
    }
    super.cleanup();
  }
}
