import { useEffect, useState } from "react";
import DialupPic from "./DialupPic";
import Win98Window from "./Win98Window";

export type ProfileInfo = {
  screenName: string;
  bio: string;
  away: boolean;
  awayMessage: string;
  signedOn: boolean;
  photo: boolean;
  photoAt: number;
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
  onPhoto: (data: string | null) => void;
};

export default function Profile({ you, profile, x, y, z, onFocus, onMove, onClose, onSave, onPhoto }: Props) {
  const mine = profile.screenName === you;
  const [bio, setBio] = useState(profile.bio);
  useEffect(() => setBio(profile.bio), [profile.bio, profile.screenName]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 32;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 32, 32);
      onPhoto(c.toDataURL("image/png"));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  const pic = profile.photo
    ? `/photo/${encodeURIComponent(profile.screenName)}?t=${profile.photoAt}`
    : "";

  return (
    <Win98Window
      title={`Get Info — ${profile.screenName}`}
      x={x}
      y={y}
      w={360}
      h={mine ? 430 : 360}
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
        {pic ? (
          <DialupPic key={pic} src={pic} />
        ) : (
          <div className="caption">No picture. Optional, and it will look like 1999.</div>
        )}
        {mine && (
          <div className="dir-actions">
            <label className="file-btn">
              Upload pic
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {profile.photo && (
              <button type="button" onClick={() => onPhoto(null)}>
                Remove pic
              </button>
            )}
          </div>
        )}
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
          <div className="sunken profile-read">{profile.bio || "No bio. They never filled it in. Very 1999."}</div>
        )}
      </div>
    </Win98Window>
  );
}
