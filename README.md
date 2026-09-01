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

Screen names live in `data.json` on a Render disk.

1. Instance type **Starter** (not Free).
2. Service → **Disks** → Add disk. Mount path: `/var/data`. Size: 1 GB.
3. Environment: `DATA_DIR=/var/data` (optional; the app uses `/var/data` if that folder exists).

Adding the disk triggers a deploy. After that deploy is live, create your screen name once. It should survive the next push.

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
