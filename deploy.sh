#!/bin/bash

# 喜闻乐见 - 阿里云一键部署脚本
# 使用方法：./deploy.sh

set -e

echo "======================================"
echo "喜闻乐见 - 阿里云自动化部署脚本"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}请使用 root 权限运行此脚本${NC}"
  echo "使用: sudo ./deploy.sh"
  exit 1
fi

# 步骤1：检查系统环境
echo -e "${GREEN}[1/8] 检查系统环境...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✓ Node.js 已安装: $NODE_VERSION"
else
    echo -e "${YELLOW}Node.js 未安装，正在安装...${NC}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 22
    nvm use 22
fi

if command -v pnpm &> /dev/null; then
    echo "✓ pnpm 已安装"
else
    echo -e "${YELLOW}pnpm 未安装，正在安装...${NC}"
    npm install -g pnpm
fi

if command -v pm2 &> /dev/null; then
    echo "✓ PM2 已安装"
else
    echo -e "${YELLOW}PM2 未安装，正在安装...${NC}"
    npm install -g pm2
fi

# 步骤2：配置环境变量
echo -e "\n${GREEN}[2/8] 配置环境变量...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}未找到 .env 文件，请输入配置信息：${NC}"
    echo ""
    
    read -p "数据库主机地址 (例如: rm-xxxxx.mysql.rds.aliyuncs.com): " DB_HOST
    read -p "数据库端口 (默认: 3306): " DB_PORT
    DB_PORT=${DB_PORT:-3306}
    read -p "数据库名称 (默认: xiwenlejian): " DB_NAME
    DB_NAME=${DB_NAME:-xiwenlejian}
    read -p "数据库用户名: " DB_USER
    read -sp "数据库密码: " DB_PASS
    echo ""
    
    # 生成 JWT Secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    cat > .env << EOF
# 数据库配置
DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# JWT 密钥
JWT_SECRET=${JWT_SECRET}

# 应用配置
NODE_ENV=production
PORT=3000

# 应用信息
VITE_APP_TITLE=喜闻乐见
VITE_APP_LOGO=/logo.png

# OAuth 配置（如果使用 Manus OAuth）
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/app-auth

# 如果使用自定义 OAuth 或其他登录方式，请在此添加相应配置
EOF
    
    echo -e "${GREEN}✓ 环境变量配置完成${NC}"
else
    echo "✓ .env 文件已存在"
fi

# 步骤3：安装依赖
echo -e "\n${GREEN}[3/8] 安装项目依赖...${NC}"
pnpm install --prod=false

# 步骤4：初始化数据库
echo -e "\n${GREEN}[4/8] 初始化数据库...${NC}"
pnpm db:push

# 步骤5：构建应用
echo -e "\n${GREEN}[5/8] 构建应用...${NC}"
pnpm build

# 步骤6：配置 PM2
echo -e "\n${GREEN}[6/8] 配置 PM2 进程管理...${NC}"
pm2 delete xiwenlejian 2>/dev/null || true
pm2 start dist/index.js --name xiwenlejian
pm2 save
pm2 startup

# 步骤7：配置 Nginx
echo -e "\n${GREEN}[7/8] 配置 Nginx...${NC}"
if command -v nginx &> /dev/null; then
    echo "✓ Nginx 已安装"
    
    read -p "请输入您的域名 (例如: example.com): " DOMAIN
    read -p "SSL 证书路径 (留空跳过 HTTPS 配置): " SSL_CERT
    
    if [ -z "$SSL_CERT" ]; then
        # HTTP 配置
        cat > /etc/nginx/conf.d/xiwenlejian.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    access_log /var/log/nginx/xiwenlejian_access.log;
    error_log /var/log/nginx/xiwenlejian_error.log;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    else
        read -p "SSL 证书密钥路径: " SSL_KEY
        # HTTPS 配置
        cat > /etc/nginx/conf.d/xiwenlejian.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    access_log /var/log/nginx/xiwenlejian_access.log;
    error_log /var/log/nginx/xiwenlejian_error.log;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    fi
    
    nginx -t && systemctl reload nginx
    echo -e "${GREEN}✓ Nginx 配置完成${NC}"
else
    echo -e "${YELLOW}! Nginx 未安装，请手动安装并配置${NC}"
    echo "  CentOS: yum install -y nginx"
    echo "  Ubuntu: apt-get install -y nginx"
fi

# 步骤8：配置防火墙
echo -e "\n${GREEN}[8/8] 配置防火墙...${NC}"
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo "✓ firewalld 配置完成"
elif command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "✓ ufw 配置完成"
else
    echo -e "${YELLOW}! 未检测到防火墙，请手动配置${NC}"
fi

# 完成
echo ""
echo "======================================"
echo -e "${GREEN}部署完成！${NC}"
echo "======================================"
echo ""
echo "应用状态："
pm2 status
echo ""
echo "访问地址："
if [ ! -z "$DOMAIN" ]; then
    if [ -z "$SSL_CERT" ]; then
        echo "  http://${DOMAIN}"
    else
        echo "  https://${DOMAIN}"
    fi
fi
echo ""
echo "常用命令："
echo "  查看日志: pm2 logs xiwenlejian"
echo "  重启应用: pm2 restart xiwenlejian"
echo "  停止应用: pm2 stop xiwenlejian"
echo "  Nginx 重载: systemctl reload nginx"
echo ""
echo -e "${YELLOW}重要提示：${NC}"
echo "  1. 请确保域名已解析到服务器 IP"
echo "  2. 如需 HTTPS，请配置 SSL 证书"
echo "  3. 建议定期备份数据库"
echo "  4. OAuth 登录在国内可能无法使用，建议集成国内登录方式"
echo ""
