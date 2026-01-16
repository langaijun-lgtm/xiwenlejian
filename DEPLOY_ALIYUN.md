# 喜闻乐见 - 阿里云部署指南

本指南将帮助您将应用部署到阿里云，使其在中国大陆可以正常访问。

## 前置要求

### 1. 阿里云资源
- **ECS 云服务器**（推荐配置：2核4G，CentOS 7.9 或 Ubuntu 20.04）
- **RDS MySQL 数据库**（或使用 ECS 自建 MySQL）
- **域名**（需要完成 ICP 备案）
- **SSL 证书**（可使用阿里云免费证书）

### 2. 本地工具
- Git
- Node.js 22+
- pnpm

## 部署步骤

### 步骤一：导出代码到 GitHub

1. 在 Manus 管理面板中，进入 **Settings → GitHub**
2. 选择 GitHub 账号和仓库名称
3. 点击导出，代码将推送到您的 GitHub 仓库

或者手动下载代码：
1. 在 Manus 管理面板中，进入 **Code** 标签
2. 点击 "Download All Files" 下载完整代码
3. 解压后推送到您的 GitHub 仓库

### 步骤二：配置阿里云 RDS 数据库

1. 登录阿里云控制台，创建 RDS MySQL 实例（推荐 8.0 版本）
2. 创建数据库：`xiwenlejian`
3. 创建数据库用户并授权
4. 在白名单中添加 ECS 服务器的内网 IP
5. 记录数据库连接信息：
   ```
   主机：rm-xxxxx.mysql.rds.aliyuncs.com
   端口：3306
   数据库：xiwenlejian
   用户名：your_username
   密码：your_password
   ```

### 步骤三：配置 ECS 服务器

#### 1. 连接到 ECS 服务器
```bash
ssh root@your_server_ip
```

#### 2. 安装 Node.js 22
```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# 安装 pnpm
npm install -g pnpm
```

#### 3. 克隆代码
```bash
cd /var/www
git clone https://github.com/your-username/xiwenlejian.git
cd xiwenlejian
```

#### 4. 安装依赖
```bash
pnpm install
```

#### 5. 配置环境变量

创建 `.env` 文件：
```bash
nano .env
```

添加以下配置（**重要：需要替换实际值**）：
```env
# 数据库配置
DATABASE_URL=mysql://username:password@rm-xxxxx.mysql.rds.aliyuncs.com:3306/xiwenlejian

# JWT 密钥（生成一个随机字符串）
JWT_SECRET=your_random_secret_here_min_32_chars

# 应用配置
NODE_ENV=production
PORT=3000

# OAuth 配置（如果不使用 Manus OAuth，需要配置其他登录方式）
# 注意：Manus OAuth 在国内可能无法使用，建议集成微信登录等
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/app-auth

# 前端配置
VITE_APP_TITLE=喜闻乐见
VITE_APP_LOGO=/logo.png

# 如果使用 Manus 的 AI 和存储服务（可选）
# BUILT_IN_FORGE_API_URL=https://forge.manus.im
# BUILT_IN_FORGE_API_KEY=your_api_key
```

**生成 JWT_SECRET：**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 6. 初始化数据库
```bash
pnpm db:push
```

#### 7. 构建应用
```bash
pnpm build
```

#### 8. 使用 PM2 管理进程
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name xiwenlejian

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs xiwenlejian

# 重启应用
pm2 restart xiwenlejian
```

### 步骤四：配置 Nginx 反向代理

#### 1. 安装 Nginx
```bash
# CentOS
yum install -y nginx

# Ubuntu
apt-get update
apt-get install -y nginx
```

#### 2. 配置 Nginx

创建配置文件：
```bash
nano /etc/nginx/conf.d/xiwenlejian.conf
```

添加以下配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;  # 替换为您的域名

    # SSL 证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 日志
    access_log /var/log/nginx/xiwenlejian_access.log;
    error_log /var/log/nginx/xiwenlejian_error.log;

    # 反向代理到 Node.js 应用
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 3. 测试并启动 Nginx
```bash
# 测试配置
nginx -t

# 启动 Nginx
systemctl start nginx
systemctl enable nginx

# 重新加载配置
systemctl reload nginx
```

### 步骤五：配置防火墙

```bash
# CentOS (firewalld)
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# Ubuntu (ufw)
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 步骤六：配置域名解析

