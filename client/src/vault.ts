const SN_KEY = "chat56k.sn";
const ATTEST_KEY = "chat56k.18";
const VAULT_KEY = "chat56k.vault";

export type Vault = {
  screenName: string;
  bio: string;
  bfList: string[];
  mutes: string[];
};

export function lastScreenName() {
  return localStorage.getItem(SN_KEY) || "";
}

export function rememberScreenName(name: string) {
  localStorage.setItem(SN_KEY, name);
}

export function rememberAttest() {
  localStorage.setItem(ATTEST_KEY, "1");
}

export function hasAttest() {
  return localStorage.getItem(ATTEST_KEY) === "1";
}

export function loadVault(): Vault | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Vault;
    if (!v || typeof v.screenName !== "string") return null;
    return {
      screenName: v.screenName,
      bio: String(v.bio || ""),
      bfList: Array.isArray(v.bfList) ? v.bfList.map(String) : [],
      mutes: Array.isArray(v.mutes) ? v.mutes.map(String) : [],
    };
  } catch {
    return null;
  }
}

export function saveVault(next: Partial<Vault> & { screenName: string }) {
  const prev = loadVault();
  const same = prev && prev.screenName.toLowerCase() === next.screenName.toLowerCase();
  const merged: Vault = {
    screenName: next.screenName,
    bio: next.bio ?? (same ? prev.bio : ""),
    bfList: next.bfList ?? (same ? prev.bfList : []),
    mutes: next.mutes ?? (same ? prev.mutes : []),
  };
  localStorage.setItem(VAULT_KEY, JSON.stringify(merged));
  rememberScreenName(next.screenName);
}
