import * as THREE from "three";
import { Player } from "./types";

export interface ServerWorldTriangle {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  normal: THREE.Vector3;
  min: THREE.Vector3;
  max: THREE.Vector3;
  isFloor: boolean;
}

export interface PhysicsBody {
  id: string;
  type: "sphere" | "box" | "custom";
  replicatedType: string; // e.g. "ball"
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  mass: number; // 0 = static (won't move, won't fall)
  color?: string; // custom metadata
  size?: number; // scale/multiplier for rendering
  replicated: boolean; // do we replicate this?
  isGrounded?: boolean;
}

// Math Utility helper for nearest point on triangle
export function getClosestPointOnTriangle(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, out: THREE.Vector3) {
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

export class PhysicsWorld {
  triangles: ServerWorldTriangle[] = [];
  bodies: Map<string, PhysicsBody> = new Map();
  gravity = 9.81;

  constructor(triangles: ServerWorldTriangle[]) {
    this.triangles = triangles;
  }

  addBody(body: PhysicsBody) {
    this.bodies.set(body.id, body);
  }

  removeBody(id: string) {
    this.bodies.delete(id);
  }

  getBodies(): PhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  step(dt: number, players: Record<string, any>) {
    // 1. Apply gravity & update positions
    for (const body of this.bodies.values()) {
      if (body.mass === 0) continue; // Static physical entity

      // Gravity acceleration
      body.vy -= this.gravity * dt;

      // Displacement
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.z += body.vz * dt;

      // Void protection: respawn if falling into the void
      if (body.y < -30) {
        body.x = (Math.random() * 8) - 4;
        body.y = 10 + (Math.random() * 5);
        body.z = (Math.random() * 8) - 4;
        body.vx = (Math.random() * 2) - 1;
        body.vy = 0;
        body.vz = (Math.random() * 2) - 1;
      }
    }

    // 2. Resolve world collisions (map.glb statically loaded geometries)
    for (const body of this.bodies.values()) {
      if (body.mass === 0) continue;
      if (body.type === "sphere") {
        this.resolveSphereModelCollision(body);
      }
    }

    // 3. Resolve rigid body pair collisions (sphere vs sphere)
    const bodyList = Array.from(this.bodies.values());
    for (let i = 0; i < bodyList.length; i++) {
      const b1 = bodyList[i];
      for (let j = i + 1; j < bodyList.length; j++) {
        const b2 = bodyList[j];
        this.resolveBodyBodyCollision(b1, b2);
      }
    }

    // 4. Resolve player interaction collisions
    for (const playerRef of Object.values(players)) {
      const player = playerRef as any;
      if (player.physX === undefined) {
        player.physX = player.x;
        player.physY = player.y;
        player.physZ = player.z;
      }

      // Smoothly slide physical proxy position to actual packet position (exponential decay)
      const lerpFactor = 1 - Math.exp(-12 * dt); // smooth, frame-independent dampening
      const nextX = player.physX + (player.x - player.physX) * lerpFactor;
      const nextY = player.physY + (player.y - player.physY) * lerpFactor;
      const nextZ = player.physZ + (player.z - player.physZ) * lerpFactor;

      const pVx = (nextX - player.physX) / dt;
      const pVy = (nextY - player.physY) / dt;
      const pVz = (nextZ - player.physZ) / dt;

      player.physX = nextX;
      player.physY = nextY;
      player.physZ = nextZ;

      for (const body of this.bodies.values()) {
        if (body.mass === 0) continue;
        if (body.replicatedType === "bomb") continue; // Server physics does not react to player pushing bomb
        if (body.type === "sphere") {
          this.resolveSpherePlayerCollision(body, player, pVx, pVy, pVz);
        }
      }
    }
  }

  private resolveSphereModelCollision(body: PhysicsBody) {
    const radius = body.radius;
    let grounded = false;

    for (const tri of this.triangles) {
      if (body.x < tri.min.x - radius || body.x > tri.max.x + radius ||
          body.z < tri.min.z - radius || body.z > tri.max.z + radius ||
          body.y < tri.min.y - radius || body.y > tri.max.y + radius) {
        continue;
      }

      const pQuery = new THREE.Vector3(body.x, body.y, body.z);
      const closestPt = new THREE.Vector3();
      getClosestPointOnTriangle(pQuery, tri.a, tri.b, tri.c, closestPt);

      const dx = body.x - closestPt.x;
      const dy = body.y - closestPt.y;
      const dz = body.z - closestPt.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < radius) {
        const overlap = radius - dist;
        const pushDir = new THREE.Vector3(dx, dy, dz);
        if (pushDir.lengthSq() < 0.0001) {
          pushDir.copy(tri.normal);
        } else {
          pushDir.normalize();
        }

        body.x += pushDir.x * overlap;
        body.y += pushDir.y * overlap;
        body.z += pushDir.z * overlap;

        const dot = body.vx * pushDir.x + body.vy * pushDir.y + body.vz * pushDir.z;
        if (dot < 0) {
          const restitution = 0.55; // elastic rebound
          body.vx -= pushDir.x * dot * (1 + restitution);
          body.vy -= pushDir.y * dot * (1 + restitution);
          body.vz -= pushDir.z * dot * (1 + restitution);

          const friction = 0.15;
          body.vx *= (1 - friction);
          body.vz *= (1 - friction);
        }

        if (pushDir.y > 0.5) {
          grounded = true;
        }
      }
    }

    body.isGrounded = grounded;
  }

  private resolveBodyBodyCollision(b1: PhysicsBody, b2: PhysicsBody) {
    if (b1.type !== "sphere" || b2.type !== "sphere") return;

    const dx = b1.x - b2.x;
    const dy = b1.y - b2.y;
    const dz = b1.z - b2.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const minDist = b1.radius + b2.radius;

    if (dist < minDist) {
      const overlap = minDist - dist;
      const nx = dist > 0.0001 ? dx / dist : 1;
      const ny = dist > 0.0001 ? dy / dist : 0;
      const nz = dist > 0.0001 ? dz / dist : 0;

      const invM1 = b1.mass > 0 ? 1 / b1.mass : 0;
      const invM2 = b2.mass > 0 ? 1 / b2.mass : 0;
      const totalInvMass = invM1 + invM2;

      if (totalInvMass === 0) return;

      const rDelta1 = invM1 / totalInvMass;
      const rDelta2 = invM2 / totalInvMass;

      b1.x += nx * overlap * rDelta1;
      b1.y += ny * overlap * rDelta1;
      b1.z += nz * overlap * rDelta1;

      b2.x -= nx * overlap * rDelta2;
      b2.y -= ny * overlap * rDelta2;
      b2.z -= nz * overlap * rDelta2;

      const r_vx = b1.vx - b2.vx;
      const r_vy = b1.vy - b2.vy;
      const r_vz = b1.vz - b2.vz;
      const r_dot_n = r_vx * nx + r_vy * ny + r_vz * nz;

      if (r_dot_n < 0) {
        const restitution = 0.65;
        const j = -(1 + restitution) * r_dot_n / totalInvMass;

        b1.vx += nx * j * invM1;
        b1.vy += ny * j * invM1;
        b1.vz += nz * j * invM1;

        b2.vx -= nx * j * invM2;
        b2.vy -= ny * j * invM2;
        b2.vz -= nz * j * invM2;
      }
    }
  }

  private resolveSpherePlayerCollision(body: PhysicsBody, player: any, pVx: number, pVy: number, pVz: number) {
    const PLAYER_HEIGHT = 1.8;
    const PLAYER_R = 0.53;

    // Use physical coordinates of player for contact determination
    const pX = player.physX !== undefined ? player.physX : player.x;
    const pY = player.physY !== undefined ? player.physY : player.y;
    const pZ = player.physZ !== undefined ? player.physZ : player.z;

    const closestY = Math.max(pY, Math.min(body.y, pY + PLAYER_HEIGHT));

    const dx = body.x - pX;
    const dy = body.y - closestY;
    const dz = body.z - pZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const minDist = body.radius + PLAYER_R;

    if (dist < minDist) {
      const overlap = minDist - dist;
      const nx = dist > 0.0001 ? dx / dist : 1;
      const ny = dist > 0.0001 ? dy / dist : 0;
      const nz = dist > 0.0001 ? dz / dist : 0;

      // Pushed fully as player is treated kinematic
      body.x += nx * overlap;
      body.y += ny * overlap;
      body.z += nz * overlap;

      const r_vx = body.vx - pVx;
      const r_vy = body.vy - pVy;
      const r_vz = body.vz - pVz;
      const r_dot_n = r_vx * nx + r_vy * ny + r_vz * nz;

      if (r_dot_n < 0) {
        // Find player movement vector projected onto normal to check if they are actively pushing
        const p_dot_n = pVx * nx + pVy * ny + pVz * nz;

        // Active pushing
        if (p_dot_n > 0.1) {
          const pushForce = 1.6;
          body.vx = pVx + nx * (p_dot_n * pushForce + 1.2);
          body.vy = pVy + ny * (Math.max(0, pVy) + 1.0);
          body.vz = pVz + nz * (p_dot_n * pushForce + 1.2);
        } else {
          // Gentle bounce/rejoin if ball bumps into stationary player
          const bounceFactor = 1.15;
          body.vx -= nx * r_dot_n * bounceFactor;
          body.vy -= ny * r_dot_n * bounceFactor;
          body.vz -= nz * r_dot_n * bounceFactor;
        }
      }
    }
  }
}
