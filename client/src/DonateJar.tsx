import { DONATE_URL } from "./donate";

type Props = {
  onClose: () => void;
};

export default function DonateJar({ onClose }: Props) {
  return (
    <div className="notice-modal">
      <div className="window" style={{ width: 380 }}>
        <div className="title-bar">
          <div className="title-bar-text">Keep Chat56k Online</div>
        </div>
        <div className="window-body pad">
          <p className="hint">
            Chat56k doesn't have ads, subscriptions, premium accounts, or investors. It does have
            server bills.
          </p>
          <p className="hint">
            If you're having fun here and want to help keep the lights blinking on the modem, you
            can throw a few bucks in the jar.
          </p>
          <div className="signon-actions">
            <button
              type="button"
              onClick={() => {
                window.open(DONATE_URL, "_blank", "noopener,noreferrer");
                onClose();
              }}
            >
              Donate
            </button>
            <button type="button" onClick={onClose}>
              Nah, I'm broke too
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
