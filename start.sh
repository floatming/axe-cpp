#!/bin/bash
# AXE的C++ 启动脚本
# 使用 sudo 启动服务器在 80 端口

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🏔️ 正在启动 AXE的C++ 编译器..."
sudo /Users/axe/.workbuddy/binaries/node/versions/22.22.2/bin/node server.js
