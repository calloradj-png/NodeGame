export interface Player {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  score: number;
  isMoving: boolean;
  avatarStyle: number;
  isAdmin?: boolean;
  particleTrail?: string;
  nameEffect?: string;
  decorFrame?: string;
  avatarUrl?: string;
  isDead?: boolean;
  health?: number;
}

export interface Collectible {
  id: string;
  x: number;
  y: number;
  z: number;
  value: number;
  color: string;
}

export interface Room {
  id: string;
  name: string;
  players: Record<string, Player>;
  collectibles: Collectible[];
  buttonIsPressed?: boolean;
  buttonPressedUntil?: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  playerIsAdmin?: boolean;
  text: string;
  timestamp: string;
  playerNameEffect?: string;
  playerDecorFrame?: string;
  playerAvatarUrl?: string;
  translatedText?: string;
  detectedLang?: string;
  showTranslated?: boolean;
  isGlobal?: boolean;
  isBilingual?: boolean;
  textRu?: string;
  textEn?: string;
  replyTo?: {
    id: string;
    playerName: string;
    text: string;
    playerColor?: string;
  };
}
