import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Player, Collectible, Room, ChatMessage } from "./src/types";
import { GoogleGenAI } from "@google/genai";
import { decodeClientMove, encodeServerPlayerMoved } from "./src/binaryProtocol";
import { PhysicsWorld } from "./src/physics";
import { loadServerMapTriangles } from "./src/glbParser";
import { ServerScriptController } from "./src/game/ServerScriptController";

// Standard fixed obstacles for alignment
const OBSTACLES: Array<{ x: number; z: number; radius: number; height: number }> = [];

// Load map.glb geometries for server-side physics collision
const { triangles: mapTriangles, spawnLoc: serverSpawnLoc } = loadServerMapTriangles();

export interface ServerRoom extends Room {
  physicsWorld: PhysicsWorld;
  physicsInterval?: NodeJS.Timeout;
  syncInterval?: NodeJS.Timeout;
  mode?: string;
  creatorId?: string;
  creatorName?: string;
  buttonTimer?: NodeJS.Timeout;
  scriptController?: ServerScriptController;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Rooms store with physical simulation capabilities
  const rooms: Record<string, ServerRoom> = {};
  let nextRoomId = 1;

  // Map WebSocket connections to active player session info
  const clientSessions = new Map<WebSocket, { playerId: string; roomId: string }>();

  // WebSocket connection handler
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    // Let Vite handle its ws matching, and overlay our custom socket path if needed, or upgrade globally
    if (pathname.startsWith("/_vite")) {
      // Let Vite server upgrade
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  function createRoom(id: string, name: string, creatorId?: string, creatorName?: string, mode: string = "all"): ServerRoom {
    const pWorld = new PhysicsWorld(mapTriangles);

    const roomObj: ServerRoom = {
      id,
      name,
      players: {},
      collectibles: [],
      physicsWorld: pWorld,
      mode,
      creatorId,
      creatorName,
      buttonIsPressed: false,
      buttonPressedUntil: 0
    } as any;

    // Start simulation ticks at 60Hz
    const dt = 1 / 60;
    roomObj.physicsInterval = setInterval(() => {
      try {
        pWorld.step(dt, roomObj.players);
        if (roomObj.scriptController) {
          roomObj.scriptController.tick(dt);
        }
      } catch (err) {
        console.error(`[PHYSICS] Process tick failed for room ${id}:`, err);
      }
    }, 1000 / 60);

    // Start replication broadcasts at 10Hz
    roomObj.syncInterval = setInterval(() => {
      try {
        if (Object.keys(roomObj.players).length === 0) return;

        const bodies = pWorld.getBodies().filter(b => b.replicated).map(b => ({
          id: b.id,
          type: b.type,
          replicatedType: b.replicatedType,
          x: Number(b.x.toFixed(3)),
          y: Number(b.y.toFixed(3)),
          z: Number(b.z.toFixed(3)),
          vx: Number(b.vx.toFixed(2)),
          vy: Number(b.vy.toFixed(2)),
          vz: Number(b.vz.toFixed(2)),
          radius: Number(b.radius.toFixed(2)),
          mass: Number(b.mass.toFixed(1)),
          color: b.color,
          isGrounded: b.isGrounded
        }));

        const message = {
          type: "physics_sync",
          payload: {
            bodies
          }
        };

        // Broadcast state payload
        broadcastToRoom(id, message);
      } catch (err) {
        console.error(`[REPLICATION] Broadcast state failed for room ${id}:`, err);
      }
    }, 100);

    // Instantiate ServerScriptController for modular game logic script
    roomObj.scriptController = new ServerScriptController(
      id,
      roomObj,
      pWorld,
      (msg, excludeSocket) => broadcastToRoom(id, msg, excludeSocket),
      (pId, msg) => {
        // Safe direct broadcast to target player ID using WebSocket
        clientSessions.forEach((ss, ws) => {
          if (ss.playerId === pId && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
          }
        });
      }
    );

    return roomObj;
  }

  function destroyRoom(id: string) {
    const room = rooms[id];
    if (room) {
      if (room.scriptController) {
        room.scriptController.cleanup();
      }
      if (room.physicsInterval) clearInterval(room.physicsInterval);
      if (room.syncInterval) clearInterval(room.syncInterval);
      if (room.buttonTimer) clearTimeout(room.buttonTimer);
      delete rooms[id];
      console.log(`[ROOM_CLEANUP] Physics world, scriptController and scheduler timers destroyed for room ${id}`);
    }
  }

  // Helper to resolve room names nicely
  function getRoomPrettyName(id: string): string {
    const names: Record<string, string> = {
      "neon-temple": "Toon Garden",
      "cyber-grid": "Paper Arena",
      "retro-playground": "Sunset Play"
    };
    if (names[id]) return names[id];
    if (id.startsWith("grid-")) {
      return `Grid Server ${id.replace("grid-", "")}`;
    }
    return `Server ${id}`;
  }

  // Check for profanity / swear words in the string
  function isProfane(word: string): boolean {
    if (!word) return false;
    const cleanWord = word.trim().toLowerCase();

    // Normalizations for Russian detection: normalize lookalike Latin letters and numbers to standard Cyrillic
    let norm = cleanWord
      .replace(/0/g, 'о')
      .replace(/3/g, 'з')
      .replace(/4/g, 'ч')
      .replace(/@/g, 'а')
      .replace(/\$/g, 'с')
      .replace(/!/g, 'и')
      .replace(/1/g, 'и')
      .replace(/a/g, 'а')
      .replace(/b/g, 'б')
      .replace(/c/g, 'с')
      .replace(/e/g, 'е')
      .replace(/k/g, 'к')
      .replace(/m/g, 'м')
      .replace(/o/g, 'о')
      .replace(/p/g, 'р')
      .replace(/t/g, 'т')
      .replace(/u/g, 'у')
      .replace(/x/g, 'х')
      .replace(/y/g, 'у')
      .replace(/h/g, 'н')
      .replace(/g/g, 'г')
      .replace(/r/g, 'р');

    // Innocent patterns that contain sequences resembling bad words but are completely fine
    const innocentPatterns = [
      /колеб/i,
      /хлеб/i,
      /треб/i,
      /слаб/i,
      /люб/i,
      /тереб/i,
      /рубл/i,
      /барсук/i,
      /рисун/i,
      /рассуд/i,
      /сукно/i,
      /сукн/i,
      /суккуб/i,
      /оскорб/i,
      /сабл/i,
      /грабл/i,
      /стебл/i,
      /кабинет/i,
      /кибитка/i,
      /лоб/i,
      /боб/i,
      /дрозд/i,
      /себ/i,       // себя, себе, собой etc.
      /реб/i,       // ребенок, ребята etc.
      /суд/i,       // суды, судьба, судно, судебный etc.
      /греб/i,      // грести, гребля, гребень, погреб
      /хреб/i,      // хребет
      /деба/i,      // дебаты
      /дебе/i,      // дебет
      /амеб/i,      // амеба
      /учеб/i,      // учеба, учебный
      /свад/i,      // свадьба, свадебный
      /плацеб/i,    // плацебо
      /кибер/i,     // кибер, cyber
      /cyber/i,
      /дроб/i,      // дробь, подробно
      /страх/i,     // страхование, страх, бесстрашный (to protect from /трах/)
      /страш/i,     // страшно, страшный
      /подроб/i,    // подробно
      /спорн/i,     // спорный (to protect from potential /порн/)
      /упорн/i,     // упорный
      /опорн/i,     // опорный
      /топорн/i,    // топорный
      /транспор/i,  // транспорт
      /пропор/i,    // пропорции
      /запорн/i,    // запорный
      /напорн/i,    // напорный
      /вздорн/i,    // вздорный
      /дозорн/i,    // дозорный
      /scunthorpe/i,
      /association/i,
      /passport/i,
      /compass/i,
      /grass/i,
      /class/i,
      /glass/i,
      /massive/i,
      /bypass/i
    ];

    if (innocentPatterns.some(p => p.test(norm) || p.test(cleanWord))) {
      return false;
    }

    // Russian profanity roots matched on fully normalized Cyrillic string `norm`
    const badRussianPatterns = [
      // хуй / хуя / хули / похуй / ...
      /хуй/i, /хуя/i, /хуи/i, /хуе/i, /хуё/i, /хули/i, /хуле/i, /нахуй/i, /похуй/i, /дохуя/i, /захуя/i, /охуе/i, /охуи/i, /сык/i, /охуеть/i,
      
      // пизда / ...
      /пизд/i,
      
      // ебать / ебли / ебу ...
      /еба/i, /ебл/i, /ебт/i, /ебу/i, /еби/i, /объеб/i, /выеб/i, /уеб/i, /поеб/i, /заеб/i, /ебы/i, /ебн/i, /долбое/i, /долбоё/i, /proeb/i, /проеб/i, /приеб/i, /наеб/i,
      
      // бля / блять / блядина
      /бля/i,
      
      // сука
      /сука/i, /сук[аиоеу]/i, /cyka/i, /syka/i,
      
      // гондон
      /гондо/i, /гандо/i,
      
      // мудак
      /муда/i, /муде/i,
      
      // пидор / пидар
      /пидо/i, /пида/i, /педо/i, /педри/i,
      
      // манда
      /манд/i,
      
      // говно
      /говн/i, /гавн/i,
      
      // залупа
      /залуп/i,
      
      // дрочить
      /дроч/i, /онани/i, /мастурб/i,
      
      // шлюха
      /шлюх/i, /шалав/i, /проститут/i,
      
      // ублюдок
      /ублюд/i,
      
      // член
      /член/i,
      
      // 18+ / NSFW Russian keywords
      /порно/i, /порнух/i, /порнограф/i,
      /секс/i, /сексу/i, /секса/i, /сексо/i,
      /куни/i, /кунни/i, /кунилин/i, /минет/i, /миньет/i,
      /траха/i, /трахн/i, /траху/i, /отсос/i, /сосать/i,
      /сиськ/i, /сисеч/i, /сисек/i,
      /камшот/i, /дилдо/i, /страпон/i,
      /группову/i, /педофи/i, /некрофи/i, /зоофи/i
    ];

    if (badRussianPatterns.some(p => p.test(norm))) {
      return true;
    }

    // English bad words normalization (remove common bypassing symbols like f*ck -> fuck, s_h_i_t -> shit)
    const normalizedEnglish = cleanWord
      .replace(/[*_#@$!]/g, '')
      .replace(/1/g, 'i')
      .replace(/0/g, 'o')
      .replace(/3/g, 'e');

    const badEnglishPatterns = [
      /fuck/i, /fck/i, /fuk/i, /fux/i, /bitch/i, /btch/i, /bich/i, /bicth/i,
      /shit/i, /sht/i, /shat/i, /cunt/i, /dick/i, /dildo/i, /cock/i, /pussy/i, /puss\b/i,
      /bastard/i, /retard/i, /slut/i, /whore/i, /asshole/i, /\bass\b/i, /\barse\b/i, /arsehole/i,
      
      // 18+ / NSFW English keywords
      /porn/i, /porno/i, /porno/i, /hentai/i,
      /tits/i, /titt/i, /boob/i,
      /cum/i, /cumming/i, /cumshot/i, /milf/i,
      /clit/i, /clitoris/i, /vagina/i, /penis/i, /anus/i,
      /blowjob/i, /handjob/i, /cunnilingus/i, /gangbang/i,
      /orgasm/i, /masturbat/i, /nude/i, /naked/i, /prostitut/i,
      /deepthroat/i, /sex/i
    ];

    if (badEnglishPatterns.some(p => p.test(normalizedEnglish) || p.test(cleanWord))) {
      return true;
    }

    return false;
  }

  function censorProfanity(text: string): string {
    if (!text) return "";
    const wordRegex = /[\w\u0400-\u04FF@$*_-]+/g;
    return text.replace(wordRegex, (word) => {
      if (isProfane(word)) {
        return "*".repeat(word.length);
      }
      return word;
    });
  }

  // Broadcast helper
  function broadcastToRoom(roomId: string, message: any, excludeSocket?: WebSocket) {
    const isBinary = message instanceof ArrayBuffer || message instanceof Uint8Array || Buffer.isBuffer(message);
    const dataToSend = isBinary ? message : JSON.stringify(message);
    clientSessions.forEach((session, ws) => {
      if (session.roomId === roomId && ws !== excludeSocket && ws.readyState === WebSocket.OPEN) {
        ws.send(dataToSend);
      }
    });
  }

  function buildAvailableRoomsForClient(ws: WebSocket): any[] {
    const session = clientSessions.get(ws);
    if (!session) return [];
    const { playerId, roomId } = session;

    // Retrieve player details dynamically from the room they are in
    const currentRoom = rooms[roomId];
    const playerObj = currentRoom ? currentRoom.players[playerId] : null;
    const clientFriends = (playerObj as any)?.friendsList || [];

    return Object.keys(rooms)
      .filter(rId => {
        const room = rooms[rId] as any;
        const mode = room.mode || "all";

        if (mode === "all" || !rId.startsWith("private-")) return true;

        if (mode === "only_me") {
          return false;
        }

        if (mode === "friends") {
          if (room.creatorId === playerId) return true;
          return clientFriends.includes(room.creatorName);
        }

        return true;
      })
      .map(rId => {
        const room = rooms[rId] as any;
        return {
          id: rId,
          name: room.name,
          activePlayers: Object.keys(room.players).length,
          mode: room.mode || "all",
          creatorId: room.creatorId,
          creatorName: room.creatorName,
          players: Object.values(room.players).map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            avatarStyle: p.avatarStyle,
            decorFrame: p.decorFrame || "none",
            nameEffect: p.nameEffect || "none",
            avatarUrl: p.avatarUrl || undefined
          }))
        };
      });
  }

