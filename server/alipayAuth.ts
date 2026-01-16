import axios from 'axios';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

interface AlipayConfig {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  callbackUrl: string;
}

interface AlipayTokenResponse {
  access_token: string;
  user_id: string;
  alipay_user_id: string;
  expires_in: number;
  refresh_token: string;
  re_expires_in: number;
}

interface AlipayUserInfo {
  user_id: string;
  avatar: string;
  city: string;
  nick_name: string;
  province: string;
  gender: string; // M=男性，F=女性
}

export class AlipayAuthService {
  private config: AlipayConfig;
  private stateStore: Map<string, { timestamp: number }> = new Map();
  private gateway = 'https://openapi.alipay.com/gateway.do';

  constructor(config: AlipayConfig) {
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
   * 生成 RSA2 签名
   */
  private sign(content: string): string {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(content, 'utf8');
    return sign.sign(this.config.privateKey, 'base64');
  }

  /**
   * 验证支付宝返回的签名
   */
  private verify(content: string, signature: string): boolean {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(content, 'utf8');
    return verify.verify(this.config.alipayPublicKey, signature, 'base64');
  }

  /**
   * 生成支付宝登录授权 URL
   */
  getAuthorizationUrl(): { url: string; state: string } {
    const state = nanoid(32);
    this.stateStore.set(state, { timestamp: Date.now() });

    const params = new URLSearchParams({
      app_id: this.config.appId,
      scope: 'auth_user',
      redirect_uri: this.config.callbackUrl,
      state: state,
    });

    const url = `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?${params.toString()}`;
    
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
   * 构建支付宝 API 请求参数
   */
  private buildRequestParams(method: string, bizContent: Record<string, any> = {}): Record<string, string> {
    const params: Record<string, string> = {
      app_id: this.config.appId,
      method: method,
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      version: '1.0',
    };

    if (Object.keys(bizContent).length > 0) {
      params.biz_content = JSON.stringify(bizContent);
    }

    // 生成签名
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    params.sign = this.sign(signString);

    return params;
  }

  /**
   * 用授权码换取 access_token
   */
  async getAccessToken(code: string): Promise<AlipayTokenResponse> {
    const params = this.buildRequestParams('alipay.system.oauth.token', {
      grant_type: 'authorization_code',
      code: code,
    });

    const response = await axios.post(this.gateway, null, {
      params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const result = response.data.alipay_system_oauth_token_response;
    
    if (result.code !== '10000') {
      throw new Error(`Alipay API error: ${result.msg} (${result.sub_msg})`);
    }

    return result;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(accessToken: string): Promise<AlipayUserInfo> {
    const params = this.buildRequestParams('alipay.user.info.share');
    params.auth_token = accessToken;

    const response = await axios.post(this.gateway, null, {
      params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const result = response.data.alipay_user_info_share_response;
    
    if (result.code !== '10000') {
      throw new Error(`Alipay API error: ${result.msg} (${result.sub_msg})`);
    }

    return result;
  }

  /**
   * 完整的登录流程
   */
  async handleCallback(code: string, state: string): Promise<{ tokenData: AlipayTokenResponse; userInfo: AlipayUserInfo }> {
    // 1. 验证 state
    if (!this.verifyState(state)) {
      throw new Error('Invalid state parameter');
    }

    // 2. 获取 access_token
    const tokenData = await this.getAccessToken(code);

    // 3. 获取用户信息
    const userInfo = await this.getUserInfo(tokenData.access_token);

    return { tokenData, userInfo };
  }
}

// 导出单例实例
let alipayAuthService: AlipayAuthService | null = null;

export function getAlipayAuthService(): AlipayAuthService {
  if (!alipayAuthService) {
    const appId = process.env.ALIPAY_APP_ID;
    const privateKey = process.env.ALIPAY_PRIVATE_KEY;
    const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
    const callbackUrl = process.env.ALIPAY_CALLBACK_URL || 'http://localhost:3000/api/auth/alipay/callback';

    if (!appId || !privateKey || !alipayPublicKey) {
      throw new Error('Alipay OAuth not configured. Please set ALIPAY_APP_ID, ALIPAY_PRIVATE_KEY, and ALIPAY_PUBLIC_KEY environment variables.');
    }

    alipayAuthService = new AlipayAuthService({
      appId,
      privateKey,
      alipayPublicKey,
      callbackUrl,
    });
  }

  return alipayAuthService;
}
