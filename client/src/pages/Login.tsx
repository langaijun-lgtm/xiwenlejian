import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Login() {
  const handleWeChatLogin = () => {
    window.location.href = '/api/auth/wechat';
  };

  const handleAlipayLogin = () => {
    window.location.href = '/api/auth/alipay';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FFF8F0' }}>
      <Card className="w-full max-w-md organic-card">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4A574] to-[#B8956A] flex items-center justify-center">
              <span className="text-3xl">🌱</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold" style={{ color: '#8B7355' }}>
            喜闻乐见
          </CardTitle>
          <CardDescription className="text-base">
            智能财务管理，让理财变得简单有趣
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button
              onClick={handleWeChatLogin}
              className="w-full h-12 text-base font-medium"
              style={{
                backgroundColor: '#07C160',
                color: 'white',
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 6.093-1.98-3.093-2.08-6.78-3.206-9.836-3.206z"/>
              </svg>
              微信登录
            </Button>

            <Button
              onClick={handleAlipayLogin}
              className="w-full h-12 text-base font-medium"
              style={{
                backgroundColor: '#1677FF',
                color: 'white',
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.5 2A2.5 2.5 0 0 0 2 4.5v15A2.5 2.5 0 0 0 4.5 22h15a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 19.5 2h-15zm0 1.5h15a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/>
                <path d="M7 10h10v1H7v-1zm0 3h10v1H7v-1z"/>
              </svg>
              支付宝登录
            </Button>
          </div>

          <div className="relative">
            <Separator className="my-6" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-3 text-sm text-muted-foreground">
                或
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 text-base font-medium"
            onClick={() => window.location.href = '/api/oauth/login'}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            其他方式登录
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-6">
            登录即表示您同意我们的
            <a href="/terms" className="text-primary hover:underline mx-1">
              服务条款
            </a>
            和
            <a href="/privacy" className="text-primary hover:underline mx-1">
              隐私政策
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
