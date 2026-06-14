import * as THREE from "three";
import React from "react";
import { DefaultPlaceClient } from "./DefaultPlaceClient";
import { ClientPlaceContext } from "../PlaceScriptTypes";
import { GameLocalization } from "../GameLocalization";

export class ToonGardenClient extends DefaultPlaceClient {
  private health: number = 100;
  private isDead: boolean = false;
  private vignetteOpacity: number = 0.0;
  private diedThisRound: boolean = false;

  // Laser state variables
  private roundState: "intermission" | "active" = "intermission";
  private roundType: "laser" | "bomb" = "laser";
  private stateTimer: number = 5.0;
  private laserAngle: number = 0.0;
  private laserSpeed: number = 0.0;
  private serverLaserAngle: number = 0.0;
  private localLaserAngle: number = 0.0;
  private currentClientLaserSpeed: number = 0.0;
  private lastSyncLocalTime: number = performance.now();
  private syncServerAngle: number = 0.0;
  private syncServerSpeed: number = 0.0;
  private localPlayers: Record<string, any> = {};

  // Bomb round variables
  private activeExplosions: Array<{
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    scaleSpeed?: number;
    type: "spark" | "sphere";
  }> = [];

  // ThreeJS laser references
  private laserGroup: THREE.Group | null = null;
  private laserMaterial: THREE.MeshBasicMaterial | null = null;
  private laserCylinderRadius: number = 0.09;
  private laserCylinderLength: number = 46.0; // 41.0 + 5 = 46.0

  // Audio trigger locks
  private lastBeepSecond: number = -1;
  private playerDeadReported: boolean = false;
  private currentLaserY: number = -5.0;

  public init(context: ClientPlaceContext) {
    super.init(context);

    // Build the visual neon-red laser cylinder wall in the center of the map
    this.buildLaserObstacles();

    // Reset local player states matching server-configured state
    const initialPlayers = this.context.roomInfo?.players || {};
    this.localPlayers = { ...initialPlayers };
    const me = initialPlayers[this.context.playerId];
    if (me) {
      this.isDead = me.isDead || false;
      this.health = me.health !== undefined ? me.health : 100;
    } else {
      this.health = 100;
      this.isDead = false;
    }
    this.playerDeadReported = this.isDead;
    this.currentLaserY = -5.0;

    // Listen for player joins and structural updates
    const unsubPlayerJoined = this.context.onServerMessage("player_joined", (payload) => {
      if (payload.player) {
        this.localPlayers[payload.player.id] = payload.player;
        this.updateUIPanel();
      }
    });
    this.cleanupListeners.push(unsubPlayerJoined);

    const unsubPlayerUpdated = this.context.onServerMessage("player_updated", (payload) => {
      if (payload.player) {
        this.localPlayers[payload.player.id] = payload.player;
        this.updateUIPanel();
      }
    });
    this.cleanupListeners.push(unsubPlayerUpdated);

    const unsubPlayerLeft = this.context.onServerMessage("player_left", (payload) => {
      if (payload.id) {
        delete this.localPlayers[payload.id];
        this.updateUIPanel();
      }
    });
    this.cleanupListeners.push(unsubPlayerLeft);

    // Listen for server round state sync broadcasts
    const unsubLaser = this.context.onServerMessage("laser_round_sync", (payload) => {
      const oldState = this.roundState;
      this.roundState = payload.roundState;
      this.roundType = payload.roundType || "laser";
      this.stateTimer = payload.stateTimer;
      this.laserSpeed = payload.laserSpeed;
      this.serverLaserAngle = payload.laserAngle;

      this.lastSyncLocalTime = performance.now();
      this.syncServerAngle = payload.laserAngle;
      this.syncServerSpeed = payload.laserSpeed;

      // When the active laser round ends and we transitioned to intermission, check if local player survived
      if (oldState === "active" && this.roundState === "intermission") {
        if (!this.diedThisRound) {
          console.log("[LaserRound] Player survived! Award +5 coins.");
          const awardEv = new CustomEvent("survived-laser-round", { detail: { amount: 5 } });
          document.dispatchEvent(awardEv);
        }
      }

      // Only snap/sync angle when starting the active round or joining mid-round,
      // to avoid any visual jittering/twitching during the round!
      if (oldState !== "active" && this.roundState === "active") {
        this.diedThisRound = false;
        this.localLaserAngle = this.serverLaserAngle;
        this.currentClientLaserSpeed = 0.0;
      }

      this.triggerCountdownCues();
      this.updateUIPanel();
    });
    this.cleanupListeners.push(unsubLaser);

    // Listen for bomb explosions on the client to spawn shockwaves and visual particles
    const unsubBombFx = this.context.onServerMessage("bomb_exploded_fx", (payload) => {
      this.triggerExplosionFx(payload.pos1);
      this.triggerExplosionFx(payload.pos2);
    });
    this.cleanupListeners.push(unsubBombFx);

    // Listen for revival events to reset local death locks
    const unsubRevival = this.context.onServerMessage("room_state_sync_revival", (payload) => {
      const myId = this.context.playerId;
      const me = payload.players[myId];
      if (me) {
        this.isDead = me.isDead || false;
        this.health = me.health !== undefined ? me.health : 100;
        if (!this.isDead) {
          this.playerDeadReported = false;
        }
      }
      this.localPlayers = { ...payload.players };
      this.updateUIPanel();
    });
    this.cleanupListeners.push(unsubRevival);

    // Initial HUD registration
    this.updateUIPanel();

    // Frame updates
    const unsubUpdate = this.context.onUpdate((dt, time) => this.clientTick(dt, time));
    this.cleanupListeners.push(unsubUpdate);

    // Send immediate sync request to server to receive instant accurate game states upon load
    this.context.ws.send({
      type: "request_round_sync"
    });
  }

