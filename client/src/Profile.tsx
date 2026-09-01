import { useEffect, useState } from "react";
import Win98Window from "./Win98Window";

export type ProfileInfo = {
  screenName: string;
  bio: string;
  away: boolean;
  awayMessage: string;
  signedOn: boolean;
};

type Props = {
  you: string;
  profile: ProfileInfo;
  x: number;
  y: number;
  z: number;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onClose: () => void;
  onSave: (bio: string) => void;
  muted?: boolean;
  onMute?: (on: boolean) => void;
  onFlag?: () => void;
};

export default function Profile({ you, profile, x, y, z, onFocus, onMove, onClose, onSave, muted, onMute, onFlag }: Props) {
  const mine = profile.screenName === you;
  const [bio, setBio] = useState(profile.bio);
  useEffect(() => setBio(profile.bio), [profile.bio, profile.screenName]);

  return (
    <Win98Window
      title={`Get Info — ${profile.screenName}`}
      x={x}
      y={y}
      w={360}
      h={mine ? 300 : 260}
      z={z}
      onFocus={onFocus}
      onMove={onMove}
      onClose={onClose}
    >
      <div className="window-body pad">
        <p className="hint" style={{ marginBottom: 6 }}>
          <strong>{profile.screenName}</strong>
          {" · "}
          {profile.signedOn ? (profile.away ? `Away${profile.awayMessage ? `: ${profile.awayMessage}` : ""}` : "Signed on") : "Offline"}
        </p>
        <div className="caption">Short bio (optional). Nothing personal. 200 characters.</div>
        {mine ? (
          <>
            <textarea
              className="profile-bio"
              maxLength={200}
              rows={5}
              value={bio}
              placeholder="Band, favorite room, a joke. Not your last name."
              onChange={(e) => setBio(e.target.value)}
            />
            <div className="dir-actions">
              <span>{bio.length}/200</span>
              <button type="button" onClick={() => onSave(bio)}>
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="sunken profile-read">{profile.bio || "No bio. They never filled it in. Very 1999."}</div>
            <div className="dir-actions">
              <button type="button" onClick={() => onMute?.(!muted)}>
                {muted ? "Unmute" : "Mute"}
              </button>
              <button type="button" onClick={() => onFlag?.()}>
                Flag
              </button>
            </div>
          </>
        )}
      </div>
    </Win98Window>
  );
}
