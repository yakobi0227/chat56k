import { useState } from "react";
import Mark from "./Mark";
import Win98Window from "./Win98Window";

type Props = {
  connected: boolean;
  error: string;
  x: number;
  y: number;
  z: number;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onSignOn: (screenName: string, password: string) => void;
  onCreate: (screenName: string, password: string, attest18: boolean) => void;
  onClearError: () => void;
};

export default function SignOn({
  connected,
  error,
  x,
  y,
  z,
  onFocus,
  onMove,
  onSignOn,
  onCreate,
  onClearError,
}: Props) {
  const [mode, setMode] = useState<"on" | "new">("new");
  const [screenName, setScreenName] = useState("");
  const [password, setPassword] = useState("");
  const [attest18, setAttest18] = useState(false);

  return (
    <Win98Window
      title="chat99 — Sign On"
      x={x}
      y={y}
      w={430}
      h={mode === "new" ? 460 : 330}
      z={z}
      onFocus={onFocus}
      onMove={onMove}
    >
      <div className="window-body pad">
        <div className="signon-hero">
          <Mark />
          <div>
            <h1>chat99</h1>
            <p>Rooms of 23. A directory. A private chat. That’s the whole trick.</p>
          </div>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={mode === "on" ? "active" : ""}
            onClick={() => {
              setMode("on");
              onClearError();
            }}
          >
            Sign On
          </button>
          <button
            type="button"
            className={mode === "new" ? "active" : ""}
            onClick={() => {
              setMode("new");
              onClearError();
            }}
          >
            New Screen Name
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === "new") {
              if (!attest18) return;
              onCreate(screenName, password, true);
            } else {
              onSignOn(screenName, password);
            }
          }}
        >
          <div className="field">
            <label htmlFor="sn">Screen Name</label>
            <input
              id="sn"
              autoFocus
              autoComplete="username"
              maxLength={16}
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              autoComplete={mode === "new" ? "new-password" : "current-password"}
              maxLength={32}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {mode === "new" && (
            <>
              <p className="hint">
                3–16 characters. Start with a letter. Letters and numbers only. No email.
              </p>
              <button
                type="button"
                className={`age-gate ${attest18 ? "on" : ""}`}
                onClick={() => setAttest18((v) => !v)}
              >
                <span className="age-box" aria-hidden="true">
                  {attest18 ? "X" : ""}
                </span>
                <span className="age-copy">
                  <strong>Click this box</strong> if you are 18 or older.
                  <br />
                  chat99 is not for minors. Required to create a screen name.
                </span>
              </button>
            </>
          )}
          <div className="error-line">{error}</div>
          <div className="signon-actions">
            <button
              type="submit"
              disabled={
                !connected ||
                screenName.trim().length < 3 ||
                password.length < 4 ||
                (mode === "new" && !attest18)
              }
            >
              {mode === "new" ? "Create & Sign On" : "Sign On"}
            </button>
          </div>
        </form>
      </div>
    </Win98Window>
  );
}
