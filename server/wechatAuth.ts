import axios from 'axios';
import { nanoid } from 'nanoid';

interface WeChatConfig {
  appId: string;
  appSecret: string;
  callbackUrl: string;
}

interface WeChatAccessTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
}

interface WeChatUserInfo {
  openid: string;
  nickname: string;
  sex: number; // 1=男性，2=女性，0=未知
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
}

export class WeChatAuthService {
  private config: WeChatConfig;
  private stateStore: Map<string, { timestamp: number }> = new Map();

  constructor(config: WeChatConfig) {
    this.config = config;
    
    // 清理过期的 state（5分钟）
    setInterval(() => {
      const now = Date.now();
      const entriesToDelete: string[] = [];
      this.stateStore.forEach((data, state) => {
        if (now - data.timestamp > 5 * 60 * 1000) {
          entriesToDelete.push(state);
        }
      });
      entriesToDelete.forEach(state => this.stateStore.delete(state));
    }, 60 * 1000);
  }

  /**
   * 生成微信登录授权 URL
   */
  getAuthorizationUrl(): { url: string; state: string } {
    const state = nanoid(32);
    this.stateStore.set(state, { timestamp: Date.now() });

    const params = new URLSearchParams({
      appid: this.config.appId,
      redirect_uri: encodeURIComponent(this.config.callbackUrl),
      response_type: 'code',
      scope: 'snsapi_login',
      state: state,
    });

    const url = `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
    
    return { url, state };
  }

  /**
   * 验证 state 参数
   */
  verifyState(state: string): boolean {
    const data = this.stateStore.get(state);
    if (!data) return false;
    
    this.stateStore.delete(state);
    return true;
  }

  /**
   * 用授权码换取 access_token
   */
  async getAccessToken(code: string): Promise<WeChatAccessTokenResponse> {
    const params = new URLSearchParams({
      appid: this.config.appId,
      secret: this.config.appSecret,
      code: code,
      grant_type: 'authorization_code',
    });

    const response = await axios.get<WeChatAccessTokenResponse>(
      `https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`
    );

    if ('errcode' in response.data) {
      throw new Error(`WeChat API error: ${(response.data as any).errmsg}`);
    }

    return response.data;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(accessToken: string, openid: string): Promise<WeChatUserInfo> {
    const params = new URLSearchParams({
      access_token: accessToken,
      openid: openid,
    });

    const response = await axios.get<WeChatUserInfo>(
      `https://api.weixin.qq.com/sns/userinfo?${params.toString()}`
    );

    if ('errcode' in response.data) {
      throw new Error(`WeChat API error: ${(response.data as any).errmsg}`);
    }

    return response.data;
  }

  /**
   * 完整的登录流程
   */
  async handleCallback(code: string, state: string): Promise<WeChatUserInfo> {
    // 1. 验证 state
    if (!this.verifyState(state)) {
      throw new Error('Invalid state parameter');
    }

    // 2. 获取 access_token
    const tokenData = await this.getAccessToken(code);

    // 3. 获取用户信息
    const userInfo = await this.getUserInfo(tokenData.access_token, tokenData.openid);

    return userInfo;
  }
}

// 导出单例实例
let wechatAuthService: WeChatAuthService | null = null;

export function getWeChatAuthService(): WeChatAuthService {
  if (!wechatAuthService) {
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    const callbackUrl = process.env.WECHAT_CALLBACK_URL || 'http://localhost:3000/api/auth/wechat/callback';

    if (!appId || !appSecret) {
      throw new Error('WeChat OAuth not configured. Please set WECHAT_APP_ID and WECHAT_APP_SECRET environment variables.');
    }

    wechatAuthService = new WeChatAuthService({
      appId,
      appSecret,
      callbackUrl,
    });
  }

  return wechatAuthService;
}
