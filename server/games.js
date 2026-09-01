import { randomUUID } from "node:crypto";

export const CAP = { hockey: 2, pool: 2, trivia: 5, poker: 5 };
export const START_CHIPS = 1500;
export const SB = 5;
export const BB = 10;

const HW = 280;
const HH = 420;
const PR = 10;
const MALLET = 22;
const PW = 460;
const PH = 260;
const BR = 8;
const POCKETS = [
  [12, 12],
  [PW / 2, 8],
  [PW - 12, 12],
  [12, PH - 12],
  [PW / 2, PH - 8],
  [PW - 12, PH - 12],
];

const TRIVIA = [
  {
    q: "What did a 56k modem mostly sound like?",
    a: ["A fax machine fighting a robot", "Dial tone forever", "Silence, if you were lucky", "Windows startup"],
    c: 0,
  },
  {
    q: "The legal limit of people in a classic AOL chat room was:",
    a: ["16", "23", "50", "As many as the TOS ignored"],
    c: 1,
  },
  {
    q: "Which of these was a real way to get online in 1999?",
    a: ["A CD in the mail", "5G", "The cloud", "Asking Siri"],
    c: 0,
  },
  {
    q: "a/s/l meant:",
    a: ["Age / sex / location", "Always / stay / lurking", "A screen name list", "Ask someone later"],
    c: 0,
  },
  {
    q: "If someone picked up the house phone while you were online:",
    a: ["You got knocked offline", "Nothing", "You got a faster connection", "AIM sent a warning"],
    c: 0,
  },
  {
    q: "Winamp's honest slogan was:",
    a: ["It really whips the llama's ass", "Think different", "Just do it", "You've got mail"],
    c: 0,
  },
  {
    q: "Buffy the Vampire Slayer aired on:",
    a: ["The WB", "HBO", "Netflix", "Whatever UPN meant"],
    c: 0,
  },
  {
    q: "Napster was mostly for:",
    a: ["MP3s you did not own", "Photos", "Homework", "Antivirus"],
    c: 0,
  },
  {
    q: "The correct response to a 3-hour download failing at 99% was:",
    a: ["Swear, try again at 11pm", "Call customer support", "Switch to fiber", "Tweet about it"],
    c: 0,
  },
  {
    q: "AOL Instant Messenger's running man was officially named:",
    a: ["Buddy", "Running Man", "Triton", "Nobody told us and we didn't ask"],
    c: 3,
  },
];

/** @type {Map<string, any>} */
const tables = new Map();
let send = () => {};
let findByName = () => null;
let everyone = () => {};
let isMuted = () => false;
let dropPlayer = () => {};

export function initGames(io) {
  send = io.send;
  findByName = io.findByName;
  everyone = io.everyone;
  isMuted = io.isMuted || (() => false);
  dropPlayer = io.dropPlayer || (() => {});
  setInterval(tickHockey, 40);
  setInterval(tickPool, 40);
}

export function listTables() {
  return [...tables.values()].map(summarize);
}

export function handleGame(ws, session, msg) {
  switch (msg.type) {
    case "list_games":
      send(ws, { type: "game_tables", tables: listTables() });
      return true;
    case "create_game":
      createTable(ws, session, msg.kind);
      return true;
    case "join_game":
      joinTable(ws, session, msg.tableId);
      return true;
    case "leave_game":
      leaveTable(session);
      return true;
    case "invite_game":
      inviteGame(ws, session, msg.screenName);
      return true;
    case "add_cpu":
      addCpu(ws, session);
      return true;
    case "to_cpu":
      humanToCpu(ws, session, msg.screenName);
      return true;
    case "game_input":
      onInput(session, msg);
      return true;
    case "game_action":
      onAction(session, msg);
      return true;
    default:
      return false;
  }
}

