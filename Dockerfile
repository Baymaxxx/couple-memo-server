# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# 只复制依赖文件，利用 Docker 层缓存
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Runtime Stage ----
FROM node:20-alpine

WORKDIR /app

# 安全：以非 root 用户运行
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 从 builder 复制 node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制源码
COPY src ./src
COPY package.json ./

# 切换到非 root 用户
USER appuser

# 暴露端口（Zeabur 会自动识别）
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
