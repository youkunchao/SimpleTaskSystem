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
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-kid-orange via-kid-pink to-kid-purple p-6 text-white shadow-kid-lg">
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
        <div className="card-kid-lg text-center space-y-3">
          <Icon name="smile" size={52} className="mx-auto text-kid-orange" />
          <p className="text-kid-ink/50">请先选择一个孩子</p>
          <button
            onClick={() => navigate('/children', { state: { from: '/courses' } })}
            className="btn-kid bg-kid-blue text-white text-base"
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
              className="pop-in group w-full text-left card-kid flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-kid-lg active:scale-[0.98] transition"
            >
              <div className={`shrink-0 w-16 h-16 rounded-3xl bg-gradient-to-br ${sub.tile} flex items-center justify-center text-white shadow-kid`}>
                <Icon name={sub.icon} size={32} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-extrabold text-kid-ink">{sub.name}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sub.tagClass}`}>{sub.tag}</span>
                </div>
                <div className="text-sm text-kid-ink/45 mt-0.5 truncate">{sub.desc}</div>
              </div>
              <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-50 text-gray-300 group-hover:bg-kid-orange/10 group-hover:text-kid-orange transition">
                <Icon name="chevronRight" size={20} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