export function leaveTable(session) {
  if (!session?.gameId) return;
  const t = tables.get(session.gameId);
  session.gameId = null;
  if (!t) return;
  t.players = t.players.filter((p) => p.name !== session.screenName);
  const humans = t.players.filter((p) => !p.cpu);
  if (humans.length === 0) {
    tables.delete(t.id);
  } else {
    if (t.kind === "poker") resetPokerWaiting(t);
    if (t.kind === "hockey") resetHockey(t);
    if (t.kind === "pool") resetPool(t);
    emit(t);
    think(t);
  }
  broadcastLobby();
}

function createTable(ws, session, kind) {
  if (!CAP[kind]) {
    send(ws, { type: "error", code: "NO_GAME", message: "That table is not on the board." });
    return;
  }
  leaveTable(session);
  const t = {
    id: randomUUID().slice(0, 8),
    kind,
    status: "open",
    players: [seatPlayer(session.screenName, kind, 0)],
  };
  bootKind(t);
  tables.set(t.id, t);
  session.gameId = t.id;
  broadcastLobby();
  emit(t);
}

function joinTable(ws, session, tableId) {
  const t = tables.get(tableId);
  if (!t) {
    send(ws, { type: "error", code: "NO_TABLE", message: "That table closed." });
    return;
  }
  if (t.players.some((p) => p.name === session.screenName)) {
    session.gameId = t.id;
    emit(t);
    return;
  }
  if (t.players.length >= CAP[t.kind]) {
    send(ws, { type: "error", code: "TABLE_FULL", message: "That table is full." });
    return;
  }
  leaveTable(session);
  t.players.push(seatPlayer(session.screenName, t.kind, t.players.length));
  session.gameId = t.id;
  if (t.kind === "hockey" && t.players.length === 2) startHockey(t);
  if (t.kind === "pool" && t.players.length === 2) startPool(t);
  broadcastLobby();
  emit(t);
}

function inviteGame(ws, session, screenName) {
  const t = tables.get(session.gameId);
  if (!t) {
    send(ws, { type: "error", code: "NO_TABLE", message: "Start or join a table first." });
    return;
  }
  if (t.players.length >= CAP[t.kind]) {
    send(ws, { type: "error", code: "TABLE_FULL", message: "That table is full." });
    return;
  }
  const name = String(screenName || "").trim();
  if (!name || name.toLowerCase() === session.screenName.toLowerCase()) return;
  const targetWs = findByName(name);
  if (!targetWs) {
    send(ws, { type: "error", code: "NOT_ONLINE", message: `${name} is not signed on.` });
    return;
  }
  if (isMuted(name, session.screenName)) {
    send(ws, { type: "error", code: "MUTED", message: "They will not see that." });
    return;
  }
  if (t.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    send(ws, { type: "error", code: "ALREADY", message: "They are already at that table." });
    return;
  }
  send(targetWs, {
    type: "game_invite",
    from: session.screenName,
    tableId: t.id,
    kind: t.kind,
    names: t.players.map((p) => p.name),
  });
  send(ws, { type: "invite_ok", target: name, kind: t.kind });
}

function addCpu(ws, session) {
  const t = tables.get(session.gameId);
  if (!t) {
    send(ws, { type: "error", code: "NO_TABLE", message: "Sit at a table first." });
    return;
  }
  if (t.players.length >= CAP[t.kind]) {
    send(ws, { type: "error", code: "TABLE_FULL", message: "That table is full." });
    return;
  }
  const p = seatPlayer(nextCpuName(t), t.kind, t.players.length);
  p.cpu = true;
  t.players.push(p);
  if (t.kind === "hockey" && t.players.length === 2) startHockey(t);
  if (t.kind === "pool" && t.players.length === 2) startPool(t);
  broadcastLobby();
  emit(t);
  think(t);
}

