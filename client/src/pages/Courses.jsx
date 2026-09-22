import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

// 课程页只展示科目，简单直接。
// 语文无需选年龄直接进入；英语 / 数学进入后在其各自页面内选年龄 / 学段。
const SUBJECTS = [
  {
    id: 'characters', name: '语文', desc: '汉字认知 · 五步学习',
    icon: 'pen', route: '/characters',
    tile: 'from-kid-orange to-kid-yellow',
    tag: '直接开始', tagClass: 'bg-kid-orange/15 text-kid-orange',
  },
  {
    id: 'english', name: '英语', desc: '英语启蒙 · 听说读写',
    icon: 'pencil', route: '/english',
    tile: 'from-kid-blue to-kid-purple',
    tag: '先选年龄', tagClass: 'bg-kid-blue/15 text-kid-blue',
  },
  {
    id: 'math', name: '数学', desc: '数学思维 · 趣味练习',
    icon: 'calculator', route: '/math',
    tile: 'from-kid-green to-kid-blue',
    tag: '先选年龄', tagClass: 'bg-kid-green/15 text-kid-green',
  },
];

export default function Courses() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      {/* 顶部横幅：柔和大圆角 + 装饰光点 */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-kid-orange via-kid-pink to-kid-purple p-6 text-white shadow-lg">
        <span className="absolute -right-8 -top-10 w-32 h-32 rounded-full bg-white/15" />
        <span className="absolute right-10 -bottom-10 w-20 h-20 rounded-full bg-white/10" />
        <span className="absolute -left-6 bottom-2 w-16 h-16 rounded-full bg-white/10" />
        <h2 className="relative text-2xl font-extrabold flex items-center gap-2">
          <Icon name="sparkles" size={26} />课程中心
        </h2>
        <p className="relative opacity-95 mt-1.5 text-sm sm:text-base">
          想去哪个乐园玩？语文直接开始，英语和数学先选一下年龄～
        </p>
      </div>

      {!activeChild ? (
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center space-y-3">
          <Icon name="smile" size={52} className="mx-auto text-kid-orange" />
          <p className="text-gray-400">请先选择一个孩子</p>
          <button
            onClick={() => navigate('/children', { state: { from: '/courses' } })}
            className="bg-kid-blue text-[#3a2a1a] px-5 py-2 rounded-full font-bold inline-flex items-center gap-1 active:scale-95 transition"
          >
            <Icon name="users" size={18} />选择 / 管理孩子
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {SUBJECTS.map((sub, i) => (
            <button
              key={sub.id}
              onClick={() => navigate(sub.route)}
              style={{ animationDelay: `${i * 70}ms` }}
              className="pop-in group w-full text-left bg-white rounded-3xl p-4 flex items-center gap-4 border border-black/[0.04] shadow-[0_6px_20px_rgba(0,0,0,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.10)] active:scale-[0.98]"
            >
              <div className={`shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${sub.tile} flex items-center justify-center text-white shadow-md`}>
                <Icon name={sub.icon} size={32} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-extrabold text-gray-800">{sub.name}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sub.tagClass}`}>{sub.tag}</span>
                </div>
                <div className="text-sm text-gray-400 mt-0.5 truncate">{sub.desc}</div>
              </div>
              <Icon name="chevronRight" size={22} className="shrink-0 text-gray-300 group-hover:text-gray-400 transition" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
