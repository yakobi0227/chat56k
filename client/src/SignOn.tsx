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
}: Props) {
  const [mode, setMode] = useState<"on" | "new">("on");
  const [screenName, setScreenName] = useState("");
  const [password, setPassword] = useState("");
  const [attest18, setAttest18] = useState(false);

  return (
    <Win98Window
      title="chat99 — Sign On"
      x={x}
      y={y}
      w={430}
      h={mode === "new" ? 390 : 330}
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
          <button type="button" className={mode === "on" ? "active" : ""} onClick={() => setMode("on")}>
            Sign On
          </button>
          <button type="button" className={mode === "new" ? "active" : ""} onClick={() => setMode("new")}>
            New Screen Name
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === "new") onCreate(screenName, password, attest18);
            else onSignOn(screenName, password);
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
              <label className="check">
                <input
                  type="checkbox"
                  checked={attest18}
                  onChange={(e) => setAttest18(e.target.checked)}
                />
                I am 18 years of age or older. chat99 is not for minors.
              </label>
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
