# chat56k

Dial-up rooms. 23 seats. Private chat. A BF List. No email, no feed, no algorithm.

Live: https://chat56k.com

## Local

```
npm install
npm install --prefix client
npm run dev
```

Open http://localhost:5173/

## Production

```
npm run build
npm start
```

Screen names live in `data.json`. Render's free disk forgets that file every deploy and when the box sleeps. To keep people:

1. Render → your web service → **Disks** → add a disk, mount path `/var/data`.
2. Starter plan (Free cannot keep a disk).
3. Env var optional: `DATA_DIR=/var/data`.

The app uses `/var/data` automatically if that folder exists. Until a disk is mounted, this browser will put your bio back after Sign On if the host forgot you.

## Custom domain (chat56k.com)

1. Render → chat56k web service → **Settings → Custom Domains**.
2. Add `chat56k.com` and `www.chat56k.com`.
3. Copy the service hostname (`something.onrender.com`).
4. At the registrar for chat56k.com, add DNS:

   | Type | Host | Value |
   |---|---|---|
   | CNAME | `www` | `something.onrender.com` |
   | CNAME or ALIAS | `@` | `something.onrender.com` |

   If root CNAME is not allowed, use the **A record** Render shows instead.  
   Cloudflare: DNS only (grey cloud), SSL **Full**.

5. Wait for Render to show the domain **Verified** (HTTPS is automatic).
