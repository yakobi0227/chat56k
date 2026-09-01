export type RoomSummary = {
  id: string;
  name: string;
  blurb: string;
  house: boolean;
  createdBy: string;
  operator: string | null;
  count: number;
  cap: number;
};

export type Member = {
  name: string;
  op: boolean;
  away: boolean;
};

export type ChatMessage =
  | { id: string; kind: "system"; text: string; ts: number }
  | { id: string; kind: "chat"; from: string; text: string; ts: number };

export type ImMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  ts: number;
};

export type JoinedRoom = {
  id: string;
  name: string;
  blurb: string;
  cap: number;
  house: boolean;
  createdBy: string;
  operator: string | null;
  members: Member[];
  messages: ChatMessage[];
  bans: string[];
  you: string;
};

export type BfEntry = {
  screenName: string;
  status: "online" | "away" | "offline";
  awayMessage: string;
};

export type ClientEvent =
  | {
      type: "signed_on";
      screenName: string;
      token: string;
      rooms: RoomSummary[];
      bfList: BfEntry[];
      mutes: string[];
      away: boolean;
      awayMessage: string;
      roomId: string | null;
      games?: { id: string; kind: string; count: number; cap: number; status: string; names: string[] }[];
    }
  | { type: "rooms"; rooms: RoomSummary[] }
  | { type: "joined"; room: JoinedRoom }
  | {
      type: "room_event";
      message: ChatMessage;
      members: Member[];
      operator: string | null;
      bans: string[];
    }
  | { type: "room_state"; members: Member[]; operator: string | null; bans: string[] }
  | { type: "im"; from: string; to: string; text: string; ts: number; id: string }
  | { type: "bf_list"; bfList: BfEntry[] }
  | { type: "mutes"; mutes: string[] }
  | { type: "away"; away: boolean; awayMessage: string }
  | { type: "kicked"; roomId: string; roomName: string; by: string }
  | { type: "banned"; roomId: string; roomName: string; by: string }
  | { type: "report_ok"; target: string }
  | { type: "error"; code: string; message: string }
  | {
      type: "profile";
      screenName: string;
      bio: string;
      away: boolean;
      awayMessage: string;
      signedOn: boolean;
    }
  | {
      type: "game_tables";
      tables: { id: string; kind: string; count: number; cap: number; status: string; names: string[] }[];
    }
  | { type: "game_state"; tableId: string; kind: string; [k: string]: unknown };
