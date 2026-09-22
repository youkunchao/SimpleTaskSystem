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

  const field = (label, icon, props) => (
    <label className="block">
      <span className="block text-kid-ink/80 font-bold mb-1.5 text-sm">{label}</span>
      <div className="flex items-center gap-2 px-4 rounded-2xl border-2 border-gray-200 bg-white focus-within:border-kid-pink transition">
        <Icon name={icon} size={20} className="text-gray-300 shrink-0" />
        <input {...props} className="w-full py-3 bg-transparent outline-none text-lg text-kid-ink" />
      </div>
    </label>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 overflow-hidden">
      <span className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-kid-purple/30 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-kid-blue/30 blur-3xl" />
      <span className="pointer-events-none absolute top-1/4 left-8 w-40 h-40 rounded-full bg-kid-pink/25 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/85 backdrop-blur-md rounded-[32px] shadow-kid-lg p-8">
          <div className="text-center mb-6">
            <img
              src="/assets/panda.png"
              alt=""
              aria-hidden="true"
              className="mascot-hero floaty mx-auto w-24 h-24 object-contain mb-2"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <h1 className="text-3xl font-extrabold text-kid-pink tracking-tight">家长注册</h1>
            <p className="text-kid-ink/50 mt-1 text-sm">为孩子开启启蒙之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('用户名', 'user', {
              type: 'text', value: username, placeholder: '设置用户名',
              onChange: e => setUsername(e.target.value),
            })}
            {field('密码', 'lock', {
              type: 'password', value: password, placeholder: '至少6位',
              onChange: e => setPassword(e.target.value),
            })}
            {field('确认密码', 'lock', {
              type: 'password', value: confirm, placeholder: '再次输入密码',
              onChange: e => setConfirm(e.target.value),
            })}

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-red-500 text-sm font-bold bg-red-50 rounded-2xl py-2">
                <Icon name="alert" size={16} />{error}
              </div>
            )}

            <button type="submit" className="btn-kid w-full bg-gradient-to-r from-kid-pink to-kid-purple text-white text-xl">
              注 册
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-kid-ink/60">
          已有账号？<Link to="/login" className="text-kid-blue font-bold">去登录</Link>
        </p>
      </div>
    </div>
  );
}
