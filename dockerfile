FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy lockfile and manifest first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

EXPOSE 3000
CMD ["pnpm", "exec", "tsx", "src/index.ts"]