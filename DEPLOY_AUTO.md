# 喜闻乐见 - 自动化部署指南

本文档提供三种自动化部署方案，您可以根据实际情况选择最适合的方式。

---

## 方案一：一键部署脚本（推荐新手）

### 适用场景
- 首次部署到阿里云 ECS
- 需要快速上线
- 不熟悉 Docker 和 CI/CD

### 使用步骤

#### 1. 连接到阿里云 ECS 服务器
```bash
ssh root@your_server_ip
```

#### 2. 克隆代码
```bash
cd /var/www
git clone https://github.com/langaijun-lgtm/xiwenlejian.git
cd xiwenlejian
```

#### 3. 运行一键部署脚本
```bash
sudo ./deploy.sh
```

#### 4. 按提示输入配置信息
脚本会自动询问：
- 数据库连接信息
- 域名配置
- SSL 证书路径（可选）

#### 5. 等待部署完成
脚本会自动完成：
- ✅ 安装 Node.js、pnpm、PM2
- ✅ 配置环境变量
- ✅ 安装依赖
- ✅ 初始化数据库
- ✅ 构建应用
- ✅ 配置 PM2 进程管理
- ✅ 配置 Nginx 反向代理
- ✅ 配置防火墙

### 常用命令
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs xiwenlejian

# 重启应用
pm2 restart xiwenlejian

# 停止应用
pm2 stop xiwenlejian

# 更新代码
cd /var/www/xiwenlejian
git pull
pnpm install
pnpm build
pm2 restart xiwenlejian
```

---

## 方案二：GitHub Actions CI/CD（推荐团队）

### 适用场景
- 团队协作开发
- 需要自动化测试和部署
- 代码推送后自动部署

### 配置步骤

#### 1. 配置 GitHub Secrets

在 GitHub 仓库中，进入 **Settings → Secrets and variables → Actions**，添加以下 Secrets：

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `ALIYUN_HOST` | 阿里云 ECS 公网 IP | `123.456.789.0` |
| `ALIYUN_USERNAME` | SSH 用户名 | `root` |
| `ALIYUN_SSH_KEY` | SSH 私钥 | 完整的私钥内容 |

#### 2. 生成 SSH 密钥对

在本地执行：
```bash
ssh-keygen -t rsa -b 4096 -C "deploy@xiwenlejian"
```

将公钥添加到服务器：
```bash
ssh-copy-id -i ~/.ssh/id_rsa.pub root@your_server_ip
```

将私钥内容复制到 GitHub Secrets 的 `ALIYUN_SSH_KEY`：
```bash
cat ~/.ssh/id_rsa
```

#### 3. 在服务器上准备部署目录

```bash
ssh root@your_server_ip
mkdir -p /var/www/xiwenlejian
cd /var/www
git clone https://github.com/langaijun-lgtm/xiwenlejian.git
cd xiwenlejian

# 首次部署需要手动配置环境变量
nano .env
# 添加数据库连接等配置

# 首次部署
pnpm install
pnpm db:push
pnpm build
pm2 start dist/index.js --name xiwenlejian
pm2 save
```

#### 4. 触发自动部署

配置完成后，每次推送代码到 `main` 分支，GitHub Actions 会自动：
1. 运行测试
2. 构建应用
3. SSH 连接到服务器
4. 拉取最新代码
5. 安装依赖
6. 重新构建
7. 重启 PM2 进程

#### 5. 查看部署状态

在 GitHub 仓库的 **Actions** 标签页可以查看每次部署的状态和日志。

---

## 方案三：Docker 容器化部署（推荐生产环境）

### 适用场景
- 需要环境隔离
- 多服务器部署
- 微服务架构

### 使用步骤

#### 1. 安装 Docker 和 Docker Compose

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动 Docker
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### 2. 克隆代码
```bash
cd /var/www
git clone https://github.com/langaijun-lgtm/xiwenlejian.git
cd xiwenlejian
```

#### 3. 配置环境变量

创建 `.env` 文件：
```bash
cat > .env << EOF
# MySQL 配置
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_USER=xiwenlejian
MYSQL_PASSWORD=your_password

# 应用配置
DATABASE_URL=mysql://xiwenlejian:your_password@db:3306/xiwenlejian
JWT_SECRET=$(openssl rand -hex 32)
EOF
```

#### 4. 启动服务
```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

#### 5. 初始化数据库
```bash
# 进入应用容器
docker-compose exec app sh

# 运行数据库迁移
pnpm db:push

# 退出容器
exit
```

### Docker 常用命令

