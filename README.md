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

## Deploy

This is a long-running Node process (live rooms). Hosts that only do static/serverless (Vercel, Netlify) will not keep chat99 up.

Render: connect this repo. `render.yaml` is the blueprint.
