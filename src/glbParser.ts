import * as fs from "fs";
import * as path from "path";
import * as THREE from "three";
import { ServerWorldTriangle } from "./physics";

function getComponentSize(type: number): number {
  if (type === 5120 || type === 5121) return 1; // BYTE, UNSIGNED_BYTE
  if (type === 5122 || type === 5123) return 2; // SHORT, UNSIGNED_SHORT
  if (type === 5125 || type === 5126) return 4; // UNSIGNED_INT, FLOAT
  return 4;
}

function readComponentValue(bin: Buffer, offset: number, type: number): number {
  if (offset + getComponentSize(type) > bin.length) return 0;
  if (type === 5120) return bin.readInt8(offset);
  if (type === 5121) return bin.readUInt8(offset);
  if (type === 5122) return bin.readInt16LE(offset);
  if (type === 5123) return bin.readUInt16LE(offset);
  if (type === 5125) return bin.readUInt32LE(offset);
  if (type === 5126) return bin.readFloatLE(offset);
  return 0;
}

function getAccessorData(json: any, bin: Buffer, accessorIndex: number): number[] {
  const accessor = json.accessors[accessorIndex];
  if (!accessor) return [];
  
  const bufferView = json.bufferViews[accessor.bufferView];
  if (!bufferView) return [];
  
  const baseOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const componentType = accessor.componentType;
  const count = accessor.count;
  const type = accessor.type; // "SCALAR", "VEC2", "VEC3", etc.

  let numComponents = 1;
  if (type === "VEC2") numComponents = 2;
  else if (type === "VEC3") numComponents = 3;
  else if (type === "VEC4") numComponents = 4;

  const data: number[] = [];
  const byteStride = bufferView.byteStride || 0;

  for (let i = 0; i < count; i++) {
    const elementOffset = baseOffset + (byteStride ? i * byteStride : i * numComponents * getComponentSize(componentType));
    for (let c = 0; c < numComponents; c++) {
      const offset = elementOffset + c * getComponentSize(componentType);
      data.push(readComponentValue(bin, offset, componentType));
    }
  }

  return data;
}

export function parseGLB(buffer: Buffer) {
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const totalLength = buffer.readUInt32LE(8);

  if (magic !== 0x46546C67) {
    throw new Error("Invalid GLB magic");
  }

  let offset = 12;
  let jsonChunk: any = null;
  let binChunk: Buffer | null = null;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) break;
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkData = buffer.subarray(offset + 8, offset + 8 + chunkLength);

    if (chunkType === 0x4E4F534A) {
      jsonChunk = JSON.parse(chunkData.toString("utf8"));
    } else if (chunkType === 0x004E4942) {
      binChunk = chunkData;
    }

    offset += 8 + chunkLength;
  }

  return { json: jsonChunk, bin: binChunk };
}

export function loadServerMapTriangles(): { triangles: ServerWorldTriangle[]; spawnLoc: THREE.Vector3 | null } {
  let glbPath = "";
  const possiblePaths = [
    path.join(process.cwd(), "src/assets/models/map.glb"),
    path.join(process.cwd(), "dist/src/assets/models/map.glb"),
    path.join(process.cwd(), "dist/assets/models/map.glb"),
    path.join(process.cwd(), "assets/models/map.glb"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      glbPath = p;
      break;
    }
  }

  if (!glbPath) {
    console.warn("[GLB PARSER] Could not find map.glb in expected path array locations!");
    return { triangles: [], spawnLoc: null };
  }

  try {
    console.log(`[GLB PARSER] Reading map.glb from path: ${glbPath}`);
    const fileBuf = fs.readFileSync(glbPath);
    const { json, bin } = parseGLB(fileBuf);

    if (!json || !bin) {
      console.warn("[GLB PARSER] Decoded GLB is missing JSON or BIN payload chunks.");
      return { triangles: [], spawnLoc: null };
    }

    const triangles: ServerWorldTriangle[] = [];
    let spawnLoc: THREE.Vector3 | null = null;

    const scene = json.scenes[json.scene || 0];
    const rootNodes = scene.nodes || [];

    for (const rootNodeIdx of rootNodes) {
      traverse(rootNodeIdx, new THREE.Matrix4());
    }

    function traverse(nodeIdx: number, parentMatrix: THREE.Matrix4) {
      const node = json.nodes[nodeIdx];
      if (!node) return;

      const currentMatrix = new THREE.Matrix4();
      if (node.matrix) {
        currentMatrix.fromArray(node.matrix);
      } else {
        const trans = node.translation ? new THREE.Vector3().fromArray(node.translation) : new THREE.Vector3();
        const rot = node.rotation ? new THREE.Quaternion().fromArray(node.rotation) : new THREE.Quaternion();
        const scl = node.scale ? new THREE.Vector3().fromArray(node.scale) : new THREE.Vector3(1, 1, 1);
        currentMatrix.compose(trans, rot, scl);
      }

      const worldMatrix = parentMatrix.clone().multiply(currentMatrix);

      if (node.name === "Spawn") {
        spawnLoc = new THREE.Vector3().setFromMatrixPosition(worldMatrix);
      }

      const nodeName = node.name || "";
      if (node.mesh !== undefined && nodeName !== "Spawn" && nodeName !== "Bomb" && nodeName !== "bomb" && !nodeName.toLowerCase().includes("bomb") && !nodeName.includes("Sky") && !nodeName.includes("Light") && !nodeName.toLowerCase().includes("button")) {
        const mesh = json.meshes[node.mesh];
        if (mesh && mesh.primitives) {
          for (const prim of mesh.primitives) {
            if (prim.attributes && prim.attributes.POSITION !== undefined) {
              const positions = getAccessorData(json, bin, prim.attributes.POSITION);
              let indices: number[] | null = null;
              if (prim.indices !== undefined) {
                indices = getAccessorData(json, bin, prim.indices);
              }

              const count = indices ? indices.length : positions.length / 3;

              for (let i = 0; i < count; i += 3) {
                const aIdx = indices ? indices[i] : i;
                const bIdx = indices ? indices[i + 1] : i + 1;
                const cIdx = indices ? indices[i + 2] : i + 2;

                if (aIdx * 3 + 2 >= positions.length || bIdx * 3 + 2 >= positions.length || cIdx * 3 + 2 >= positions.length) {
                  continue;
                }

                const a = new THREE.Vector3(positions[aIdx * 3], positions[aIdx * 3 + 1], positions[aIdx * 3 + 2]).applyMatrix4(worldMatrix);
                const b = new THREE.Vector3(positions[bIdx * 3], positions[bIdx * 3 + 1], positions[bIdx * 3 + 2]).applyMatrix4(worldMatrix);
                const c = new THREE.Vector3(positions[cIdx * 3], positions[cIdx * 3 + 1], positions[cIdx * 3 + 2]).applyMatrix4(worldMatrix);

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
            }
          }
        }
      }

      if (node.children) {
        for (const childIdx of node.children) {
          traverse(childIdx, worldMatrix);
        }
      }
    }

    console.log(`[GLB PARSER] Reconstructed ${triangles.length} meshes world collision triangles. Spawn located:`, spawnLoc ? `${spawnLoc.x}, ${spawnLoc.y}, ${spawnLoc.z}` : "none");
    return { triangles, spawnLoc };

  } catch (err) {
    console.error("[GLB PARSER] Failed loading/parsing static physical map.glb:", err);
    return { triangles: [], spawnLoc: null };
  }
}