function humanToCpu(ws, session, screenName) {
  const t = tables.get(session.gameId);
  if (!t) return;
  const host = t.players.find((p) => !p.cpu);
  if (!host || host.name !== session.screenName) {
    send(ws, { type: "error", code: "NOT_HOST", message: "The table host sits the CPU." });
    return;
  }
  const p = t.players.find((x) => x.name.toLowerCase() === String(screenName || "").toLowerCase());
  if (!p || p.cpu) return;
  if (p.name === session.screenName) {
    send(ws, { type: "error", code: "CPU_SELF", message: "Add a CPU to an empty chair instead." });
    return;
  }
  const old = p.name;
  const cpuName = nextCpuName(t);
  dropPlayer(old);
  const live = findByName(old);
  if (live) send(live, { type: "game_boot", tableId: t.id, by: session.screenName });
  if (t.scores && t.scores[old] != null) {
    t.scores[cpuName] = t.scores[old];
    delete t.scores[old];
  }
  if (t.turn === old) t.turn = cpuName;
  if (t.toAct === old) t.toAct = cpuName;
  if (t.shooter === old) t.shooter = cpuName;
  p.name = cpuName;
  p.cpu = true;
  broadcastLobby();
  emit(t);
  think(t);
}

function nextCpuName(t) {
  const taken = new Set(t.players.map((p) => p.name.toLowerCase()));
  if (!taken.has("cpu")) return "CPU";
  for (let i = 2; i < 12; i++) {
    const n = `CPU${i}`;
    if (!taken.has(n.toLowerCase())) return n;
  }
  return "CPUX";
}

function seatPlayer(name, kind, seat) {
  const p = { name, seat, cpu: false };
  if (kind === "poker") {
    p.chips = START_CHIPS;
    p.cards = [];
    p.bet = 0;
    p.folded = false;
    p.drawn = false;
  }
  if (kind === "trivia") {
    p.score = 0;
    p.pick = null;
  }
  if (kind === "hockey") {
    p.x = HW / 2;
    p.y = seat === 0 ? HH - 48 : 48;
    p.score = 0;
  }
  return p;
}

function bootKind(t) {
  if (t.kind === "hockey") resetHockey(t);
  if (t.kind === "pool") resetPool(t);
  if (t.kind === "trivia") {
    t.q = 0;
    t.revealed = false;
    t.started = false;
  }
  if (t.kind === "poker") resetPokerWaiting(t);
}

function onInput(session, msg) {
  const t = tables.get(session.gameId);
  if (!t) return;
  const p = t.players.find((x) => x.name === session.screenName);
  if (!p) return;
  if (t.kind === "hockey" && typeof msg.x === "number") {
    const local = { x: clamp(msg.x, MALLET, HW - MALLET), y: clamp(msg.y, MALLET, HH - MALLET) };
    const world = p.seat === 0 ? local : { x: HW - local.x, y: HH - local.y };
    if (p.seat === 0) world.y = Math.max(HH * 0.55, world.y);
    else world.y = Math.min(HH * 0.45, world.y);
    p.x = world.x;
    p.y = world.y;
  }
}

function onAction(session, msg) {
  const t = tables.get(session.gameId);
  if (!t) return;
  const p = t.players.find((x) => x.name === session.screenName);
  if (!p) return;
  if (t.kind === "pool" && msg.act === "shoot") return poolShoot(t, p, msg);
  if (t.kind === "trivia") return triviaAct(t, p, msg);
  if (t.kind === "poker") return pokerAct(t, p, msg);
}

function startHockey(t) {
  t.status = "live";
  resetHockey(t);
  t.puck.vy = 2.5;
}

function resetHockey(t) {
  t.puck = { x: HW / 2, y: HH / 2, vx: 0, vy: 0 };
  t.players.forEach((p, i) => {
    p.x = HW / 2;
    p.y = i === 0 ? HH - 48 : 48;
    p.score = p.score || 0;
  });
}

