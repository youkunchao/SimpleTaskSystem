import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Icon from './components/Icon.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import Courses from './pages/Courses.jsx';
import Characters from './pages/Characters.jsx';
import English from './pages/English.jsx';
import MathGame from './pages/MathGame.jsx';
import Books from './pages/Books.jsx';
import Progress from './pages/Progress.jsx';
import Rewards from './pages/Rewards.jsx';
import Settings from './pages/Settings.jsx';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

function Layout({ children }) {
  const { activeChild, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // 识字页：沉浸式全屏（隐藏全局顶栏/底部导航），靠地图自带返回退出
  // 仅在已选孩子、真正进入学习场景时启用；无孩子时保留全局导航，避免"请先选择孩子"页无法跳转
  const fullscreen = location.pathname === '/characters' && !!activeChild;

  const navItems = [
    { path: '/', label: '首页', icon: 'home' },
    { path: '/courses', label: '课程', icon: 'book' },
    { path: '/progress', label: '进度', icon: 'chart' },
    { path: '/rewards', label: '奖励', icon: 'trophy' },
  ];

  return (
    <div className={`min-h-screen ${fullscreen ? '' : 'pb-24'}`}>
      {!fullscreen && (
        <header className="bg-white/80 backdrop-blur shadow-md sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-kid-orange inline-flex items-center gap-1.5">
              <Icon name="sparkles" size={24} className="text-kid-yellow" />启蒙星
            </h1>
            {activeChild ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-kid-orange/10">
                  <Icon name={activeChild.avatar} size={22} className="text-kid-orange" />
                </span>
                <span className="text-lg font-bold text-gray-700">{activeChild.name}</span>
                <button onClick={() => navigate('/courses')} className="text-sm bg-kid-blue text-white px-3 py-1 rounded-full">切换</button>
              </div>
            ) : (
              <button onClick={() => navigate('/courses')} className="text-sm bg-kid-blue text-white px-3 py-1 rounded-full">管理孩子</button>
            )}
            <button onClick={() => navigate('/settings')} className="text-sm text-gray-500 hover:text-kid-orange inline-flex items-center gap-1" title="朗读设置">
              <Icon name="settings" size={18} />设置
            </button>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 inline-flex items-center gap-1">
              <Icon name="logout" size={16} />退出
            </button>
          </div>
        </header>
      )}

      <main className={fullscreen ? 'w-full' : 'max-w-4xl mx-auto px-4 py-6'}>{children}</main>

      {!fullscreen && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-40">
          <div className="max-w-4xl mx-auto flex justify-around py-2">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center px-4 py-1 rounded-xl transition ${
                  location.pathname === item.path ? 'bg-kid-yellow/30 scale-110' : ''
                }`}
              >
                <Icon name={item.icon} size={22} />
                <span className="text-xs font-bold text-gray-600 mt-0.5">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><Layout><Courses /></Layout></ProtectedRoute>} />
      <Route path="/characters" element={<ProtectedRoute><Layout><Characters /></Layout></ProtectedRoute>} />
      <Route path="/english" element={<ProtectedRoute><Layout><English /></Layout></ProtectedRoute>} />
      <Route path="/math" element={<ProtectedRoute><Layout><MathGame /></Layout></ProtectedRoute>} />
      <Route path="/books" element={<ProtectedRoute><Layout><Books /></Layout></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><Layout><Progress /></Layout></ProtectedRoute>} />
      <Route path="/rewards" element={<ProtectedRoute><Layout><Rewards /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
