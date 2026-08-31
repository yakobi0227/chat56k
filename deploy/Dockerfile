FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/
RUN npm ci && npm ci --prefix client
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3999
CMD ["node", "server/index.js"]
