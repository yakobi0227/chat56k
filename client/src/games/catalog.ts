export type GameId = "trivia" | "hockey" | "war" | "pool";

export const GAMES: {
  id: GameId;
  name: string;
  blurb: string;
  w: number;
  h: number;
}[] = [
  { id: "trivia", name: "Trivia Night", blurb: "A/S/L was not an acceptable answer.", w: 420, h: 420 },
  { id: "hockey", name: "Air Hockey", blurb: "Click and drag your mallet. First to 7.", w: 360, h: 520 },
  { id: "war", name: "War", blurb: "The only card game that is also a personality.", w: 420, h: 380 },
  { id: "pool", name: "8-Bit Pool", blurb: "Aim with the mouse. Click to shoot. Corners pay.", w: 520, h: 380 },
];
