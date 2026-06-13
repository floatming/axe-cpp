# 使用 Node.js 官方镜像作为基础
FROM node:20-alpine

# 安装 g++ 编译器
RUN apk add --no-cache g++

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果有）
COPY package*.json ./

# 安装 Node.js 依赖（本项目无外部依赖，这步很快）
RUN npm install --production

# 复制所有文件
COPY . .

# 暴露端口（Render 会通过环境变量 PORT 指定）
EXPOSE 80

# 启动服务器
CMD ["node", "server.js"]
