# ─── 基础镜像：安装依赖 ─────────────────────────────────────────
FROM node:trixie-slim AS base

# 设置工作目录
WORKDIR /app

# 安装依赖（production + dev）
COPY package.json package-lock.json ./
# 使用 ci 保证锁文件一致性
RUN npm ci

# ─── 构建阶段：Next.js 构建 ───────────────────────────────────────
FROM base AS builder

# 拷贝全部源码
COPY . .

RUN cat package.json

# 执行 Next.js 构建（确保 package.json 中有 "build": "next build"）
RUN npm run build

# ─── 运行阶段：Standalone 输出 ────────────────────────────────────
FROM node:trixie-slim AS runner

WORKDIR /app

# 生产环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 拷贝构建产物
# public 静态资源
COPY --from=builder /app/public ./public
# standalone 输出目录（包含 server.js 和 package.json）
COPY --from=builder /app/.next/standalone ./
# Next.js 静态文件
COPY --from=builder /app/.next/static ./.next/static

# 开放端口
EXPOSE 3000

# 启动
CMD ["node", "server.js"]
