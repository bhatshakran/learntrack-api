FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx drizzle-kit push:pg
CMD ["npx", "tsx", "src/index.ts"]