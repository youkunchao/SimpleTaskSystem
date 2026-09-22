import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* 氛围装饰：柔光色块 */}
      <span className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full bg-kid-yellow/40 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-20 -right-16 w-72 h-72 rounded-full bg-kid-pink/30 blur-3xl" />
      <span className="pointer-events-none absolute top-1/3 right-10 w-40 h-40 rounded-full bg-kid-blue/25 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/85 backdrop-blur-md rounded-[32px] shadow-kid-lg p-8">
          {/* 吉祥物 + 品牌 */}
          <div className="text-center mb-6">
            <img
              src="/assets/panda.png"
              alt=""
              aria-hidden="true"
              className="mascot-hero floaty mx-auto w-28 h-28 object-contain mb-2"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <h1 className="text-3xl font-extrabold text-kid-orange tracking-tight">启蒙星</h1>
            <p className="text-kid-ink/50 mt-1 text-sm">陪孩子快乐识字、开口说、爱思考</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-kid-ink/80 font-bold mb-1.5 text-sm">用户名</span>
              <div className="flex items-center gap-2 px-4 rounded-2xl border-2 border-gray-200 bg-white focus-within:border-kid-blue transition">
                <Icon name="user" size={20} className="text-gray-300 shrink-0" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full py-3 bg-transparent outline-none text-lg text-kid-ink"
                  placeholder="请输入用户名"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-kid-ink/80 font-bold mb-1.5 text-sm">密码</span>
              <div className="flex items-center gap-2 px-4 rounded-2xl border-2 border-gray-200 bg-white focus-within:border-kid-blue transition">
                <Icon name="lock" size={20} className="text-gray-300 shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full py-3 bg-transparent outline-none text-lg text-kid-ink"
                  placeholder="请输入密码"
                />
              </div>
            </label>

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-red-500 text-sm font-bold bg-red-50 rounded-2xl py-2">
                <Icon name="alert" size={16} />{error}
              </div>
            )}

            <button type="submit" className="btn-kid w-full bg-gradient-to-r from-kid-orange to-kid-yellow text-white text-xl">
              登 录
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-5 text-sm">
            <span className="text-kid-ink/40">演示账号 admin / 123456</span>
            <button
              type="button"
              onClick={() => { setUsername('admin'); setPassword('123456'); }}
              className="chip bg-kid-blue/15 text-kid-blue active:scale-95 transition"
            >
              <Icon name="zap" size={13} />一键填入
            </button>
          </div>
        </div>

        <p className="text-center mt-5 text-kid-ink/60">
          还没有账号？<Link to="/register" className="text-kid-blue font-bold">立即注册</Link>
        </p>
      </div>
    </div>
  );
}