  const lastSentRoomsData = new Map<WebSocket, string>();

  // Broadcast updated room lists to all connected users
  function broadcastRoomCountsToAll() {
    clientSessions.forEach((session, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const availableRooms = buildAvailableRoomsForClient(ws);
        const serialized = JSON.stringify(availableRooms);
        const lastSerialized = lastSentRoomsData.get(ws);
        if (lastSerialized === serialized) {
          // Skip redundant updates
          return;
        }
        lastSentRoomsData.set(ws, serialized);
        ws.send(JSON.stringify({
          type: "room_counts_update",
          payload: {
            availableRooms
          }
        }));
      }
    });
  }

  const socketRates = new Map<WebSocket, { count: number; lastReset: number }>();

  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection established.");
    socketRates.set(ws, { count: 0, lastReset: Date.now() });

    ws.on("message", (rawMessage: any, isBinary: boolean) => {
      try {
        const now = Date.now();
        const rateInfo = socketRates.get(ws);
        if (rateInfo) {
          if (now - rateInfo.lastReset > 1000) {
            rateInfo.count = 0;
            rateInfo.lastReset = now;
          }
          rateInfo.count++;
          if (rateInfo.count > 150) {
            console.warn("Closing connection due to rate limit violation");
            ws.close(1008, "Rate limit exceeded");
            return;
          }
        }

        if (isBinary) {
          const view = new DataView(
            rawMessage.buffer,
            rawMessage.byteOffset,
            rawMessage.byteLength
          );
          const msgType = view.getUint8(0);
          if (msgType === 1) {
            // Client move message
            const session = clientSessions.get(ws);
            if (!session) return;
            const { roomId, playerId } = session;
            const room = rooms[roomId];
            if (!room) return;

            const player = room.players[playerId];
            if (player) {
              const decoded = decodeClientMove(rawMessage);
              player.x = decoded.x;
              player.y = decoded.y;
              player.z = decoded.z;
              player.rx = decoded.rx;
              player.ry = decoded.ry;
              player.rz = decoded.rz;
              player.isMoving = decoded.isMoving;

              // Broadcast player movement in binary format to other players in the room!
              const binMessage = encodeServerPlayerMoved(
                playerId,
                player.x,
                player.y,
                player.z,
                player.rx,
                player.ry,
                player.rz,
                player.isMoving
              );
              broadcastToRoom(roomId, binMessage, ws);
            }
          }
          return;
        }

        const data = JSON.parse(rawMessage.toString());
        const { type, payload } = data;

        // Custom script packet routing
        const sessionForRoute = clientSessions.get(ws);
        if (sessionForRoute) {
          const { roomId, playerId } = sessionForRoute;
          const roomToRoute = rooms[roomId];
          if (roomToRoute && roomToRoute.scriptController) {
            const wasHandled = roomToRoute.scriptController.handleMessage(playerId, type, payload);
            if (wasHandled) {
              return;
            }
          }
        }

        if (type === "join") {
          let { name, color, avatarStyle, requestedRoomId, particleTrail, nameEffect, decorFrame, friendsList, avatarUrl } = payload;
          const friendsListSanitized: string[] = Array.isArray(friendsList) ? friendsList : [];
          const playerId = `player-${Date.now()}-${Math.round(Math.random() * 1000)}`;

          // Sanitize startup nickname request to prevent spoofing NODE and prevent script/HTML tags
          let finalName = typeof name === "string" ? name.trim().substring(0, 16).replace(/<\/?[^>]+(>|$)/g, "") : "";
          if (isProfane(finalName)) {
            finalName = censorProfanity(finalName);
          }
          if (!finalName) {
            finalName = `CyberRobot-${Math.round(Math.random() * 1000)}`;
          }
          let isJoinAdmin = false;
          if (finalName.trim().toUpperCase() === "NODE") {
            const enteredPassword = (payload.password || "").trim();
            if (enteredPassword === "N0DE0969") {
              finalName = "NODE";
              isJoinAdmin = true;
            } else {
              finalName = `CyberRobot-${Math.round(Math.random() * 899) + 100}`;
            }
          }

          // Switch/Join explicit requested room if defined, else matchmake
          let targetRoomId = requestedRoomId || "";

          if (targetRoomId) {
            const targetRoom = rooms[targetRoomId] as any;
            if (targetRoom) {
              const currentCount = Object.keys(targetRoom.players).length;
              if (currentCount >= 10 && targetRoom.creatorId !== playerId) {
                ws.send(JSON.stringify({
                  type: "join_error",
                  payload: { roomId: targetRoomId, message: "Этот сервер уже заполнен (максимум 10 игроков)." }
                }));
                return;
              }
              const rMode = targetRoom.mode || "all";
              if (rMode === "only_me" && targetRoom.creatorId !== playerId) {
                ws.send(JSON.stringify({
                  type: "join_error",
                  payload: { roomId: targetRoomId, message: "Этот сервер доступен только его владельцу." }
                }));
                return;
              }
              if (rMode === "friends" && targetRoom.creatorId !== playerId) {
                const isFriendOfOwner = friendsListSanitized.includes(targetRoom.creatorName);
                if (!isFriendOfOwner) {
                  ws.send(JSON.stringify({
                    type: "join_error",
                    payload: { roomId: targetRoomId, message: "Этот сервер доступен только друзьям владельца." }
                  }));
                  return;
                }
              }
            }

            if (!rooms[targetRoomId]) {
              rooms[targetRoomId] = createRoom(targetRoomId, getRoomPrettyName(targetRoomId));
            }
          } else {
            // Dynamic Matchmaking: Find any non-full, non-private room.
            // Priority:
            // 1. Rooms where friends are playing. If there are multiple, choose the one with the most friends.
            // 2. Other non-full public rooms (filling existing ones first to prevent sparse rooms).
            let bestRoomId = "";
            let bestFriendsCount = -1;
            let bestPlayerCount = -1;

            const checkIsRoomPrivate = (room: ServerRoom) => {
              if (room.id.startsWith("private-")) return true;
              if (room.mode === "only_me" || room.mode === "friends") return true;
              if ((room as any).password) return true;
              return false;
            };

            for (const rId of Object.keys(rooms)) {
              const room = rooms[rId];
              const isPrivate = checkIsRoomPrivate(room);
              if (!isPrivate) {
                const currentCount = Object.keys(room.players).length;
                if (currentCount < 10) { // Limit to 10 players
                  // Calculate active friends in this room
                  let friendsCount = 0;
                  for (const p of Object.values(room.players)) {
                    if (friendsListSanitized.includes(p.name)) {
                      friendsCount++;
                    }
                  }

                  if (friendsCount > 0) {
                    // This room contains friends!
                    if (bestFriendsCount < 0 || friendsCount > bestFriendsCount) {
                      bestFriendsCount = friendsCount;
                      bestRoomId = rId;
                      bestPlayerCount = currentCount;
                    } else if (friendsCount === bestFriendsCount) {
                      // Tie breaker: prefer rooms with more active players to maximize action
                      if (currentCount > bestPlayerCount) {
                        bestRoomId = rId;
                        bestPlayerCount = currentCount;
                      }
                    }
                  } else if (bestFriendsCount <= 0) {
                    // No friends found yet. We prefer filling existing non-empty public rooms first!
                    // If multiple public rooms exist, choose the most populated one to keep them active.
                    if (currentCount > bestPlayerCount) {
                      bestPlayerCount = currentCount;
                      bestRoomId = rId;
                    }
                  }
                }
              }
            }

            if (bestRoomId) {
              targetRoomId = bestRoomId;
            }

            if (!targetRoomId) {
              const presets = ["neon-temple", "cyber-grid", "retro-playground"];
              const availablePreset = presets.find(id => !rooms[id]);
              targetRoomId = availablePreset || `grid-${nextRoomId++}`;
              rooms[targetRoomId] = createRoom(targetRoomId, getRoomPrettyName(targetRoomId));
            }
          }

          // Create new Player object
          const newPlayer: Player = {
            id: playerId,
            name: finalName,
            color: color || "#00f0ff",
            x: (Math.random() * 30) - 15,
            y: 0,
            z: (Math.random() * 30) - 15,
            rx: 0,
            ry: 0,
            rz: 0,
            score: 0,
            isMoving: false,
            avatarStyle: avatarStyle || 0,
            particleTrail: particleTrail || "none",
            nameEffect: nameEffect || "none",
            decorFrame: decorFrame || "none",
            isAdmin: isJoinAdmin,
            avatarUrl: avatarUrl || undefined
          };
          (newPlayer as any).friendsList = friendsListSanitized;

          // Store session mapping
          clientSessions.set(ws, { playerId, roomId: targetRoomId });

          // Add to room's players roster
          rooms[targetRoomId].players[playerId] = newPlayer;

          // Send init payload to newly connected client
          ws.send(JSON.stringify({
            type: "init",
            payload: {
              playerId,
              roomId: targetRoomId,
              roomInfo: {
                id: targetRoomId,
                name: rooms[targetRoomId].name,
                players: rooms[targetRoomId].players,
                obstacles: OBSTACLES,
                buttonIsPressed: !!rooms[targetRoomId].buttonIsPressed,
                buttonPressedUntil: rooms[targetRoomId].buttonPressedUntil || 0
              },
              availableRooms: buildAvailableRoomsForClient(ws)
            }
          }));

          // Broadcast join update to other players in the room
          broadcastToRoom(targetRoomId, {
            type: "player_joined",
            payload: { player: newPlayer }
          }, ws);

          console.log(`Player ${newPlayer.name} (${playerId}) joined room ${targetRoomId}`);

          if (rooms[targetRoomId].scriptController) {
            rooms[targetRoomId].scriptController.handlePlayerJoined(playerId, newPlayer);
          }
          
          // Broadcast list updates to everybody!
          broadcastRoomCountsToAll();
        }

        else if (type === "switch_room") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId: oldRoomId, playerId } = session;
          const { newRoomId, password } = payload;

          if (oldRoomId === newRoomId) return;

          const oldRoom = rooms[oldRoomId];
          if (!oldRoom) return;

          const player = oldRoom.players[playerId];
          if (!player) return;

          // Check if target room is private/friends-only or full
          const targetRoom = rooms[newRoomId] as any;
          if (targetRoom) {
            const currentCount = Object.keys(targetRoom.players).length;
            if (currentCount >= 10 && targetRoom.creatorId !== playerId) {
              ws.send(JSON.stringify({
                type: "join_error",
                payload: { roomId: newRoomId, message: "Этот сервер уже заполнен (максимум 10 игроков)." }
              }));
              return;
            }
            const rMode = targetRoom.mode || "all";
            if (rMode === "only_me" && targetRoom.creatorId !== playerId) {
              ws.send(JSON.stringify({
                type: "join_error",
                payload: { roomId: newRoomId, message: "Этот сервер доступен только его владельцу." }
              }));
              return;
            }
            if (rMode === "friends" && targetRoom.creatorId !== playerId) {
              const joinerFriends = (player as any).friendsList || [];
              const isFriendOfOwner = joinerFriends.includes(targetRoom.creatorName);
              if (!isFriendOfOwner) {
                ws.send(JSON.stringify({
                  type: "join_error",
                  payload: { roomId: newRoomId, message: "Этот сервер доступен только друзьям владельца." }
                }));
                return;
              }
            }
          }

          // Remove from old room
          if (oldRoom.scriptController) {
            oldRoom.scriptController.handlePlayerLeft(playerId);
          }
          delete oldRoom.players[playerId];

          // Broadcast player_left to old room
          broadcastToRoom(oldRoomId, {
            type: "player_left",
            payload: { id: playerId }
          });

          // Delete old room if empty
          if (Object.keys(oldRoom.players).length === 0) {
            destroyRoom(oldRoomId);
          }

          // Ensure new room exists
          if (!rooms[newRoomId]) {
            rooms[newRoomId] = createRoom(newRoomId, getRoomPrettyName(newRoomId));
          }

          // Direct player into new room
          rooms[newRoomId].players[playerId] = player;
          session.roomId = newRoomId;

          // Reset coordinate positions in new arena to prevent overlap issues
          player.x = (Math.random() * 30) - 15;
          player.y = 0;
          player.z = (Math.random() * 30) - 15;

          // Send updated init package back to switching client
          ws.send(JSON.stringify({
            type: "init",
            payload: {
              playerId,
              roomId: newRoomId,
              roomInfo: {
                id: newRoomId,
                name: rooms[newRoomId].name,
                players: rooms[newRoomId].players,
                obstacles: OBSTACLES,
                buttonIsPressed: !!rooms[newRoomId].buttonIsPressed,
                buttonPressedUntil: rooms[newRoomId].buttonPressedUntil || 0
              },
              availableRooms: buildAvailableRoomsForClient(ws)
            }
          }));

          // Broadcast join to new room
          broadcastToRoom(newRoomId, {
            type: "player_joined",
            payload: { player }
          }, ws);

          console.log(`Player ${player.name} (${playerId}) switched from room ${oldRoomId} to ${newRoomId}`);
          
          // Broadcast list updates to everybody!
          broadcastRoomCountsToAll();
        }

        else if (type === "create_room") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId: oldRoomId, playerId } = session;
          const { name, mode } = payload; // mode: "only_me" | "friends" | "all"

          const oldRoom = rooms[oldRoomId];
          const player = oldRoom ? oldRoom.players[playerId] : null;
          if (!player) return;

          if (!name || name.trim() === "") return;

          const newRoomId = `private-${Date.now()}-${Math.round(Math.random() * 1000)}`;

          // Create the room with privacy mode instead of password
          rooms[newRoomId] = createRoom(newRoomId, name.trim(), playerId, player.name, mode || "all");

          // Now switch the player to the newly created room
          if (player) {
            // Remove from old room
            if (oldRoom && oldRoom.scriptController) {
              oldRoom.scriptController.handlePlayerLeft(playerId);
            }
            delete oldRoom.players[playerId];

            // Broadcast player_left to old room
            broadcastToRoom(oldRoomId, {
              type: "player_left",
              payload: { id: playerId }
            });

            // Delete old room if empty
            if (oldRoomId && rooms[oldRoomId] && Object.keys(rooms[oldRoomId].players).length === 0) {
              destroyRoom(oldRoomId);
            }

            // Put player in new room
            rooms[newRoomId].players[playerId] = player;
            session.roomId = newRoomId;

            player.x = (Math.random() * 30) - 15;
            player.y = 0;
            player.z = (Math.random() * 30) - 15;

            // Send init packet back to client
            ws.send(JSON.stringify({
              type: "init",
              payload: {
                playerId,
                roomId: newRoomId,
                roomInfo: {
                  id: newRoomId,
                  name: rooms[newRoomId].name,
                  players: rooms[newRoomId].players,
                  obstacles: OBSTACLES,
                  buttonIsPressed: !!rooms[newRoomId].buttonIsPressed,
                  buttonPressedUntil: rooms[newRoomId].buttonPressedUntil || 0
                },
                availableRooms: buildAvailableRoomsForClient(ws)
              }
            }));

            // Notify others in room
            broadcastToRoom(newRoomId, {
              type: "player_joined",
              payload: { player }
            }, ws);

            console.log(`Private Room ${rooms[newRoomId].name} (${newRoomId}) created by Player ${player.name}`);
            
            // Broadcast room update to everyone as well
            broadcastRoomCountsToAll();
          }
        }

        else if (type === "move") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          if (!room) return;

          const player = room.players[playerId];
          if (player) {
            // Update coordinates
            player.x = payload.x;
            player.y = payload.y;
            player.z = payload.z;
            player.rx = payload.rx;
            player.ry = payload.ry;
            player.rz = payload.rz;
            player.isMoving = payload.isMoving;

            // Broadcast movement delta to all other players in same room (fast stream)
            broadcastToRoom(roomId, {
              type: "player_moved",
              payload: {
                id: playerId,
                x: player.x,
                y: player.y,
                z: player.z,
                rx: player.rx,
                ry: player.ry,
                rz: player.rz,
                isMoving: player.isMoving
              }
            }, ws);
          }
        }

        else if (type === "button_press") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId } = session;
          const room = rooms[roomId];
          if (!room) return;

          // Check if button is already pressed
          if (!room.buttonIsPressed) {
            room.buttonIsPressed = true;
            room.buttonPressedUntil = Date.now() + 5000;

            console.log(`[BUTTON_PRESS] Button pressed in room ${roomId}. Locking state for 5000ms.`);

            broadcastToRoom(roomId, {
              type: "button_state_changed",
              payload: {
                isPressed: true,
                pressedUntil: room.buttonPressedUntil
              }
            });

            if (room.buttonTimer) {
              clearTimeout(room.buttonTimer);
            }

            room.buttonTimer = setTimeout(() => {
              room.buttonIsPressed = false;
              room.buttonPressedUntil = 0;
              room.buttonTimer = undefined;

              console.log(`[BUTTON_RESET] Room ${roomId} button unlocked and reset.`);

              broadcastToRoom(roomId, {
                type: "button_state_changed",
                payload: {
                  isPressed: false,
                  pressedUntil: 0
                }
              });
            }, 5000);
          }
        }

        else if (type === "profile_update") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          if (!room) return;

          const player = room.players[playerId];
          if (player) {
            let requestedName = typeof payload.name === "string" ? payload.name.trim().substring(0, 16).replace(/<\/?[^>]+(>|$)/g, "") : "";
            if (isProfane(requestedName)) {
              requestedName = censorProfanity(requestedName);
            }
            if (!requestedName) {
              requestedName = player.name;
            }

            const incomingColor = payload.color || player.color;
            const incomingTrail = payload.particleTrail || player.particleTrail;
            const incomingEffect = payload.nameEffect || player.nameEffect;
            const incomingFrame = payload.decorFrame || player.decorFrame;
            const incomingStyle = typeof payload.avatarStyle === "number" ? payload.avatarStyle : player.avatarStyle;
            const incomingUrl = payload.avatarUrl !== undefined ? payload.avatarUrl : player.avatarUrl;

            const isChanged = 
              requestedName !== player.name ||
              incomingColor !== player.color ||
              incomingTrail !== player.particleTrail ||
              incomingEffect !== player.nameEffect ||
              incomingFrame !== player.decorFrame ||
              incomingStyle !== player.avatarStyle ||
              incomingUrl !== player.avatarUrl;

            const isClaimingNode = requestedName.toUpperCase() === "NODE";
            if (!isClaimingNode && !isChanged) {
              // Skip broadcast if nothing changed
              return;
            }

            if (payload.avatarUrl !== undefined) {
              player.avatarUrl = payload.avatarUrl;
            }
            if (isProfane(requestedName)) {
              requestedName = censorProfanity(requestedName);
              ws.send(JSON.stringify({
                type: "nickname_warning",
                payload: { message: "Выбранный никнейм содержит недопустимые слова! Имя автоматически замаскировано." }
              }));
            }
            
            // Check if player is trying to claim the administrator account "NODE"
            if (requestedName.toUpperCase() === "NODE") {
              if (player.isAdmin) {
                player.name = "NODE";
                player.color = payload.color || player.color;
                player.particleTrail = payload.particleTrail || player.particleTrail;
                player.nameEffect = payload.nameEffect || player.nameEffect;
                player.decorFrame = payload.decorFrame || player.decorFrame;
                player.avatarStyle = typeof payload.avatarStyle === "number" ? payload.avatarStyle : player.avatarStyle;
              } else {
                const enteredPassword = payload.password || "";
                const isValidPassword = enteredPassword === "N0DE0969";
                
                if (isValidPassword) {
                  // Elevate status!
                  player.name = "NODE";
                  player.isAdmin = true;
                  player.color = payload.color || player.color || "#3b82f6"; // Default blue if nothing is selected yet
                  player.particleTrail = payload.particleTrail || player.particleTrail;
                  player.nameEffect = payload.nameEffect || player.nameEffect;
                  player.decorFrame = payload.decorFrame || player.decorFrame;
                  player.avatarStyle = typeof payload.avatarStyle === "number" ? payload.avatarStyle : player.avatarStyle;

                  // Send success state back to client
                  ws.send(JSON.stringify({
                    type: "admin_status",
                    payload: { success: true, message: "Авторизация админа успешна! Права предоставлены." }
                  }));
                  
                  console.log(`Player ${playerId} successfully logged in as administrator NODE.`);
                } else {
                  // Reject claim, keep pre-existing values intact
                  ws.send(JSON.stringify({
                    type: "admin_status",
                    payload: { success: false, message: "Неверный пароль администратора. Имя NODE зарезервировано!" }
                  }));
                  return;
                }
              }
            } else {
              // Regular path, if they were admin they get demodded back
              player.name = requestedName || player.name;
              player.color = payload.color || player.color;
              player.particleTrail = payload.particleTrail || player.particleTrail;
              player.nameEffect = payload.nameEffect || player.nameEffect;
              player.decorFrame = payload.decorFrame || player.decorFrame;
              player.avatarStyle = typeof payload.avatarStyle === "number" ? payload.avatarStyle : player.avatarStyle;
              player.isAdmin = false;
            }

            // Broadcast changes quietly without showing /profile spam in chat log
            broadcastToRoom(roomId, {
              type: "player_updated",
              payload: { player }
            });

            // Update real-time server listing details
            broadcastRoomCountsToAll();
          }
        }

        else if (type === "admin_shutdown_all_req") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          const player = room?.players[playerId];

          if (!player || !player.isAdmin) {
            console.warn(`Unauthorized administrative command 'shutdown_all' from player: ${player?.name}`);
            return;
          }

          const { reason } = payload;
          console.log(`[ADMIN COMMAND] 'shutdown_all' run by NODE. Reason: ${reason}`);

          // Broadcast special shutdown instruction to ALL players
          clientSessions.forEach((sess, clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: "admin_shutdown_broadcast",
                payload: { reason: reason || "Профилактические работы" }
              }));
            }
          });

          // Delete all rooms
          Object.keys(rooms).forEach((rId) => {
            destroyRoom(rId);
          });

          broadcastRoomCountsToAll();
        }

        else if (type === "admin_kick_all_req") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          const player = room?.players[playerId];

          if (!player || !player.isAdmin) {
            console.warn(`Unauthorized administrative command 'kick_all' from player: ${player?.name}`);
            return;
          }

          const { reason } = payload;
          console.log(`[ADMIN COMMAND] 'kick_all' run by NODE. Reason: ${reason}`);

          // Broadcast kick message to everyone except admin and close connections
          clientSessions.forEach((sess, clientWs) => {
            if (sess.playerId !== playerId && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: "admin_kick_broadcast",
                payload: { reason: reason || "Сервер очищен администратором" }
              }));
              clientWs.close();
            }
          });

          // Purge regular players from all rooms
          Object.keys(rooms).forEach((rId) => {
            const r = rooms[rId];
            Object.keys(r.players).forEach((pId) => {
              if (pId !== playerId) {
                delete r.players[pId];
              }
            });
            if (Object.keys(r.players).length === 0) {
              destroyRoom(rId);
            }
          });

          broadcastRoomCountsToAll();
        }

        else if (type === "admin_kick_player_req") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          const player = room?.players[playerId];

          if (!player || !player.isAdmin) {
            console.warn(`Unauthorized administrative command 'kick_player' from player: ${player?.name}`);
            return;
          }

          const { targetPlayerId, reason } = payload;
          console.log(`[ADMIN COMMAND] 'kick_player' for ${targetPlayerId} run by NODE. Reason: ${reason}`);

          // Locate socket and disconnect target player with reason
          clientSessions.forEach((sess, clientWs) => {
            if (sess.playerId === targetPlayerId && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: "admin_kick_broadcast",
                payload: { reason: reason || "Исключен администратором" }
              }));
              clientWs.close();
            }
          });

          // Purge from dataset
          Object.keys(rooms).forEach((rId) => {
            const r = rooms[rId];
            if (r.players[targetPlayerId]) {
              delete r.players[targetPlayerId];
              
              broadcastToRoom(rId, {
                type: "player_left",
                payload: { id: targetPlayerId }
              });

              if (Object.keys(r.players).length === 0) {
                destroyRoom(rId);
              }
            }
          });

          broadcastRoomCountsToAll();
        }

        else if (type === "bilingual_global") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          const player = room?.players[playerId];

          if (!player || !player.isAdmin) {
            console.warn(`Unauthorized administrative command 'bilingual_global' from player: ${player?.name}`);
            return;
          }

          const { textRu, textEn } = payload;
          if (!textRu || !textEn) return;

          // Limit inputs to 150 characters and perform script protection
          let cleanTextRu = typeof textRu === "string" ? textRu.substring(0, 150).replace(/<\/?[^>]+(>|$)/g, "") : "";
          let cleanTextEn = typeof textEn === "string" ? textEn.substring(0, 150).replace(/<\/?[^>]+(>|$)/g, "") : "";

          cleanTextRu = censorProfanity(cleanTextRu);
          cleanTextEn = censorProfanity(cleanTextEn);

          const message = {
            id: `chat-${Date.now()}-${Math.random()}`,
            playerId,
            playerName: player.name,
            playerColor: player.color,
            playerIsAdmin: true,
            playerNameEffect: player.nameEffect || "none",
            playerDecorFrame: player.decorFrame || "none",
            playerAvatarUrl: player.avatarUrl,
            textRu: cleanTextRu,
            textEn: cleanTextEn,
            text: cleanTextRu, // Fallback for standard older client visual rendering
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            isGlobal: true,
            isBilingual: true
          };

          // Broadcast to all active players in all rooms
          clientSessions.forEach((sess, clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: "chat_message",
                payload: { message }
              }));
            }
          });
        }

        else if (type === "chat") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          if (!room) return;

          const player = room.players[playerId];
          if (player) {
            // Leaky bucket chat rate limiting
            const nowTime = Date.now();
            const playerAny = player as any;
            if (!playerAny.lastChatTime) playerAny.lastChatTime = 0;
            if (!playerAny.chatScore) playerAny.chatScore = 0;

            const elapsed = nowTime - playerAny.lastChatTime;
            playerAny.chatScore = Math.max(0, playerAny.chatScore - (elapsed / 2000));
            playerAny.lastChatTime = nowTime;

            if (playerAny.chatScore > 5 && !player.isAdmin) {
              ws.send(JSON.stringify({
                type: "chat_warning",
                payload: { message: "Вы отправляете сообщения слишком быстро!" }
              }));
              return;
            }
            playerAny.chatScore += 1;

            // Strict limit to 100 characters and script protection
            let rawText = typeof payload.text === "string" ? payload.text : "";
            rawText = rawText.substring(0, 100).replace(/<\/?[^>]+(>|$)/g, "");

            // Global Message Administrator command
            const trimLowerText = rawText.trim().toLowerCase();
            const isGlobalCommand = player.isAdmin && (
              trimLowerText.startsWith("/global") || 
              trimLowerText.startsWith("/глобал")
            );

            if (isGlobalCommand) {
              let prefixLength = 0;
              if (trimLowerText.startsWith("/global")) {
                prefixLength = "/global".length;
              } else if (trimLowerText.startsWith("/глобал")) {
                prefixLength = "/глобал".length;
              }
              const announcementText = rawText.substring(prefixLength).trim();
              if (announcementText) {
                const cleanAnnouncement = censorProfanity(announcementText);
                const message: ChatMessage = {
                  id: `chat-${Date.now()}-${Math.random()}`,
                  playerId,
                  playerName: player.name,
                  playerColor: player.color,
                  playerIsAdmin: true,
                  playerNameEffect: player.nameEffect || "none",
                  playerDecorFrame: player.decorFrame || "none",
                  text: cleanAnnouncement,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  isGlobal: true
                };

                // Broadcast to all active players in all rooms
                clientSessions.forEach((sess, clientWs) => {
                  if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({
                      type: "chat_message",
                      payload: { message }
                    }));
                  }
                });
                return;
              }
            }

            // Profanity Filter - Censor swear words
            let cleanText = censorProfanity(rawText);

            let safeReplyTo = undefined;
            if (payload.replyTo) {
              let replyText = typeof payload.replyTo.text === "string" ? payload.replyTo.text : "";
              replyText = replyText.substring(0, 100).replace(/<\/?[^>]+(>|$)/g, "");
              safeReplyTo = {
                id: payload.replyTo.id,
                playerName: payload.replyTo.playerName,
                text: replyText,
                playerColor: payload.replyTo.playerColor
              };
            }

            const message: ChatMessage = {
              id: `chat-${Date.now()}-${Math.random()}`,
              playerId,
              playerName: player.name,
              playerColor: player.color,
              playerIsAdmin: !!player.isAdmin,
              playerNameEffect: player.nameEffect || "none",
              playerDecorFrame: player.decorFrame || "none",
              playerAvatarUrl: player.avatarUrl,
              text: cleanText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              ...(safeReplyTo && { replyTo: safeReplyTo })
            };

            broadcastToRoom(roomId, {
              type: "chat_message",
              payload: { message }
            });
          }
        }

        else if (type === "friend_request") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          if (!room) return;
          const player = room.players[playerId];
          if (!player) return;

          const { targetPlayerId } = payload;
          // Find target player in sessions
          let targetWs: WebSocket | null = null;
          clientSessions.forEach((sess, clientWs) => {
            if (sess.playerId === targetPlayerId && clientWs.readyState === WebSocket.OPEN) {
              targetWs = clientWs;
            }
          });

          if (targetWs) {
            (targetWs as WebSocket).send(JSON.stringify({
              type: "friend_request_received",
              payload: {
                senderId: player.id,
                senderName: player.name,
                senderColor: player.color,
                senderAvatarStyle: player.avatarStyle,
                senderDecorFrame: player.decorFrame || "none"
              }
            }));
            console.log(`Friend request sent from ${player.name} to player ID ${targetPlayerId}`);
          }
        }

        else if (type === "friend_decline") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          if (!room) return;
          const player = room.players[playerId];
          if (!player) return;

          const { senderId } = payload;
          let senderWs: WebSocket | null = null;
          clientSessions.forEach((sess, clientWs) => {
            if (sess.playerId === senderId && clientWs.readyState === WebSocket.OPEN) {
              senderWs = clientWs;
            }
          });

          if (senderWs) {
            (senderWs as WebSocket).send(JSON.stringify({
              type: "friend_declined",
              payload: {
                declinedById: player.id,
                declinedByName: player.name
              }
            }));
            console.log(`Friend request from ${senderId} declined by ${player.name}`);
          }
        }

        else if (type === "friend_accept_init") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          if (!room) return;
          const player = room.players[playerId];
          if (!player) return;

          const { senderId } = payload;
          // Find original sender (senderId) of the request to challenge them (Step 3: Игрок 1 получает подтверждение)
          let senderWs: WebSocket | null = null;
          clientSessions.forEach((sess, clientWs) => {
            if (sess.playerId === senderId && clientWs.readyState === WebSocket.OPEN) {
              senderWs = clientWs;
            }
          });

          if (senderWs) {
            (senderWs as WebSocket).send(JSON.stringify({
              type: "friend_challenge",
              payload: {
                targetId: player.id,
                targetName: player.name
              }
            }));
            console.log(`Friend accept initialized by ${player.name} to sender ID ${senderId}`);
          }
        }

        else if (type === "friend_challenge_ack") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          if (!room) return;
          const player = room.players[playerId];
          if (!player) return;

          const { targetId } = payload; // Target ID is Player B
          // Forward response to Player B so they can also save (Step 4: Игрок 1 отправляет Игроку 2 тоже подтверждение)
          let targetWs: WebSocket | null = null;
          clientSessions.forEach((sess, clientWs) => {
            if (sess.playerId === targetId && clientWs.readyState === WebSocket.OPEN) {
              targetWs = clientWs;
            }
          });

          if (targetWs) {
            // Memory sync of friendships
            const targetSess = clientSessions.get(targetWs);
            if (targetSess) {
              const targetRoomObj = rooms[targetSess.roomId];
              const targetPlayerObj = targetRoomObj ? targetRoomObj.players[targetId] : null;
              if (targetPlayerObj) {
                // Add Player B to Player A's friends list
                if (!(player as any).friendsList) (player as any).friendsList = [];
                if (!(player as any).friendsList.includes(targetPlayerObj.name)) {
                  (player as any).friendsList.push(targetPlayerObj.name);
                }
                // Add Player A to Player B's friends list
                if (!(targetPlayerObj as any).friendsList) (targetPlayerObj as any).friendsList = [];
                if (!(targetPlayerObj as any).friendsList.includes(player.name)) {
                  (targetPlayerObj as any).friendsList.push(player.name);
                }
              }
            }

            (targetWs as WebSocket).send(JSON.stringify({
              type: "friend_handshake_complete",
              payload: {
                targetName: player.name
              }
            }));
            console.log(`Friend handshake complete: ${player.name} & ID ${targetId}`);
            
            // Broadcast room count updates because the visibility of rooms changed!
            broadcastRoomCountsToAll();
          }
        }

        else if (type === "friend_remove") {
          const session = clientSessions.get(ws);
          if (!session) return;
          const { roomId, playerId } = session;
          const room = rooms[roomId];
          if (!room) return;
          const player = room.players[playerId];
          if (!player) return;

          const { targetName } = payload;
          if ((player as any).friendsList) {
            (player as any).friendsList = (player as any).friendsList.filter((fName: string) => fName !== targetName);
          }

          // Find any active session of targetName and notify them
          clientSessions.forEach((sess, clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              const sessRoom = rooms[sess.roomId];
              if (sessRoom) {
                const sessPlayer = sessRoom.players[sess.playerId];
                if (sessPlayer && sessPlayer.name === targetName) {
                  if ((sessPlayer as any).friendsList) {
                    (sessPlayer as any).friendsList = (sessPlayer as any).friendsList.filter((fName: string) => fName !== player.name);
                  }
                  clientWs.send(JSON.stringify({
                    type: "friend_removed",
                    payload: {
                      removedByName: player.name
                    }
                  }));
                }
              }
            }
          });
          console.log(`Friend removal initiated by ${player.name} for ${targetName}`);
          
          // Broadcast room count updates because friends status changed!
          broadcastRoomCountsToAll();
        }
      } catch (err) {
        console.error("Failed to parse message", err);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected.");
      socketRates.delete(ws);
      lastSentRoomsData.delete(ws);
      const session = clientSessions.get(ws);
      if (session) {
        const { playerId, roomId } = session;
        if (rooms[roomId] && rooms[roomId].players[playerId]) {
          console.log(`Removing player ${rooms[roomId].players[playerId].name} (${playerId}) from room ${roomId}`);
          if (rooms[roomId].scriptController) {
            rooms[roomId].scriptController.handlePlayerLeft(playerId);
          }
          delete rooms[roomId].players[playerId];

          // Notify others in room
          broadcastToRoom(roomId, {
            type: "player_left",
            payload: { id: playerId }
          });

          // Delete room if it has become empty
          if (rooms[roomId] && Object.keys(rooms[roomId].players).length === 0) {
            destroyRoom(roomId);
          }
        }
        clientSessions.delete(ws);
        
        // Broadcast list updates since counts changed!
        broadcastRoomCountsToAll();
      }
    });
  });

  let aiClient: GoogleGenAI | null = null;
  function getGenAI(): GoogleGenAI | null {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (key) {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      }
    }
    return aiClient;
  }

  // Cross-Origin Resource Sharing (CORS) setup for separated client deployments
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    // Support Preflight OPTIONS requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json());

  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLang } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      const target = targetLang === "en" ? "en" : "ru";

      const ai = getGenAI();
      if (!ai) {
        // Clean local offline mock translation fallback
        const lower = text.toLowerCase().trim();
        const mockTranslationsRu: Record<string, string> = {
          "hello": "Привет",
          "hi": "Привет",
          "how are you": "Как дела?",
          "yes": "Да",
          "no": "Нет",
          "test": "Тест",
          "players": "Игроки",
          "room": "Комната"
        };
        const mockTranslationsEn: Record<string, string> = {
          "привет": "Hello",
          "как дела": "How are you?",
          "да": "Yes",
          "нет": "No",
          "тест": "Test",
          "игроки": "Players",
          "комната": "Room"
        };

        let translatedText = text;
        const detectedLang = target === "ru" ? "en" : "ru";

        if (target === "ru") {
          translatedText = mockTranslationsRu[lower] || text;
        } else {
          translatedText = mockTranslationsEn[lower] || text;
        }

        return res.json({
          translatedText,
          detectedLang
        });
      }

      const prompt = `Translate this chat message into ${target === 'ru' ? 'Russian' : 'English'}. Return valid JSON containing two keys: "translatedText" (the translated string) and "detectedLang" (the 2-letter language code of original input). Keep it extremely concise, match the emotional tone, slang, emojis, and styling elements of the original. Original text to translate: "${text}"`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as any,
            properties: {
              translatedText: { type: "STRING" as any },
              detectedLang: { type: "STRING" as any }
            },
            required: ["translatedText", "detectedLang"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({
        translatedText: parsed.translatedText || text,
        detectedLang: parsed.detectedLang || (target === 'ru' ? 'en' : 'ru')
      });
    } catch (err) {
      console.error("Translation server route failed:", err);
      return res.json({
        translatedText: req.body.text || "",
        detectedLang: req.body.targetLang === "ru" ? "en" : "ru"
      });
    }
  });

  // In-memory catalogs cache to ensure instantaneous updates bypassing CDN propagation delay
  let serverAvatarsCache: any[] = [
    { name_en: "Basic avatar", name_ru: "Базовый аватар", cost: 0, path: "Avatar_1.png", flags: "none" },
    { name_en: "Cute avatar", name_ru: "Милый аватар", cost: 150, path: "Avatar_2.png", flags: "none" },
    { name_en: "NODE avatar", name_ru: "NODE аватар", cost: 0, path: "Avatar_node.png", flags: "admin" }
  ];

  let serverFramesCache: any[] = [
    { name_en: "Fruits frame", name_ru: "Фруктовая рамка", cost: 100, path: "Frame_1.png", flags: "none" }
  ];

  async function updateServerMetadataCache() {
    try {
      console.log("[SERVER] Updating avatars and frames cache from raw GitHub...");
      const avatarsRes = await fetch(`https://raw.githubusercontent.com/calloradj-png/NodeAvatars/main/Avatars.json?t=${Date.now()}`);
      if (avatarsRes.ok) {
        const data = await avatarsRes.json();
        if (Array.isArray(data)) {
          serverAvatarsCache = data;
          console.log(`[SERVER] Avatars cache updated successfully. Total avatars: ${data.length}`);
        }
      }
    } catch (err) {
      console.error("[SERVER] Failed to fetch Avatars.json from raw GitHub:", err);
    }

    try {
      const framesRes = await fetch(`https://raw.githubusercontent.com/calloradj-png/NodeAvatars/main/Frames.json?t=${Date.now()}`);
      if (framesRes.ok) {
        const data = await framesRes.json();
        if (Array.isArray(data)) {
          serverFramesCache = data;
          console.log(`[SERVER] Frames cache updated successfully. Total frames: ${data.length}`);
        }
      }
    } catch (err) {
      console.error("[SERVER] Failed to fetch Frames.json from raw GitHub:", err);
    }
  }

  // Pre-fetch latest metadata caches on startup
  updateServerMetadataCache().catch(err => {
    console.error("[SERVER] Initial metadata fetch failed:", err);
  });

  app.get("/api/avatars", (req, res) => {
    res.json(serverAvatarsCache);
  });

  app.get("/api/frames", (req, res) => {
    res.json(serverFramesCache);
  });

  app.post("/api/purge-cache", async (req, res) => {
    try {
      const { password, files } = req.body;
      if (password !== "N0DE0969") {
        return res.status(401).json({ error: "Access Denied" });
      }

      // Refresh in-memory catalog cache from GitHub RAW straight away
      await updateServerMetadataCache();

      const baseUrl = "https://purge.jsdelivr.net/gh/calloradj-png/NodeAvatars@main";
      const targets = Array.isArray(files) ? files : ["Avatars.json", "Frames.json"];

      const results = [];
      for (const file of targets) {
        const purgeUrl = `${baseUrl}/${file}`;
        try {
          const response = await fetch(purgeUrl, { method: "GET" });
          results.push({ file, success: response.ok, status: response.status });
        } catch (err: any) {
          results.push({ file, success: false, error: err.message });
        }
      }

      console.log(`[ADMIN COMMAND] 'purge_cache' executed and server cache reloaded. CDN Purge Results:`, results);
      return res.json({ success: true, results, serverCacheUpdated: true });
    } catch (err: any) {
      console.error("Purge cache server route failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Serve API or static routes
  app.get("/api/status", (req, res) => {
    res.json({
      status: "online",
      activeRooms: Object.keys(rooms).map(rId => ({
        id: rId,
        name: rooms[rId].name,
        count: Object.keys(rooms[rId].players).length,
        hasPassword: !!(rooms[rId] as any).password,
        mode: (rooms[rId] as any).mode || "all",
        creatorId: (rooms[rId] as any).creatorId,
        creatorName: (rooms[rId] as any).creatorName,
        players: Object.values(rooms[rId].players).map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          avatarStyle: p.avatarStyle,
          decorFrame: p.decorFrame || "none",
          avatarUrl: p.avatarUrl || undefined
        }))
      }))
    });
  });

  // Configure Vite middleware for development or Static Asset Serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
