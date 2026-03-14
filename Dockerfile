FROM node:20-alpine

WORKDIR /app

# 升级 npm 避免 npm10 的 bug
RUN npm install -g npm@latest

# 安全：以非 root 用户运行
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 复制依赖文件
COPY package*.json ./

# 安装生产依赖
RUN npm install --omit=dev --no-audit --no-fund

# 复制源码
COPY src ./src

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