function malletHit(mx, my, puck) {
  const dx = puck.x - mx;
  const dy = puck.y - my;
  const d = Math.hypot(dx, dy) || 1;
  if (d >= MALLET + PR) return;
  const nx = dx / d;
  const ny = dy / d;
  const speed = Math.max(4, Math.hypot(puck.vx, puck.vy) + 1.4);
  puck.x = mx + nx * (MALLET + PR + 1);
  puck.y = my + ny * (MALLET + PR + 1);
  puck.vx = nx * speed;
  puck.vy = ny * speed;
}

function tickHockey() {
  for (const t of tables.values()) {
    if (t.kind !== "hockey" || t.players.length < 2) continue;
    for (const p of t.players) {
      if (!p.cpu) continue;
      const puck = t.puck;
      const targetY = p.seat === 0 ? Math.max(HH * 0.58, Math.min(HH - MALLET, puck.y + 8)) : Math.min(HH * 0.42, Math.max(MALLET, puck.y - 8));
      p.x += clamp(puck.x - p.x, -5.2, 5.2);
      p.y += clamp(targetY - p.y, -5.2, 5.2);
      p.x = clamp(p.x, MALLET, HW - MALLET);
      p.y = clamp(p.y, MALLET, HH - MALLET);
      if (p.seat === 0) p.y = Math.max(HH * 0.55, p.y);
      else p.y = Math.min(HH * 0.45, p.y);
    }
    if ((t.players[0].score || 0) >= 7 || (t.players[1].score || 0) >= 7) {
      if (t.status !== "over") {
        t.status = "over";
        emit(t);
      }
      continue;
    }
    t.status = "live";
    const puck = t.puck;
    puck.x += puck.vx;
    puck.y += puck.vy;
    puck.vx *= 0.995;
    puck.vy *= 0.995;
    if (puck.x < PR || puck.x > HW - PR) {
      puck.vx *= -1;
      puck.x = clamp(puck.x, PR, HW - PR);
    }
    const goal = puck.x > HW * 0.32 && puck.x < HW * 0.68;
    if (puck.y < PR) {
      if (goal) {
        t.players[0].score += 1;
        t.puck = { x: HW / 2, y: HH / 2, vx: 0, vy: 2.4 };
      } else {
        puck.vy *= -1;
        puck.y = PR;
      }
    }
    if (puck.y > HH - PR) {
      if (goal) {
        t.players[1].score += 1;
        t.puck = { x: HW / 2, y: HH / 2, vx: 0, vy: -2.4 };
      } else {
        puck.vy *= -1;
        puck.y = HH - PR;
      }
    }
    for (const p of t.players) malletHit(p.x, p.y, puck);
    emit(t);
  }
}

function startPool(t) {
  t.status = "live";
  resetPool(t);
  t.turn = t.players[0].name;
}

function resetPool(t) {
  t.balls = rack();
  t.scores = Object.fromEntries(t.players.map((p) => [p.name, t.scores?.[p.name] || 0]));
  t.turn = t.players[0]?.name;
  t.busy = false;
}

function rack() {
  const balls = [{ x: 120, y: PH / 2, vx: 0, vy: 0, color: "#f4f0e0", dead: false, cue: true }];
  const colors = ["#e11", "#14e", "#e81", "#1a1", "#808", "#ea0", "#a52", "#222"];
  let n = 0;
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i <= row; i++) {
      balls.push({
        x: 300 + row * 16,
        y: PH / 2 - row * 8 + i * 16,
        vx: 0,
        vy: 0,
        color: colors[n++ % colors.length],
        dead: false,
      });
    }
  }
  return balls;
}

function poolShoot(t, p, msg) {
  if (t.players.length < 2) return;
  if (t.turn !== p.name || t.busy) return;
  const cue = t.balls.find((b) => b.cue && !b.dead);
  if (!cue) return;
  const dx = Number(msg.tx) - cue.x;
  const dy = Number(msg.ty) - cue.y;
  const d = Math.hypot(dx, dy) || 1;
  const power = Math.min(11, Number(msg.power) || 6);
  cue.vx = (dx / d) * power;
  cue.vy = (dy / d) * power;
  t.busy = true;
  t.shooter = p.name;
}