1. 登录阿里云域名控制台
2. 添加 A 记录：
   - 主机记录：`@` 或 `www`
   - 记录类型：`A`
   - 记录值：您的 ECS 公网 IP
   - TTL：`10分钟`

### 步骤七：申请 SSL 证书

#### 方案一：使用阿里云免费证书
1. 进入阿里云 SSL 证书控制台
2. 申请免费证书（DV 单域名）
3. 下载 Nginx 格式证书
4. 上传到服务器 `/etc/nginx/ssl/` 目录

#### 方案二：使用 Let's Encrypt 免费证书
```bash
# 安装 certbot
yum install -y certbot python3-certbot-nginx  # CentOS
apt-get install -y certbot python3-certbot-nginx  # Ubuntu

# 自动配置证书
certbot --nginx -d your-domain.com

# 设置自动续期
certbot renew --dry-run
```

## 重要注意事项

### 1. OAuth 登录问题
由于 Manus OAuth 服务在国内无法访问，您需要：

**选项 A：集成国内第三方登录**
- 微信登录
- 支付宝登录
- QQ 登录

**选项 B：实现自己的用户系统**
- 手机号 + 验证码登录
- 邮箱 + 密码登录

### 2. AI 功能替代
如果无法使用 Manus 的 AI 服务，可以：
- 集成阿里云通义千问 API
- 使用百度文心一言 API
- 使用腾讯混元 API

### 3. 文件存储替代
如果无法使用 Manus 的 S3 存储，可以：
- 使用阿里云 OSS
- 使用腾讯云 COS
- 使用七牛云存储

## 监控和维护

### 查看应用日志
```bash
pm2 logs xiwenlejian
```

### 查看 Nginx 日志
```bash
tail -f /var/log/nginx/xiwenlejian_access.log
tail -f /var/log/nginx/xiwenlejian_error.log
```

### 更新应用
```bash
cd /var/www/xiwenlejian
git pull
pnpm install
pnpm build
pm2 restart xiwenlejian
```

### 数据库备份
```bash
# 创建备份脚本
cat > /root/backup_db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h rm-xxxxx.mysql.rds.aliyuncs.com -u username -p'password' xiwenlejian > /backup/xiwenlejian_$DATE.sql
# 保留最近7天的备份
find /backup -name "xiwenlejian_*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup_db.sh

# 添加定时任务（每天凌晨3点备份）
crontab -e
# 添加：0 3 * * * /root/backup_db.sh
```

## 性能优化建议

1. **启用 Gzip 压缩**（在 Nginx 配置中）
2. **配置 CDN 加速**（阿里云 CDN）
3. **数据库连接池优化**
4. **Redis 缓存**（可选，用于会话和热点数据）

## 故障排查

### 应用无法启动
```bash
# 查看 PM2 日志
pm2 logs xiwenlejian --lines 100

# 检查端口占用
netstat -tunlp | grep 3000

# 检查数据库连接
mysql -h rm-xxxxx.mysql.rds.aliyuncs.com -u username -p
```

### 502 Bad Gateway
- 检查 Node.js 应用是否运行：`pm2 status`
- 检查防火墙规则
- 检查 Nginx 配置

### 数据库连接失败
- 检查 RDS 白名单配置
- 检查数据库用户权限
- 检查 DATABASE_URL 配置

## 安全建议

1. **定期更新系统和软件包**
2. **配置阿里云安全组**（只开放必要端口）
3. **启用阿里云 WAF**（Web 应用防火墙）
4. **定期备份数据库**
5. **使用强密码**
6. **监控异常访问**

## 成本估算

- ECS 服务器（2核4G）：约 ¥100-200/月
- RDS MySQL（基础版）：约 ¥50-100/月
- 域名：约 ¥50-100/年
- SSL 证书：免费（Let's Encrypt 或阿里云免费证书）
- 带宽（按流量计费）：根据实际使用量

**总计：约 ¥150-300/月**

## 需要帮助？

如果在部署过程中遇到问题，可以：
1. 查看应用日志和 Nginx 日志
2. 检查阿里云控制台的监控数据
3. 参考阿里云官方文档
4. 联系阿里云技术支持

---

**祝部署顺利！** 🚀
