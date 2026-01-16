import { Request, Response } from 'express';
import { getWeChatAuthService } from './wechatAuth';
import { getAlipayAuthService } from './alipayAuth';
import { getUserByWechatOpenid, getUserByAlipayUserId, upsertUser } from './db';
import { sdk } from './_core/sdk';
import { getSessionCookieOptions } from './_core/cookies';
import { COOKIE_NAME } from '../shared/const';

/**
 * 微信登录 - 生成授权 URL
 */
export async function wechatAuthStart(req: Request, res: Response) {
  try {
    const service = getWeChatAuthService();
    const { url } = service.getAuthorizationUrl();
    
    // 重定向到微信授权页面
    res.redirect(url);
  } catch (error) {
    console.error('[WeChat Auth] Start error:', error);
    res.status(500).json({ error: 'WeChat OAuth not configured' });
  }
}

/**
 * 微信登录 - 处理回调
 */
export async function wechatAuthCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    const service = getWeChatAuthService();
    
    // 获取用户信息
    const wechatUser = await service.handleCallback(code as string, state as string);

    // 查找或创建用户
    let user = await getUserByWechatOpenid(wechatUser.openid);

    if (!user) {
      // 创建新用户
      await upsertUser({
        openId: `wechat_${wechatUser.openid}`,
        name: wechatUser.nickname,
        wechatOpenid: wechatUser.openid,
        loginType: 'wechat',
        loginMethod: 'wechat',
        lastSignedIn: new Date(),
      });

      user = await getUserByWechatOpenid(wechatUser.openid);
    } else {
      // 更新最后登录时间
      await upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // 生成 session token
    const token = await sdk.createSessionToken(user.openId, {
      name: user.name || '',
      expiresInMs: 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    // 设置 cookie
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, cookieOptions);

    // 重定向到首页
    res.redirect('/');
  } catch (error) {
    console.error('[WeChat Auth] Callback error:', error);
    res.status(500).json({ error: 'WeChat login failed' });
  }
}

/**
 * 支付宝登录 - 生成授权 URL
 */
export async function alipayAuthStart(req: Request, res: Response) {
  try {
    const service = getAlipayAuthService();
    const { url } = service.getAuthorizationUrl();
    
    // 重定向到支付宝授权页面
    res.redirect(url);
  } catch (error) {
    console.error('[Alipay Auth] Start error:', error);
    res.status(500).json({ error: 'Alipay OAuth not configured' });
  }
}

/**
 * 支付宝登录 - 处理回调
 */
export async function alipayAuthCallback(req: Request, res: Response) {
  try {
    const { auth_code, state } = req.query;

    if (!auth_code || !state) {
      return res.status(400).json({ error: 'Missing auth_code or state parameter' });
    }

    const service = getAlipayAuthService();
    
    // 获取用户信息
    const { tokenData, userInfo } = await service.handleCallback(auth_code as string, state as string);

    // 查找或创建用户
    let user = await getUserByAlipayUserId(tokenData.user_id);

    if (!user) {
      // 创建新用户
      await upsertUser({
        openId: `alipay_${tokenData.user_id}`,
        name: userInfo.nick_name,
        alipayUserId: tokenData.user_id,
        loginType: 'alipay',
        loginMethod: 'alipay',
        lastSignedIn: new Date(),
      });

      user = await getUserByAlipayUserId(tokenData.user_id);
    } else {
      // 更新最后登录时间
      await upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // 生成 session token
    const token = await sdk.createSessionToken(user.openId, {
      name: user.name || '',
      expiresInMs: 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    // 设置 cookie
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, cookieOptions);

    // 重定向到首页
    res.redirect('/');
  } catch (error) {
    console.error('[Alipay Auth] Callback error:', error);
    res.status(500).json({ error: 'Alipay login failed' });
  }
}
