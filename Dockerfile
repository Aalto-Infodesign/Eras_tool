FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Build the app
COPY . .
RUN npm run build

# --- Production stage ---
FROM --platform=linux/amd64 nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Optional: custom nginx config (routing for SPA)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]