  private buildLaserObstacles() {
    this.laserGroup = new THREE.Group();
    this.context.scene.add(this.laserGroup);

    // Flat basic vibrant red material: has no 3D shading, no dark parts, and no neon glow!
    // depthWrite: false avoids transparency depth-clipping/black-pixel sorting glitches
    // toneMapped: false avoids exposure or tone-mapping black/dark-spot anomalies
    // envMap: null explicitly disables any environmental reflection that would cause black "dirty" rendering artifacts
    this.laserMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      toneMapped: false,
      envMap: null
    });

    // Make single clean cylinder geometry representing the razor sharp laser beam
    const laserGeom = new THREE.CylinderGeometry(
      this.laserCylinderRadius, // fine core line
      this.laserCylinderRadius,
      this.laserCylinderLength,
      12,
      1
    );
    laserGeom.rotateZ(Math.PI / 2); // Rotate horizontal lying along X-axis

    // Stack 5 lines of neon laser beams
    for (let i = 0; i < 5; i++) {
       const laserMesh = new THREE.Mesh(laserGeom, this.laserMaterial);
       laserMesh.name = "laser_beam";
       laserMesh.userData.isLaser = true;
       laserMesh.position.set(0, 0.2 + i * 0.55, 0);
       laserMesh.castShadow = false;
       laserMesh.receiveShadow = false;
       this.laserGroup.add(laserMesh);
    }
  }

  private triggerCountdownCues() {
    if (this.roundState === "intermission") {
      const wholeSeconds = Math.ceil(this.stateTimer);
      if (wholeSeconds <= 3 && wholeSeconds > 0 && wholeSeconds !== this.lastBeepSecond) {
        this.lastBeepSecond = wholeSeconds;
        this.playCountdownBeep();
      }
    } else {
      this.lastBeepSecond = -1;
    }
  }

  private clientTick(dt: number, time: number) {
    if (!this.laserGroup) return;

    // Set round death flag if dead during active gameplay
    if (this.roundState === "active" && this.isDead) {
      this.diedThisRound = true;
    }

    // Update ongoing custom explosion visual elements
    for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
      const exp = this.activeExplosions[i];
      exp.life -= dt;
      if (exp.life <= 0) {
        this.context.scene.remove(exp.mesh);
        exp.mesh.geometry.dispose();
        if (Array.isArray(exp.mesh.material)) {
          exp.mesh.material.forEach(m => m.dispose());
        } else {
          exp.mesh.material.dispose();
        }
        this.activeExplosions.splice(i, 1);
      } else {
        // Move
        exp.mesh.position.addScaledVector(exp.velocity, dt);
        // Apply gravity to sparks
        if (exp.type === "spark") {
          exp.velocity.y -= 9.8 * dt; // physical gravity
          exp.mesh.scale.setScalar(exp.life / exp.maxLife); // shrink to 0
        }
        // Expand explosion shockwave sphere
        if (exp.type === "sphere" && exp.scaleSpeed) {
          exp.mesh.scale.addScalar(exp.scaleSpeed * dt);
          if (Array.isArray(exp.mesh.material)) {
            exp.mesh.material.forEach(m => { m.opacity = exp.life / exp.maxLife; });
          } else {
            exp.mesh.material.opacity = exp.life / exp.maxLife;
          }
        }
      }
    }

    // Decay red death vignette overlay smoothly
    if (this.vignetteOpacity > 0.0) {
      this.vignetteOpacity = Math.max(0.0, this.vignetteOpacity - dt * 2.5); // smooth fade out
      this.updateUIPanel();
    }

    // VOID FALL PROTECTION: if player falls quite low, they die instantly
    const pPos = this.context.getLocalPlayerPos();
    if (pPos && pPos.y < -15.0 && !this.isDead) {
      this.health = 0;
      this.isDead = true;
      if (this.roundState === "active") {
        this.diedThisRound = true;
      }
      this.playerDeadReported = true;
      this.vignetteOpacity = 1.0; // Sharp red vignette flash
      this.updateUIPanel();

      console.log("[Void Fall] Local player fell down below -15! Triggering death.");

      // Inform server
      this.context.ws.send({
        type: "player_died",
        payload: {}
      });

      // If round is NOT active (lobby / intermission), schedule revival/respawn instantly in a random place!
      if (this.roundState !== "active") {
        // Reset state instantly
        this.isDead = false;
        this.health = 100;
        this.playerDeadReported = false;
        this.updateUIPanel();

        // Try to find a random position on a platform
        let newX = (Math.random() * 24) - 12; // [-12, 12]
        let newZ = (Math.random() * 24) - 12; // [-12, 12]
        let newY = this.context.queryGroundHeight(newX, 15.0, newZ);

        if (newY < -100) {
          // Fallback to center spawn if it lands on empty space
          newX = 0;
          newZ = 0;
          newY = 4.0;
        } else {
          newY += 4.0; // spawn slightly above ground
        }

        const newPos = new THREE.Vector3(newX, newY, newZ);
        this.context.setLocalPlayerPos(newPos);

        // Send revival notification to server instantly
        this.context.ws.send({
          type: "player_revived_lobby",
          payload: { x: newX, y: newY, z: newZ }
        });
      }
    }

    // Continuous local countdown of stateTimer to sync with server ticks perfectly
    if (this.stateTimer > 0) {
      this.stateTimer = Math.max(0, this.stateTimer - dt);
    }

    if (this.roundState === "active") {
      this.laserGroup.visible = (this.roundType === "laser");

      if (this.roundType === "laser") {
        // Smoothly blend the local speed toward the server's target speed to prevent sudden rate jumps
        this.currentClientLaserSpeed = THREE.MathUtils.lerp(
          this.currentClientLaserSpeed,
          this.laserSpeed,
          1.0 - Math.exp(-4.0 * dt)
        );

        // Advance the local angle guess
        this.localLaserAngle += this.currentClientLaserSpeed * dt;

        // Extrapolate server angle using high-precision local time since the last update
        const elapsedSinceSync = Math.max(0.0, (performance.now() - this.lastSyncLocalTime) / 1000.0);
        // 80ms typical network transit time
        const estimatedLatency = 0.08;
        const predictedServerAngle = this.syncServerAngle + this.syncServerSpeed * (elapsedSinceSync + estimatedLatency);

        // Smoothly blend any minor drift between local angle and predicted server angle
        let angleDiff = predictedServerAngle - this.localLaserAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)); // Wrap to shortest circle path [-PI, PI]

        const thirtyDegrees = 30 * Math.PI / 180; // ~0.5236 radians

        if (Math.abs(angleDiff) > thirtyDegrees) {
          // If it drifts/lags by more than 30 degrees, smoothly correct it back over time
          this.localLaserAngle += angleDiff * (1.0 - Math.exp(-3.5 * dt));
        } else {
          // If within 30 degrees, use an extremely gentle corrective pull to ensure zero stutters/jitter
          // while slowly preventing any long-term drift.
          this.localLaserAngle += angleDiff * (1.0 - Math.exp(-0.15 * dt));
        }

        // Rotate group
        this.laserGroup.rotation.y = this.localLaserAngle;

        // Smoothly rise Y coordinates
        this.currentLaserY = THREE.MathUtils.lerp(this.currentLaserY, 0.0, 1.0 - Math.exp(-6.0 * dt));
        this.laserGroup.position.y = this.currentLaserY;

        // Dynamically align flat laser opacity states
        if (this.laserMaterial) {
          const activeElapsed = 15.0 - this.stateTimer;
          if (activeElapsed < 3.0) {
            // Warm up / Fade-in stage: Semi-transparent steady warning flat line
            const warmUpFade = Math.min(Math.max(activeElapsed, 0.0) / 0.8, 1.0);
            this.laserMaterial.opacity = warmUpFade * 0.4;
          } else {
            // Active rotation stage: Full opacity solid flat line (no neon glow/shading)
            this.laserMaterial.opacity = 1.0;
          }
        }

        // Run local collision checking against the neon laser cylinder
        this.checkLocalCollision();
      }
    } else {
      // Smoothly sink Y and lower opacity to 0 in intermission
      // Sinks slower (was exp decay coefficient -5.0, now -1.3)
      this.currentLaserY = THREE.MathUtils.lerp(this.currentLaserY, -5.5, 1.0 - Math.exp(-1.3 * dt));
      this.laserGroup.position.y = this.currentLaserY;

      // Slowly decay the rotational speed so they don't stop instantly but slow down slightly while spinning elegance
      this.currentClientLaserSpeed = THREE.MathUtils.lerp(this.currentClientLaserSpeed, 0.2, 1.0 - Math.exp(-1.0 * dt));

      if (this.currentLaserY < -4.8) {
        this.laserGroup.visible = false;
        this.currentClientLaserSpeed = 0.0;
        if (this.laserMaterial) {
          this.laserMaterial.opacity = 0.0;
        }
      } else {
        this.laserGroup.visible = true;
        
        // Keep rotating slowly if the round ends to look elegant while sinking (with the decaying speed)
        this.localLaserAngle += this.currentClientLaserSpeed * dt;
        this.laserGroup.rotation.y = this.localLaserAngle;

        if (this.laserMaterial) {
          this.laserMaterial.opacity = THREE.MathUtils.lerp(this.laserMaterial.opacity, 0.0, 1.0 - Math.exp(-1.3 * dt));
        }
      }
    }
  }

  private checkLocalCollision() {
    if (this.isDead || this.playerDeadReported) return;

    // Laser is semi-transparent and warm-up (non-deadly) for the first 3 seconds of active phase
    const activeElapsed = 15.0 - this.stateTimer;
    if (activeElapsed < 3.0) return;

    const pPos = this.context.getLocalPlayerPos();
    if (!pPos) return;

    // The laser wall height range is from y = 0 to y = 2.8.
    // Ensure height overlapping first before XZ calculations
    if (pPos.y > 3.0) return;

    // Laser lies along X axis in local space, rotated around Y by localLaserAngle.
    // Director unit vector of the laser on the XZ plane:
    const angle = this.localLaserAngle;
    const dx = Math.cos(angle);
    const dz = -Math.sin(angle); // normal clockwise rotation in threejs coords

    // Project player 2D coordinate onto the laser beam vector
    const proj = pPos.x * dx + pPos.z * dz;

    // Check if player lies horizontally adjacent to the 10-unit length on either side of center
    const maxHalfLength = this.laserCylinderLength / 2; // 10.0
    if (Math.abs(proj) <= maxHalfLength) {
      // Nearest matching point on the laser line
      const closestX = proj * dx;
      const closestZ = proj * dz;

      // Calculate perpendicular distance in 2D
      const diffX = pPos.x - closestX;
      const diffZ = pPos.z - closestZ;
      const dist2D = Math.sqrt(diffX * diffX + diffZ * diffZ);

      // Player radius is about 0.53. Collision buffer:
      const playerRadius = 0.53;
      const collisionThreshold = playerRadius + this.laserCylinderRadius; // 0.68

      if (dist2D < collisionThreshold - 0.05) {
        // Local instant death!
        this.health = 0;
        this.isDead = true;
        if (this.roundState === "active") {
          this.diedThisRound = true;
        }
        this.playerDeadReported = true;
        this.vignetteOpacity = 1.0; // Sharp red vignette flash

        console.log("[LaserRound] Local touch detected! Triggering local death.");

        // Play synthetic explosive punch noise
        this.playDeathSound();

        // Inform server synchronously
        this.context.ws.send({
          type: "player_died",
          payload: {}
        });

        this.updateUIPanel();
      }
    }
  }

  private playCountdownBeep() {
    // Silenced per user request
  }

  private playDeathSound() {
    // Silenced per user request
  }

  private getHealthColor(hp: number): string {
    if (hp > 60) return "#00E736"; // Radiant neon vibrant green
    if (hp > 25) return "#f97316"; // Bright vibrant Orange
    return "#f43f5e"; // Bright vibrant Pinkish-Red
  }

  private updateUIPanel() {
    this.context.registerUI("toon_garden_hud", this.renderHUD());
  }

  private renderHUD(): React.ReactNode {
    const survivors = Object.values(this.localPlayers)
      .filter((p: any) => !p.isDead)
      .map((p: any) => p.name || "Player");
    const survivorsText = survivors.length > 0 ? survivors.join(", ") : GameLocalization.t("nobody");

    return (
      <div key="laser-game-hud-root" className="absolute inset-0 w-full h-full pointer-events-none select-none z-45">
        {/* Full-screen Vignette Overlay on Death */}
        {this.vignetteOpacity > 0 && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-75"
            style={{
              opacity: this.vignetteOpacity,
              background: "radial-gradient(circle, transparent 20%, rgba(244, 63, 94, 0.45) 75%, rgba(190, 24, 74, 0.8) 100%)",
            }}
          />
        )}

        {/* Top-centered Title and Surviving Players Overlay during Active Laser Round */}
        {this.roundState === "active" && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center pointer-events-none select-none z-50">
            {/* Title: Large, perfectly rounded with thick red outline and no square cropping */}
            <div
              className="font-sans font-black tracking-wide text-3xl lg:text-4xl text-white select-none whitespace-nowrap uppercase"
              style={{
                fontFamily: "var(--font-sans)",
                WebkitTextStroke: "8px #ef4444",
                paintOrder: "stroke fill",
                strokeLinejoin: "round",
                textShadow: "0 4px 12px rgba(239, 68, 68, 0.55)"
              }}
            >
              {this.roundType === "bomb"
                ? (Math.max(0, Math.ceil(this.stateTimer - 2.0)) > 0 
                  ? GameLocalization.t("alertBomb", { time: Math.max(0, Math.ceil(this.stateTimer - 2.0)) }) 
                  : GameLocalization.t("boom"))
                : GameLocalization.t("alertLasers")
              }
            </div>

            {/* Subtitle: High-contrast text with thick black outline, slightly larger font size, perfectly rounded outline */}
            <div
              className="font-sans font-extrabold tracking-wide text-base lg:text-lg text-white select-none max-w-sm lg:max-w-md mt-1.5 leading-tight"
              style={{
                fontFamily: "var(--font-sans)",
                WebkitTextStroke: "6px #000000",
                paintOrder: "stroke fill",
                strokeLinejoin: "round",
                textShadow: "0 3px 6px rgba(0, 0, 0, 0.65)"
              }}
            >
              {GameLocalization.t("survivors")}: <span className="text-zinc-100 font-extrabold">{survivorsText}</span>
            </div>
          </div>
        )}

        {/* Squircle bottom-left health bar */}
        <div className="absolute bottom-6 left-6 pointer-events-auto">
          <div className="w-44 h-8 bg-neutral-950/85 backdrop-blur-md rounded-xl flex items-center p-1 shadow-2xl">
            {/* Health container filling with minimal gap */}
            <div className="w-full h-full bg-black/45 rounded-[8px] overflow-hidden p-[1.5px]">
              <div
                className="h-full rounded-[6px] transition-all duration-300 ease-out"
                style={{
                  width: `${this.health}%`,
                  backgroundColor: this.getHealthColor(this.health),
                  boxShadow: `0 0 10px ${this.getHealthColor(this.health)}`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  public getLocalDeathState(): boolean {
    return this.isDead;
  }

  private triggerExplosionFx(pos: { x: number, y: number, z: number }) {
    if (!pos) return;
    console.log(`[ToonGardenClient] Explosion visual effect at (${pos.x}, ${pos.y}, ${pos.z})`);

    // Create a golden fire sphere
    const expGeo = new THREE.SphereGeometry(1, 16, 16);
    const expMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const expMesh = new THREE.Mesh(expGeo, expMat);
    expMesh.position.set(pos.x, pos.y, pos.z);
    this.context.scene.add(expMesh);

    this.activeExplosions.push({
      mesh: expMesh,
      velocity: new THREE.Vector3(0, 0, 0),
      life: 1.0,
      maxLife: 1.0,
      scaleSpeed: 9.0, // Scale speed 9.0 + initial scale 1.0 makes it exactly 10.0 meters visual radius!
      type: "sphere"
    });

    // Spawn 100 beautiful tiny fiery sparks for a nice localized fireworks effect
    for (let i = 0; i < 100; i++) {
      const sparkGeo = new THREE.SphereGeometry(0.15 + Math.random() * 0.25, 6, 6);
      const sparkMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.4 ? 0xff4400 : 0xffcc00,
        transparent: true,
        opacity: 1.0,
        depthWrite: false
      });
      const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
      sparkMesh.position.set(
        pos.x + (Math.random() * 1.0 - 0.5),
        pos.y + (Math.random() * 1.0 - 0.5),
        pos.z + (Math.random() * 1.0 - 0.5)
      );
      this.context.scene.add(sparkMesh);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 4.0 + Math.random() * 10.0;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.abs(Math.sin(phi) * Math.sin(theta) * speed) * 1.5 + 3.0,
        Math.cos(phi) * speed
      );

      this.activeExplosions.push({
        mesh: sparkMesh,
        velocity,
        life: 0.8 + Math.random() * 1.0,
        maxLife: 1.8,
        type: "spark"
      });
    }

    // Play retro explosion sound
    this.playSynthBoom();
  }

  private playSynthBoom() {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(12, ctx.currentTime + 0.65);
      
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.75);
    } catch (e) {
      console.warn("Retrying Web Audio failed code setup on browser sandbox constraints: ", e);
    }
  }

  public cleanup() {
    super.cleanup();

    if (this.laserGroup) {
      this.context.scene.remove(this.laserGroup);
      this.laserGroup = null;
    }

    if (this.laserMaterial) {
      this.laserMaterial.dispose();
      this.laserMaterial = null;
    }

    // Dispose active explosions meshes
    this.activeExplosions.forEach((exp) => {
      this.context.scene.remove(exp.mesh);
      exp.mesh.geometry.dispose();
      if (Array.isArray(exp.mesh.material)) {
        exp.mesh.material.forEach(m => m.dispose());
      } else {
        exp.mesh.material.dispose();
      }
    });
    this.activeExplosions = [];

    this.context.unregisterUI("toon_garden_hud");
  }
}
