import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('两次密码不一致'); return; }
    if (password.length < 6) { setError('密码至少6位'); return; }
    try {
      await register(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '注册失败');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-2"><Icon name="sparkles" size={56} className="mx-auto text-kid-pink" /></div>
          <h1 className="text-3xl font-bold text-kid-pink">家长注册</h1>
          <p className="text-gray-500 mt-1">为孩子开启启蒙之旅</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-1 inline-flex items-center gap-1">
              <Icon name="user" size={18} />用户名
            </label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-kid-pink outline-none text-lg" placeholder="设置用户名" />
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-1 inline-flex items-center gap-1">
              <Icon name="lock" size={18} />密码
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-kid-pink outline-none text-lg" placeholder="至少6位" />
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-1 inline-flex items-center gap-1">
              <Icon name="lock" size={18} />确认密码
            </label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-kid-pink outline-none text-lg" placeholder="再次输入密码" />
          </div>
          {error && <div className="text-red-500 text-center">{error}</div>}
          <button type="submit" className="btn-kid w-full bg-kid-pink text-white hover:bg-kid-pink/90">注 册</button>
        </form>
        <p className="text-center mt-6 text-gray-500">
          已有账号？<Link to="/login" className="text-kid-blue font-bold">去登录</Link>
        </p>
      </div>
    </div>
  );
}
