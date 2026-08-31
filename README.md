# chat99

23-seat rooms. A directory. Private chat. A BF List. No email, no feed, no algorithm.

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

Serves the UI and WebSocket on the same port (`PORT`, default 3999).

## Deploy on Render

Repo: https://github.com/yakobi0227/chat99

Do **not** pick Docker or Static Site. chat99 is a **Node web service**.

1. Open [Render Dashboard](https://dashboard.render.com/) and sign in with GitHub.
2. **New** → **Web Service** (not Blueprint, not Static Site, not Docker).
3. Connect **yakobi0227/chat99**, branch **main**.
4. Set these fields:

   - **Language:** Node
   - **Build command:** `npm run render-build`
   - **Start command:** `node server/index.js`
   - **Instance type:** Free
   - **Health check path:** `/health`

5. Create Web Service and wait for the first deploy (a few minutes).
6. Open the `*.onrender.com` URL.

If an old failed service exists, delete it first, then create a new Web Service with the settings above.
