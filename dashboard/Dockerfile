FROM oven/bun:1.1-slim

WORKDIR /app

# Copy lock and package files
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Build for production
RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]
