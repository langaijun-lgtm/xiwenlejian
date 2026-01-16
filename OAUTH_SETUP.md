# 第三方登录配置指南

本文档说明如何配置微信和支付宝登录功能。

---

## 🔐 微信登录配置

### 1. 注册微信开放平台账号

1. 访问 [微信开放平台](https://open.weixin.qq.com/)
2. 注册账号并完成开发者认证（需要营业执照，费用 ¥300）
3. 创建网站应用

### 2. 创建网站应用

1. 登录微信开放平台
2. 进入 **管理中心** → **网站应用**
3. 点击 **创建网站应用**
4. 填写应用信息：
   - **应用名称**：喜闻乐见
   - **应用简介**：智能财务管理应用
   - **应用官网**：https://xiwenlejian.manus.space
   - **授权回调域**：xiwenlejian.manus.space
5. 提交审核（通常1-3个工作日）

### 3. 获取配置信息

审核通过后，在应用详情页获取：
- **AppID**：wx1234567890abcdef
- **AppSecret**：1234567890abcdef1234567890abcdef

### 4. 配置环境变量

在服务器的 `.env` 文件中添加：
```env
# 微信登录配置
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_APP_SECRET=1234567890abcdef1234567890abcdef
WECHAT_CALLBACK_URL=https://xiwenlejian.manus.space/api/auth/wechat/callback
```

---

## 💰 支付宝登录配置

### 1. 注册支付宝开放平台账号

1. 访问 [支付宝开放平台](https://open.alipay.com/)
2. 使用支付宝账号登录
3. 完成开发者认证（个人或企业）

### 2. 创建网页/移动应用

1. 登录支付宝开放平台
2. 进入 **控制台** → **网页/移动应用**
3. 点击 **创建应用**
4. 填写应用信息：
   - **应用名称**：喜闻乐见
   - **应用类型**：网页应用
   - **应用网关**：https://xiwenlejian.manus.space/api/auth/alipay/callback
5. 添加功能：**获取会员信息**
6. 提交审核

### 3. 配置应用密钥

#### 生成密钥对
```bash
# 使用支付宝提供的工具生成 RSA2 密钥对
# 下载地址：https://opendocs.alipay.com/common/02kipl

# 或使用 OpenSSL 生成
openssl genrsa -out app_private_key.pem 2048
openssl rsa -in app_private_key.pem -pubout -out app_public_key.pem
```

#### 上传公钥
1. 在应用详情页，点击 **设置应用公钥**
2. 上传 `app_public_key.pem` 的内容
3. 获取 **支付宝公钥**（用于验证支付宝返回的数据）

### 4. 获取配置信息

在应用详情页获取：
- **APPID**：2021001234567890
- **应用私钥**：app_private_key.pem 的内容
- **支付宝公钥**：从平台获取

### 5. 配置环境变量

在服务器的 `.env` 文件中添加：
```env
# 支付宝登录配置
ALIPAY_APP_ID=2021001234567890
ALIPAY_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
ALIPAY_CALLBACK_URL=https://xiwenlejian.manus.space/api/auth/alipay/callback
```

---

## 🔧 技术实现

### OAuth 2.0 流程

```
用户点击登录
    ↓
跳转到第三方授权页面（微信/支付宝）
    ↓
用户扫码/确认授权
    ↓
第三方回调到应用（带 code）
    ↓
应用用 code 换取 access_token
    ↓
应用用 access_token 获取用户信息
    ↓
创建/更新本地用户记录
    ↓
生成 JWT token
    ↓
登录成功
```

### 微信登录 API

#### 1. 获取授权码
```
GET https://open.weixin.qq.com/connect/qrconnect
参数：
  appid: 应用ID
  redirect_uri: 回调地址（需 URL 编码）
  response_type: code
  scope: snsapi_login
  state: 随机字符串（防 CSRF）
```

#### 2. 获取 access_token
```
GET https://api.weixin.qq.com/sns/oauth2/access_token
参数：
  appid: 应用ID
  secret: 应用密钥
  code: 授权码
  grant_type: authorization_code
```

#### 3. 获取用户信息
```
GET https://api.weixin.qq.com/sns/userinfo
参数：
  access_token: 访问令牌
  openid: 用户唯一标识
```

### 支付宝登录 API

#### 1. 获取授权码
```
GET https://openauth.alipay.com/oauth2/publicAppAuthorize.htm
参数：
  app_id: 应用ID
  scope: auth_user
  redirect_uri: 回调地址
  state: 随机字符串
```

#### 2. 换取 access_token
```
POST https://openapi.alipay.com/gateway.do
参数：
  method: alipay.system.oauth.token
  app_id: 应用ID
  grant_type: authorization_code
  code: 授权码
  sign: 签名
```

#### 3. 获取用户信息
```
POST https://openapi.alipay.com/gateway.do
参数：
  method: alipay.user.info.share
  app_id: 应用ID
  auth_token: 访问令牌
  sign: 签名
```

---

## 📝 数据库设计

### 用户表扩展

```sql
ALTER TABLE users ADD COLUMN wechat_openid VARCHAR(64) UNIQUE;
ALTER TABLE users ADD COLUMN alipay_user_id VARCHAR(64) UNIQUE;
ALTER TABLE users ADD COLUMN login_type VARCHAR(20); -- 'wechat', 'alipay', 'manus'
```

---

## 🔒 安全注意事项

### 1. CSRF 防护
- 使用 `state` 参数防止 CSRF 攻击
- `state` 应该是随机生成的字符串，存储在 session 中

### 2. 密钥安全
- **永远不要**把 AppSecret 或私钥提交到 Git
- 使用环境变量存储敏感信息
- 定期轮换密钥

### 3. HTTPS
- 生产环境**必须**使用 HTTPS
- 第三方平台会验证回调地址的 HTTPS 证书

### 4. 用户数据
- 遵守《网络安全法》和《个人信息保护法》
- 明确告知用户收集哪些信息
- 提供注销账号的功能

---

## 🧪 测试

### 微信登录测试

1. **开发环境测试**：
   - 微信提供测试号，无需认证
   - 访问 [微信公众平台测试号](https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login)

2. **生产环境测试**：
   - 需要通过审核的正式应用
   - 使用微信扫码测试

### 支付宝登录测试

1. **沙箱环境**：
   - 支付宝提供沙箱环境
   - 访问 [沙箱应用](https://openhome.alipay.com/develop/sandbox/app)
   - 使用沙箱账号测试

2. **生产环境**：
   - 需要通过审核的正式应用
   - 使用真实支付宝账号测试

---

## 💰 费用说明

| 项目 | 微信 | 支付宝 |
|------|------|--------|
| 账号注册 | 免费 | 免费 |
| 开发者认证 | ¥300/年（企业）| 免费（个人）<br>¥0-1000（企业） |
| API 调用 | 免费 | 免费 |
| 用户量限制 | 无限制 | 无限制 |

---

## 📚 官方文档

- [微信开放平台 - 网站应用开发](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)
- [支付宝开放平台 - 用户信息授权](https://opendocs.alipay.com/open/263/105808)

---

## ❓ 常见问题

### Q: 个人开发者可以申请吗？
**微信**：需要企业资质（营业执照）  
**支付宝**：个人和企业都可以

### Q: 回调地址必须是备案域名吗？
**微信**：是的，必须是已备案的域名  
**支付宝**：是的，必须是已备案的域名

### Q: 可以使用 localhost 测试吗？
**微信**：不可以，但可以使用测试号  
**支付宝**：可以使用沙箱环境

### Q: 审核需要多久？
**微信**：1-3 个工作日  
**支付宝**：1-3 个工作日

---

## 🚀 快速开始

1. 注册微信/支付宝开放平台账号
2. 创建应用并等待审核
3. 获取 AppID 和密钥
4. 配置环境变量
5. 重启应用
6. 测试登录功能

配置完成后，用户就可以使用微信或支付宝登录您的应用了！
