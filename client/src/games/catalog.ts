export type GameId = "trivia" | "hockey" | "war" | "pool" | "poker";

export const GAMES: {
  id: GameId;
  name: string;
  blurb: string;
  w: number;
  h: number;
  cap: number;
  pvp: boolean;
}[] = [
  { id: "hockey", name: "Air Hockey", blurb: "1v1. First to 7. You are always the green mallet.", w: 360, h: 520, cap: 2, pvp: true },
  { id: "pool", name: "8-Bit Pool", blurb: "1v1. Pocket 5. Take turns.", w: 520, h: 400, cap: 2, pvp: true },
  { id: "trivia", name: "Trivia Night", blurb: "Up to 5. Same question, lock in, then the reveal.", w: 440, h: 460, cap: 5, pvp: true },
  { id: "poker", name: "5-Card Draw", blurb: "Up to 5. 1500 chips. Blinds 5 / 10. Fake money.", w: 520, h: 480, cap: 5, pvp: true },
  { id: "war", name: "War", blurb: "Vs the house. Flip until someone is broke on cards.", w: 420, h: 380, cap: 1, pvp: false },
];
