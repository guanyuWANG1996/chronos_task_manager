import React, { useState } from 'react';
import { login, register } from '../services/api';

interface AuthFormProps {
  onAuthenticated: (token: string, email: string) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await register(email, password);
        if (!res.ok) {
          setError(res.error || '注册失败');
        } else {
          const loginRes = await login(email, password);
          if (loginRes.ok && loginRes.token) {
            onAuthenticated(loginRes.token, email);
          } else {
            setError(loginRes.error || '登录失败');
          }
        }
      } else {
        const res = await login(email, password);
        if (res.ok && res.token) {
          onAuthenticated(res.token, email);
        } else {
          setError(res.error || '登录失败');
        }
      }
    } catch (err) {
      setError('后端未运行或网络错误，请在 Vercel 部署后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm bg-secondary/30 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">{mode === 'login' ? '登录' : '注册'}</h2>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（≥6位）"
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          {typeof window !== 'undefined' && location.hostname === 'localhost' && (
            <div className="text-xs text-zinc-400">
              本地预览不提供 /api/** 后端，请部署到 Vercel 并配置数据库后再试。
            </div>
          )}
          <button disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl">
            {loading ? '处理中…' : (mode === 'login' ? '登录' : '注册')}
          </button>
        </form>
        <div className="mt-4 text-sm text-zinc-400">
          {mode === 'login' ? (
            <button onClick={() => setMode('register')} className="underline">还没有账号？去注册</button>
          ) : (
            <button onClick={() => setMode('login')} className="underline">已有账号？去登录</button>
          )}
        </div>
      </div>
    </div>
  );
};