```bash
# 查看运行中的容器
docker-compose ps

# 查看日志
docker-compose logs -f app

# 重启服务
docker-compose restart app

# 停止所有服务
docker-compose down

# 更新代码并重新部署
git pull
docker-compose build
docker-compose up -d

# 进入容器调试
docker-compose exec app sh
```

### 使用 Docker 的优势

1. **环境一致性** - 开发、测试、生产环境完全一致
2. **快速部署** - 一条命令启动所有服务
3. **易于扩展** - 可以轻松添加 Redis、Elasticsearch 等服务
4. **资源隔离** - 每个服务独立运行，互不影响

---

## 对比三种方案

| 特性 | 一键脚本 | GitHub Actions | Docker |
|------|---------|----------------|--------|
| 部署难度 | ⭐ 简单 | ⭐⭐ 中等 | ⭐⭐⭐ 较难 |
| 自动化程度 | 半自动 | 全自动 | 半自动 |
| 环境隔离 | ❌ 无 | ❌ 无 | ✅ 有 |
| 适合场景 | 个人项目 | 团队协作 | 生产环境 |
| 维护成本 | 低 | 中 | 中 |
| 学习成本 | 低 | 中 | 高 |

---

## 部署后的配置

### 1. 配置域名解析

在阿里云域名控制台添加 A 记录：
- 主机记录：`@` 或 `www`
- 记录类型：`A`
- 记录值：您的 ECS 公网 IP
- TTL：`10分钟`

### 2. 配置 SSL 证书

#### 方案 A：使用 Let's Encrypt 免费证书
```bash
# 安装 certbot
apt-get install -y certbot python3-certbot-nginx

# 自动配置证书
certbot --nginx -d your-domain.com

# 设置自动续期
certbot renew --dry-run
```

#### 方案 B：使用阿里云免费证书
1. 进入阿里云 SSL 证书控制台
2. 申请免费证书（DV 单域名）
3. 下载 Nginx 格式证书
4. 上传到服务器并配置 Nginx

### 3. 配置数据库备份

创建备份脚本：
```bash
cat > /root/backup_db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h your-db-host -u username -p'password' xiwenlejian > /backup/xiwenlejian_$DATE.sql
find /backup -name "xiwenlejian_*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup_db.sh

# 添加定时任务（每天凌晨3点备份）
crontab -e
# 添加：0 3 * * * /root/backup_db.sh
```

---

## 监控和日志

### 应用日志
```bash
# PM2 方式
pm2 logs xiwenlejian

# Docker 方式
docker-compose logs -f app
```

### Nginx 日志
```bash
tail -f /var/log/nginx/xiwenlejian_access.log
tail -f /var/log/nginx/xiwenlejian_error.log
```

### 系统监控
```bash
# 查看系统资源
top
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

---

## 故障排查

### 应用无法启动
```bash
# 检查日志
pm2 logs xiwenlejian --lines 100

# 检查端口占用
netstat -tunlp | grep 3000

# 检查环境变量
cat .env

# 检查数据库连接
mysql -h your-db-host -u username -p
```

### 502 Bad Gateway
1. 检查应用是否运行：`pm2 status` 或 `docker-compose ps`
2. 检查 Nginx 配置：`nginx -t`
3. 检查防火墙规则
4. 查看 Nginx 错误日志

### 数据库连接失败
1. 检查数据库是否运行
2. 检查 RDS 白名单配置
3. 检查数据库用户权限
4. 验证 DATABASE_URL 配置

---

## 性能优化建议

### 1. 启用 Gzip 压缩
在 Nginx 配置中添加：
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### 2. 配置 CDN 加速
使用阿里云 CDN 加速静态资源。

### 3. 数据库优化
- 启用查询缓存
- 添加适当的索引
- 定期清理无用数据

### 4. 使用 Redis 缓存
添加 Redis 服务缓存热点数据和会话。

---

## 安全建议

1. **定期更新系统**
   ```bash
   apt-get update && apt-get upgrade -y
   ```

2. **配置防火墙**
   只开放必要的端口（80、443、22）

3. **使用强密码**
   数据库、SSH 等使用强密码

4. **启用阿里云安全组**
   限制入站流量来源

5. **定期备份**
   数据库和代码定期备份

6. **监控异常访问**
   使用阿里云 WAF 防护

---

## 需要帮助？

如果在部署过程中遇到问题：

1. 查看相关日志文件
2. 检查配置是否正确
3. 参考阿里云官方文档
4. 在 GitHub Issues 中提问

---

**祝部署顺利！** 🚀
