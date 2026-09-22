import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Icon from './components/Icon.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import Courses from './pages/Courses.jsx';
// 汉字模块（含 hanzi-writer 笔顺数据）与进度模块（含 recharts 图表）体积较大，
// 改为路由级懒加载：首屏不必下载，只有真正进入时才加载，优化移动端弱网体验。
const Characters = React.lazy(() => import('./pages/Characters.jsx'));
import English from './pages/English.jsx';
import Math from './pages/Math.jsx';
import Books from './pages/Books.jsx';
const Progress = React.lazy(() => import('./pages/Progress.jsx'));
import Rewards from './pages/Rewards.jsx';
import Review from './pages/Review.jsx';
import Settings from './pages/Settings.jsx';
import ChildrenConfig from './pages/ChildrenConfig.jsx';
import ChineseReading from './pages/ChineseReading.jsx';
import Badges from './pages/Badges.jsx';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

// 懒加载路由的加载态（保持儿童风格，避免出现生硬的白屏）
function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <div className="text-5xl floaty">⭐</div>
      <p className="text-kid-ink/40 text-sm">正在准备…</p>
    </div>
  );
}

function Layout({ children }) {
  const { activeChild, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // 沉浸式全屏（隐藏全局顶栏/底部导航）：汉字地图与英语海洋学习页都是独立整页，靠页面内自带返回退出
  // 仅在已选孩子、真正进入学习场景时启用；无孩子时保留全局导航，避免"请先选择孩子"页无法跳转
  const fullscreen =
    (location.pathname === '/characters' || location.pathname === '/english' || location.pathname === '/math') && !!activeChild;

  const navItems = [
    { path: '/', label: '首页', icon: 'home' },
    { path: '/courses', label: '课程', icon: 'book' },
    { path: '/progress', label: '进度', icon: 'chart' },
    { path: '/rewards', label: '奖励', icon: 'trophy' },
  ];

  return (
    <div className={`min-h-screen ${fullscreen ? '' : 'pb-28'}`}>
      {!fullscreen && (
        <header className="sticky top-0 z-40">
          <div className="bg-white/80 backdrop-blur-md shadow-[0_4px_20px_-8px_rgba(60,50,90,0.25)]">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
              {/* 品牌 */}
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 shrink-0 active:scale-95 transition"
                title="回到首页"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-kid-orange to-kid-yellow shadow-kid">
                  <Icon name="sparkles" size={20} className="text-white" />
                </span>
                <span className="text-2xl font-extrabold text-kid-orange tracking-tight">启蒙星</span>
              </button>

              {/* 右侧动作区 */}
              <div className="flex items-center gap-1.5">
                {location.pathname !== '/children' && (
                  activeChild ? (
                    <button
                      onClick={() => navigate('/children', { state: { from: location.pathname } })}
                      className="inline-flex items-center gap-1.5 bg-kid-orange/10 rounded-full pl-1 pr-3 py-1 active:scale-95 transition"
                      title="切换孩子"
                    >
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
                        <Icon name={activeChild.avatar} size={20} className="text-kid-orange" />
                      </span>
                      <span className="text-base font-bold text-kid-ink max-w-[5.5rem] truncate">{activeChild.name}</span>
                      <Icon name="chevronRight" size={14} className="text-kid-orange/70" />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/children', { state: { from: location.pathname } })}
                      className="btn-kid h-10 min-h-0 px-4 text-base bg-kid-blue text-white"
                    >
                      <Icon name="userPlus" size={18} />管理孩子
                    </button>
                  )
                )}
                <button
                  onClick={() => navigate('/settings')}
                  className="icon-round !w-10 !h-10 bg-white/70 text-kid-ink/70"
                  title="朗读设置"
                >
                  <Icon name="settings" size={20} />
                </button>
                <button
                  onClick={logout}
                  className="icon-round !w-10 !h-10 bg-white/70 text-kid-ink/60"
                  title="退出登录"
                >
                  <Icon name="logout" size={18} />
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={fullscreen ? 'w-full' : 'max-w-4xl mx-auto px-4 py-6'}>{children}</main>

      {!fullscreen && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white/90 backdrop-blur-md shadow-[0_-6px_24px_-10px_rgba(60,50,90,0.3)] rounded-t-[28px]">
            <div className="max-w-4xl mx-auto flex justify-around items-end px-2 py-2">
              {navItems.map(item => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`nav-item ${active ? 'nav-item-active' : ''}`}
                  >
                    <span className={`nav-bubble ${active ? '' : 'bg-gray-100/70'}`}>
                      <Icon name={item.icon} size={22} />
                    </span>
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
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
      <Route path="/children" element={<ProtectedRoute><Layout><ChildrenConfig /></Layout></ProtectedRoute>} />
      <Route path="/characters" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoading />}><Characters /></Suspense></Layout></ProtectedRoute>} />
      <Route path="/english" element={<ProtectedRoute><Layout><English /></Layout></ProtectedRoute>} />
      <Route path="/math" element={<ProtectedRoute><Layout><Math /></Layout></ProtectedRoute>} />
      <Route path="/books" element={<ProtectedRoute><Layout><Books /></Layout></ProtectedRoute>} />
      <Route path="/chinese-reading" element={<ProtectedRoute><Layout><ChineseReading /></Layout></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoading />}><Progress /></Suspense></Layout></ProtectedRoute>} />
      <Route path="/rewards" element={<ProtectedRoute><Layout><Rewards /></Layout></ProtectedRoute>} />
      <Route path="/badges" element={<ProtectedRoute><Layout><Badges /></Layout></ProtectedRoute>} />
      <Route path="/review" element={<ProtectedRoute><Layout><Review /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
