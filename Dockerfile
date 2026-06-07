FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

RUN npx playwright install chromium --with-deps

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

CMD ["npm", "start"]
