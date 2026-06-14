const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeClientMove(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  isMoving: boolean
): ArrayBuffer {
  const buffer = new ArrayBuffer(26);
  const view = new DataView(buffer);
  view.setUint8(0, 1); // Message Type 1 (Client movement)
  view.setFloat32(1, x, true); // littleEndian = true
  view.setFloat32(5, y, true);
  view.setFloat32(9, z, true);
  view.setFloat32(13, rx, true);
  view.setFloat32(17, ry, true);
  view.setFloat32(21, rz, true);
  view.setUint8(25, isMoving ? 1 : 0);
  return buffer;
}

export interface ClientMoveData {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  isMoving: boolean;
}

export function decodeClientMove(buffer: ArrayBuffer | Buffer): ClientMoveData {
  let arrayBuffer = buffer;
  let byteOffset = 0;
  let byteLength = buffer.byteLength;
  if ((buffer as any).buffer) {
    arrayBuffer = (buffer as any).buffer;
    byteOffset = (buffer as any).byteOffset || 0;
    byteLength = (buffer as any).byteLength;
  }

  const view = new DataView(arrayBuffer as ArrayBuffer, byteOffset, byteLength);
  const x = view.getFloat32(1, true);
  const y = view.getFloat32(5, true);
  const z = view.getFloat32(9, true);
  const rx = view.getFloat32(13, true);
  const ry = view.getFloat32(17, true);
  const rz = view.getFloat32(21, true);
  const isMoving = view.getUint8(25) !== 0;

  return { x, y, z, rx, ry, rz, isMoving };
}

export function encodeServerPlayerMoved(
  playerId: string,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  isMoving: boolean
): ArrayBuffer {
  const idBytes = encoder.encode(playerId);
  const idLen = idBytes.length;

  // 1 byte msgType (2)
  // 1 byte id length
  // idLen bytes id
  // 4 bytes x
  // 4 bytes y
  // 4 bytes z
  // 4 bytes rx
  // 4 bytes ry
  // 4 bytes rz
  // 1 byte isMoving
  const totalLen = 1 + 1 + idLen + 25;
  const buffer = new ArrayBuffer(totalLen);
  const view = new DataView(buffer);

  view.setUint8(0, 2); // Message Type 2 (Server player moved)
  view.setUint8(1, idLen);

  const u8Array = new Uint8Array(buffer);
  u8Array.set(idBytes, 2);

  let offset = 2 + idLen;
  view.setFloat32(offset, x, true);
  view.setFloat32(offset + 4, y, true);
  view.setFloat32(offset + 8, z, true);
  view.setFloat32(offset + 12, rx, true);
  view.setFloat32(offset + 16, ry, true);
  view.setFloat32(offset + 20, rz, true);
  view.setUint8(offset + 24, isMoving ? 1 : 0);

  return buffer;
}

export interface ServerPlayerMovedData {
  id: string;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  isMoving: boolean;
}

export function decodeServerPlayerMoved(buffer: ArrayBuffer | Buffer): ServerPlayerMovedData {
  let arrayBuffer = buffer;
  let byteOffset = 0;
  let byteLength = buffer.byteLength;
  if ((buffer as any).buffer) {
    arrayBuffer = (buffer as any).buffer;
    byteOffset = (buffer as any).byteOffset || 0;
    byteLength = (buffer as any).byteLength;
  }

  const view = new DataView(arrayBuffer as ArrayBuffer, byteOffset, byteLength);
  const idLen = view.getUint8(1);

  // Read id bytes
  const idBytes = new Uint8Array(arrayBuffer as ArrayBuffer, byteOffset + 2, idLen);
  const id = decoder.decode(idBytes);

  let offset = 2 + idLen;
  const x = view.getFloat32(offset, true);
  const y = view.getFloat32(offset + 4, true);
  const z = view.getFloat32(offset + 8, true);
  const rx = view.getFloat32(offset + 12, true);
  const ry = view.getFloat32(offset + 16, true);
  const rz = view.getFloat32(offset + 20, true);
  const isMoving = view.getUint8(offset + 24) !== 0;

  return { id, x, y, z, rx, ry, rz, isMoving };
}
