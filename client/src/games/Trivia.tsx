import { useState } from "react";

const Q = [
  {
    q: "What did a 56k modem mostly sound like?",
    a: ["A fax machine fighting a robot", "Dial tone forever", "Silence, if you were lucky", "Windows startup"],
    c: 0,
  },
  {
    q: "AOL Instant Messenger's running man was officially named…",
    a: ["Buddy", "Running Man", "Triton", "Nobody told us and we didn't ask"],
    c: 3,
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
    q: "Buffy the Vampire Slayer aired on:",
    a: ["The WB", "HBO", "Netflix", "Whatever UPN meant"],
    c: 0,
  },
  {
    q: "Winamp's honest slogan was:",
    a: ["It really whips the llama's ass", "Think different", "Just do it", "You've got mail"],
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
    q: "Napster was mostly for:",
    a: ["MP3s you did not own", "Photos", "Homework", "Antivirus"],
    c: 0,
  },
  {
    q: "The correct response to a 3-hour download failing at 99% was:",
    a: ["Swear, try again at 11pm", "Call customer support", "Switch to fiber", "Tweet about it"],
    c: 0,
  },
];

export default function Trivia() {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const done = i >= Q.length;
  const cur = Q[i];

  function choose(n: number) {
    if (picked !== null || !cur) return;
    setPicked(n);
    if (n === cur.c) setScore((s) => s + 1);
  }

  function next() {
    setPicked(null);
    setI((n) => n + 1);
  }

  if (done) {
    return (
      <div className="game-pad">
        <p className="game-score">
          {score} / {Q.length}
        </p>
        <p className="hint">
          {score >= 8
            ? "You were there. You still have the CDs."
            : score >= 5
              ? "Lurker energy. Respectable."
              : "You needed a 56k and a summer. Try again."}
        </p>
        <button
          type="button"
          onClick={() => {
            setI(0);
            setScore(0);
            setPicked(null);
          }}
        >
          Play again
        </button>
      </div>
    );
  }

  return (
    <div className="game-pad">
      <div className="caption">
        Question {i + 1} of {Q.length} · score {score}
      </div>
      <p className="game-q">{cur.q}</p>
      <div className="game-choices">
        {cur.a.map((t, n) => {
          let cls = "";
          if (picked !== null) {
            if (n === cur.c) cls = "right";
            else if (n === picked) cls = "wrong";
          }
          return (
            <button key={t} type="button" className={cls} disabled={picked !== null} onClick={() => choose(n)}>
              {t}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button type="button" onClick={next}>
          {i === Q.length - 1 ? "See score" : "Next"}
        </button>
      )}
    </div>
  );
}
