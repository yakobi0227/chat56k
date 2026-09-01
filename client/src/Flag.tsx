import { useState } from "react";
import { REPORT_REASONS, type ReportReason } from "./reportReasons";

type Props = {
  screenName: string;
  onSubmit: (reason: ReportReason, note: string, alsoMute: boolean) => void;
  onClose: () => void;
};

export default function Flag({ screenName, onSubmit, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [note, setNote] = useState("");
  const [alsoMute, setAlsoMute] = useState(true);

  return (
    <div className="notice-modal">
      <div className="window" style={{ width: 380 }}>
        <div className="title-bar">
          <div className="title-bar-text">Flag {screenName}</div>
        </div>
        <div className="window-body pad">
          <p className="hint">
            Flag scammers and creeps. Pick a reason. Mute hides them on your screen only — they can still talk to
            everyone else.
          </p>
          <div className="flag-list">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`flag-opt ${reason === r ? "on" : ""}`}
                onClick={() => setReason(r)}
              >
                <span className="flag-box">{reason === r ? "X" : ""}</span>
                {r}
              </button>
            ))}
          </div>
          <textarea
            className="profile-bio"
            rows={3}
            maxLength={200}
            placeholder="Optional details. No essays."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            className={`flag-opt ${alsoMute ? "on" : ""}`}
            onClick={() => setAlsoMute((v) => !v)}
          >
            <span className="flag-box">{alsoMute ? "X" : ""}</span>
            Also mute this screen name
          </button>
          <div className="signon-actions">
            <button type="button" disabled={!reason} onClick={() => onSubmit(reason as ReportReason, note, alsoMute)}>
              Flag
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