function tickPool() {
  for (const t of tables.values()) {
    if (t.kind !== "pool" || !t.balls) continue;
    if (t.players.length < 2) continue;
    if (!t.busy) {
      maybeCpuPool(t);
      continue;
    }
    const balls = t.balls;
    for (const b of balls) {
      if (b.dead) continue;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.986;
      b.vy *= 0.986;
      if (Math.hypot(b.vx, b.vy) < 0.05) {
        b.vx = 0;
        b.vy = 0;
      }
      if (b.x < BR || b.x > PW - BR) {
        b.vx *= -1;
        b.x = clamp(b.x, BR, PW - BR);
      }
      if (b.y < BR || b.y > PH - BR) {
        b.vy *= -1;
        b.y = clamp(b.y, BR, PH - BR);
      }
      if (POCKETS.some(([px, py]) => Math.hypot(b.x - px, b.y - py) < 14)) {
        if (b.cue) {
          b.x = 120;
          b.y = PH / 2;
          b.vx = 0;
          b.vy = 0;
        } else {
          b.dead = true;
          b.vx = 0;
          b.vy = 0;
          t.scores[t.shooter] = (t.scores[t.shooter] || 0) + 1;
        }
      }
    }
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        if (a.dead || b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d >= BR * 2) continue;
        const nx = dx / d;
        const ny = dy / d;
        const p = a.vx * nx + a.vy * ny - (b.vx * nx + b.vy * ny);
        a.vx -= p * nx;
        a.vy -= p * ny;
        b.vx += p * nx;
        b.vy += p * ny;
        const o = (BR * 2 - d) / 2;
        a.x -= nx * o;
        a.y -= ny * o;
        b.x += nx * o;
        b.y += ny * o;
      }
    }
    const moving = balls.some((b) => !b.dead && Math.hypot(b.vx, b.vy) > 0.05);
    if (!moving) {
      t.busy = false;
      const other = t.players.find((p) => p.name !== t.shooter);
      t.turn = other?.name || t.turn;
      t.status = Object.values(t.scores).some((n) => n >= 5) ? "over" : "live";
    }
    emit(t);
  }
}

function triviaAct(t, p, msg) {
  if (msg.act === "start" && t.players.length >= 2 && t.players[0].name === p.name) {
    t.started = true;
    t.q = 0;
    t.revealed = false;
    t.players.forEach((x) => {
      x.pick = null;
      x.score = 0;
    });
    t.status = "live";
    emit(t);
    broadcastLobby();
    think(t);
    return;
  }
  if (msg.act === "pick" && t.started && !t.revealed) {
    p.pick = Number(msg.n);
    const all = t.players.every((x) => x.pick !== null);
    if (all) {
      const cur = TRIVIA[t.q];
      for (const x of t.players) if (x.pick === cur.c) x.score += 1;
      t.revealed = true;
    }
    emit(t);
    think(t);
    return;
  }
  if (msg.act === "next" && t.revealed && t.players[0].name === p.name) {
    t.q += 1;
    t.revealed = false;
    t.players.forEach((x) => {
      x.pick = null;
    });
    if (t.q >= TRIVIA.length) t.status = "over";
    emit(t);
    think(t);
  }
}

function resetPokerWaiting(t) {
  t.phase = "waiting";
  t.pot = 0;
  t.currentBet = 0;
  t.toAct = null;
  t.dealer = t.dealer || 0;
  t.community = [];
  t.winner = null;
  t.players.forEach((p) => {
    p.cards = [];
    p.bet = 0;
    p.folded = false;
    p.drawn = false;
    p.inHand = false;
    if (typeof p.chips !== "number") p.chips = START_CHIPS;
  });
  t.status = "open";
}

