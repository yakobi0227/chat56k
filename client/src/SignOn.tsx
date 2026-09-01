import { useState } from "react";
import Tagline from "./Tagline";
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
      title="chat56k — Sign On"
      x={x}
      y={y}
      w={460}
      h={mode === "new" ? 500 : 360}
      z={z}
      onFocus={onFocus}
      onMove={onMove}
    >
      <div className="window-body pad">
        <div className="signon-hero">
          <img className="signon-logo" src="/logo.png" alt="Chat56k" width={88} height={88} />
          <div>
            <h1>chat56k</h1>
            <p>
              <Tagline />
            </p>
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
              <div
                className="age-line"
                role="checkbox"
                aria-checked={attest18}
                tabIndex={0}
                onClick={() => setAttest18((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setAttest18((v) => !v);
                  }
                }}
              >
                <svg className="age-box" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="0.5" y="0.5" width="15" height="15" fill="#fff" stroke="#000" />
                  {attest18 && (
                    <path d="M3 8.5 L6.5 12 L13 4" fill="none" stroke="#000" strokeWidth="2" />
                  )}
                </svg>
                <span>I am 18 years of age or older. chat56k is not for minors.</span>
              </div>
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
