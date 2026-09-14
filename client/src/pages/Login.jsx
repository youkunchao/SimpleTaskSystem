import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">⭐</div>
          <h1 className="text-3xl font-bold text-kid-orange">启蒙星</h1>
          <p className="text-gray-500 mt-1">幼儿识字启蒙教育平台</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-1">👤 用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-kid-blue outline-none text-lg"
              placeholder="请输入用户名"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-1">🔒 密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-kid-blue outline-none text-lg"
              placeholder="请输入密码"
            />
          </div>
          {error && <div className="text-red-500 text-center">{error}</div>}
          <button type="submit" className="btn-kid w-full bg-kid-orange text-white hover:bg-kid-orange/90">
            登 录
          </button>
        </form>
        <p className="text-center mt-6 text-gray-500">
          还没有账号？<Link to="/register" className="text-kid-blue font-bold">立即注册</Link>
        </p>
      </div>
    </div>
  );
}