function pokerAct(t, p, msg) {
  if (msg.act === "deal") return pokerDeal(t, p);
  if (t.phase === "bet1" || t.phase === "bet2") return pokerBet(t, p, msg);
  if (t.phase === "draw" && msg.act === "draw") return pokerDraw(t, p, msg.discard || []);
}

function pokerDeal(t, p) {
  if (t.phase !== "waiting" && t.phase !== "showdown") return;
  const seated = t.players.filter((x) => x.chips >= BB);
  if (seated.length < 2) return;
  t.dealer = (t.dealer + 1) % t.players.length;
  let guard = 0;
  while (t.players[t.dealer].chips < BB && guard++ < 8) t.dealer = (t.dealer + 1) % t.players.length;
  const order = rotate(t.players, t.dealer);
  const live = order.filter((x) => x.chips >= SB);
  if (live.length < 2) return;
  t.players.forEach((x) => {
    x.cards = [];
    x.bet = 0;
    x.folded = x.chips < SB;
    x.drawn = false;
    x.inHand = x.chips >= SB;
  });
  t.pot = 0;
  t.winner = null;
  const sb = nextLive(t, t.dealer);
  const bb = nextLive(t, indexOf(t, sb.name));
  post(t, sb, Math.min(SB, sb.chips));
  post(t, bb, Math.min(BB, bb.chips));
  t.currentBet = Math.max(sb.bet, bb.bet);
  const deck = shuffle();
  for (const x of t.players) {
    if (!x.inHand) continue;
    x.cards = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
  }
  t.deck = deck;
  t.phase = "bet1";
  t.toAct = nextLive(t, indexOf(t, bb.name))?.name;
  t.status = "live";
  emit(t);
  broadcastLobby();
  think(t);
}

function pokerBet(t, p, msg) {
  if (t.toAct !== p.name || p.folded || !p.inHand) return;
  const need = t.currentBet - p.bet;
  if (msg.act === "fold") {
    p.folded = true;
    const still = t.players.filter((x) => x.inHand && !x.folded);
    if (still.length <= 1) {
      pokerShowdown(t);
      return;
    }
  } else if (msg.act === "check") {
    if (need > 0) return;
  } else if (msg.act === "call") {
    post(t, p, Math.min(need || SB, p.chips));
  } else if (msg.act === "raise") {
    const add = Math.max(SB, Number(msg.amount) || SB);
    const total = need + add;
    if (total > p.chips) return;
    post(t, p, total);
    t.currentBet = p.bet;
  } else return;

  const next = nextToAct(t, p.name);
  if (!next) {
    if (t.phase === "bet1") {
      t.phase = "draw";
      t.players.forEach((x) => {
        x.drawn = !x.inHand || x.folded;
      });
      t.toAct = nextLive(t, t.dealer)?.name;
    } else {
      pokerShowdown(t);
      return;
    }
  } else {
    t.toAct = next.name;
  }
  emit(t);
  think(t);
}

function pokerDraw(t, p, discard) {
  if (t.toAct !== p.name || p.folded) return;
  const drop = [...new Set(discard.map(Number))].filter((i) => i >= 0 && i < 5).slice(0, 5);
  drop.sort((a, b) => b - a);
  for (const i of drop) {
    p.cards.splice(i, 1);
    if (t.deck.length) p.cards.push(t.deck.pop());
  }
  p.drawn = true;
  const next = t.players.find((x) => x.inHand && !x.folded && !x.drawn);
  if (!next) {
    t.phase = "bet2";
    t.currentBet = 0;
    t.players.forEach((x) => {
      x.bet = 0;
    });
    t.toAct = nextLive(t, t.dealer)?.name;
  } else t.toAct = next.name;
  emit(t);
  think(t);
}

function pokerShowdown(t) {
  const live = t.players.filter((x) => x.inHand && !x.folded);
  let winner = live[0];
  let best = -1;
  for (const x of live) {
    const s = handScore(x.cards);
    if (s > best) {
      best = s;
      winner = x;
    }
  }
  if (winner) winner.chips += t.pot;
  t.winner = winner?.name;
  t.pot = 0;
  t.phase = "showdown";
  t.toAct = null;
  t.status = "open";
  emit(t);
}

