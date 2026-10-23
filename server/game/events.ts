export interface PlayerIdentity {
  id: string;
  pseudo: string;
  displayName?: string;
  avatar?: string;
}

export type GameEvent =
  | { type: 'PLAYER_JOIN'; player: PlayerIdentity }
  | { type: 'PLAYER_LEAVE'; playerId: string }
  | { type: 'PLAYER_DISCONNECT'; playerId: string }
  | { type: 'PLAYER_RECONNECT'; playerId: string }
  | { type: 'LOBBY_READY'; playerId: string; ready: boolean }
  | {
      type: 'GAME_START';
      actorId: string | null;
      isControl?: boolean;
      system?: boolean;
    }
  | { type: 'ANSWER'; playerId: string; questionId: string; choiceIndex: number }
  | { type: 'CONTINUE'; playerId: string; phaseToken: string }
  | { type: 'HOST_PAUSE'; actorId: string | null; isControl?: boolean }
  | { type: 'HOST_RESUME'; actorId: string | null; isControl?: boolean }
  | { type: 'HOST_SKIP'; actorId: string | null; isControl?: boolean }
  | {
      type: 'HOST_MANUAL_ANSWER';
      actorId: string | null;
      isControl?: boolean;
      playerId: string;
      choiceIndex: number;
    }
  | { type: 'HOST_CLOSE'; actorId: string | null; isControl?: boolean }
  | { type: 'TIKTOK_CONNECTION_CHANGED'; connected: boolean };