function post(t, p, amt) {
  const n = Math.max(0, Math.min(p.chips, Math.floor(amt)));
  p.chips -= n;
  p.bet += n;
  t.pot += n;
}

function nextLive(t, fromIdx) {
  for (let i = 1; i <= t.players.length; i++) {
    const p = t.players[(fromIdx + i) % t.players.length];
    if (p.inHand && !p.folded && p.chips >= 0) return p;
  }
  return null;
}

function nextToAct(t, fromName) {
  const live = t.players.filter((x) => x.inHand && !x.folded);
  if (live.length <= 1) return null;
  const maxBet = Math.max(...live.map((x) => x.bet));
  const unsettled = live.filter((x) => x.bet < maxBet && x.chips > 0);
  if (unsettled.length) {
    const idx = indexOf(t, fromName);
    for (let i = 1; i <= t.players.length; i++) {
      const p = t.players[(idx + i) % t.players.length];
      if (unsettled.includes(p)) return p;
    }
  }
  const acted = live.every((x) => x.bet === maxBet || x.chips === 0);
  return acted ? null : nextLive(t, indexOf(t, fromName));
}

function indexOf(t, name) {
  return Math.max(0, t.players.findIndex((p) => p.name === name));
}

function rotate(arr, dealer) {
  return arr.slice(dealer).concat(arr.slice(0, dealer));
}

function shuffle() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function handScore(cards) {
  const rs = cards.map((c) => c.r).sort((a, b) => b - a);
  const ss = cards.map((c) => c.s);
  const flush = ss.every((s) => s === ss[0]);
  const uniq = [...new Set(rs)];
  const straight = uniq.length === 5 && uniq[0] - uniq[4] === 4;
  const counts = {};
  for (const r of rs) counts[r] = (counts[r] || 0) + 1;
  const cvals = Object.values(counts).sort((a, b) => b - a);
  let rank = 0;
  if (straight && flush) rank = 8;
  else if (cvals[0] === 4) rank = 7;
  else if (cvals[0] === 3 && cvals[1] === 2) rank = 6;
  else if (flush) rank = 5;
  else if (straight) rank = 4;
  else if (cvals[0] === 3) rank = 3;
  else if (cvals[0] === 2 && cvals[1] === 2) rank = 2;
  else if (cvals[0] === 2) rank = 1;
  return rank * 1e8 + rs[0] * 1e6 + rs[1] * 1e4 + rs[2] * 100 + rs[3];
}

function summarize(t) {
  return {
    id: t.id,
    kind: t.kind,
    count: t.players.length,
    cap: CAP[t.kind],
    status: t.status,
    names: t.players.map((p) => (p.cpu ? `${p.name}` : p.name)),
    open: t.players.length < CAP[t.kind],
  };
}

function publicState(t, viewer) {
  const base = {
    type: "game_state",
    tableId: t.id,
    kind: t.kind,
    status: t.status,
    you: viewer,
    players: t.players.map((p) => ({
      name: p.name,
      cpu: Boolean(p.cpu),
      seat: p.seat,
      score: p.score,
      chips: p.chips,
      bet: p.bet,
      folded: p.folded,
      drawn: p.drawn,
      pick: t.kind === "trivia" && t.revealed ? p.pick : p.name === viewer ? p.pick : p.pick !== null && p.pick !== undefined ? true : null,
      cards:
        t.kind === "poker"
          ? p.name === viewer || t.phase === "showdown"
            ? p.cards
            : p.cards.map(() => ({ r: 0, s: 0 }))
          : undefined,
    })),
  };
  if (t.kind === "hockey") {
    const me = t.players.find((p) => p.name === viewer);
    const flip = me?.seat === 1;
    const mapP = (p) => {
      const x = flip ? HW - p.x : p.x;
      const y = flip ? HH - p.y : p.y;
      return { name: p.name, x, y, score: p.score, you: p.name === viewer };
    };
    const puck = flip
      ? { x: HW - t.puck.x, y: HH - t.puck.y, vx: -t.puck.vx, vy: -t.puck.vy }
      : t.puck;
    return { ...base, puck, mallets: t.players.map(mapP), w: HW, h: HH };
  }
  if (t.kind === "pool") {
    return { ...base, balls: t.balls, scores: t.scores, turn: t.turn, busy: t.busy, w: PW, h: PH };
  }
  if (t.kind === "trivia") {
    const cur = TRIVIA[t.q] || null;
    return {
      ...base,
      q: t.q,
      total: TRIVIA.length,
      question: cur ? { q: cur.q, a: cur.a, c: t.revealed ? cur.c : null } : null,
      revealed: t.revealed,
      started: t.started,
    };
  }
  if (t.kind === "poker") {
    return {
      ...base,
      phase: t.phase,
      pot: t.pot,
      currentBet: t.currentBet,
      toAct: t.toAct,
      dealer: t.players[t.dealer]?.name,
      winner: t.winner,
      sb: SB,
      bb: BB,
    };
  }
  return base;
}

function emit(t) {
  for (const p of t.players) {
    if (p.cpu) continue;
    const ws = findByName(p.name);
    if (ws) send(ws, publicState(t, p.name));
  }
}

function think(t) {
  if (!t) return;
  if (t.kind === "trivia") maybeCpuTrivia(t);
  if (t.kind === "poker") maybeCpuPoker(t);
  if (t.kind === "pool") maybeCpuPool(t);
}

function maybeCpuTrivia(t) {
  if (!t.started || t.revealed || t.status === "over") return;
  const cur = TRIVIA[t.q];
  if (!cur) return;
  for (const p of t.players) {
    if (!p.cpu || p.pick !== null) continue;
    const who = p;
    setTimeout(() => {
      if (!t.started || t.revealed || who.pick !== null) return;
      who.pick = Math.random() < 0.55 ? cur.c : Math.floor(Math.random() * 4);
      triviaAct(t, who, { act: "pick", n: who.pick });
    }, 600 + Math.random() * 900);
  }
}

function maybeCpuPoker(t) {
  const p = t.players.find((x) => x.name === t.toAct);
  if (!p?.cpu || t.cpuThink) return;
  t.cpuThink = true;
  setTimeout(() => {
    t.cpuThink = false;
    if (t.toAct !== p.name) return;
    if (t.phase === "draw") {
      pokerDraw(t, p, []);
      return;
    }
    const need = t.currentBet - p.bet;
    if (need > 0 && need > p.chips * 0.45) pokerBet(t, p, { act: "fold" });
    else if (need > 0) pokerBet(t, p, { act: "call" });
    else pokerBet(t, p, { act: "check" });
  }, 450 + Math.random() * 500);
}

function maybeCpuPool(t) {
  if (t.busy || t.cpuThink || t.players.length < 2) return;
  const p = t.players.find((x) => x.name === t.turn);
  if (!p?.cpu) return;
  t.cpuThink = true;
  setTimeout(() => {
    t.cpuThink = false;
    if (t.turn !== p.name || t.busy) return;
    const cue = t.balls.find((b) => b.cue && !b.dead);
    const live = t.balls.find((b) => !b.dead && !b.cue);
    if (!cue || !live) return;
    poolShoot(t, p, {
      tx: live.x + (Math.random() - 0.5) * 10,
      ty: live.y + (Math.random() - 0.5) * 10,
      power: 6 + Math.random() * 3,
    });
  }, 500);
}

function broadcastLobby() {
  const payload = { type: "game_tables", tables: listTables() };
  everyone((ws) => send(ws, payload));
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
