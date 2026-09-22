import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

// 孩子配置接口：切换 / 删除 / 添加
// 进入时通过路由 state 携带 from（原页面）；切换后返回原页面，若无原页面则返回课程页
export default function ChildrenConfig() {
  const { children, setChildren, activeChild, switchChild } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(5);
  const [newAvatar, setNewAvatar] = useState('cat');
  const avatars = ['cat', 'dog', 'rabbit', 'panda', 'paw', 'bear', 'smile', 'heart'];

  const goBack = () => {
    const back = from && from !== '/children' ? from : '/courses';
    navigate(back, { replace: true });
  };

  // 点击切换孩子 -> 切换并立即返回原页面
  const handleSelect = (c) => {
    switchChild(c);
    goBack();
  };

  // 添加孩子 -> 设为当前并停留在配置页，便于继续添加/选择；点“完成”再返回
  const handleAdd = async () => {
    if (!newName) return;
    try {
      const res = await api.post('/children', { name: newName, age: newAge, avatar: newAvatar });
      setChildren([...children, res.data]);
      switchChild(res.data);
      setShowAdd(false);
      setNewName('');
    } catch (e) {
      alert('添加失败');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除这个孩子吗？相关数据也会删除。')) return;
    try {
      await api.delete(`/children/${id}`);
      const remain = children.filter(c => c.id !== id);
      setChildren(remain);
      if (activeChild?.id === id) {
        switchChild(remain[0] || null);
      }
    } catch (e) { alert('删除失败'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-kid-orange inline-flex items-center gap-2">
          <Icon name="users" size={26} className="text-kid-pink" />我的孩子
        </h1>
        <button onClick={goBack}
          className="btn-kid bg-kid-blue text-white text-base h-10 min-h-0 px-5">完成</button>
      </div>

      <div className="bg-white rounded-3xl shadow-lg p-5">
        {children.length === 0 ? (
          <p className="text-gray-400 text-center py-6">还没有添加孩子，点击下方"添加孩子"开始吧！</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {children.map(c => (
              <div key={c.id}
                className={`p-4 rounded-2xl border-4 text-center cursor-pointer transition ${
                  activeChild?.id === c.id ? 'border-kid-orange bg-kid-yellow/20' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => handleSelect(c)}>
                <div className="mb-1 inline-flex items-center justify-center w-14 h-14 rounded-full bg-kid-orange/10">
                  <Icon name={c.avatar} size={36} className="text-kid-orange" />
                </div>
                <div className="font-bold text-lg">{c.name}</div>
                <div className="text-sm text-gray-500">{c.age}岁</div>
                {activeChild?.id === c.id ? (
                  <div className="text-xs text-kid-orange font-bold mt-1">当前使用中</div>
                ) : (
                  <div className="text-xs text-kid-blue font-bold mt-1">点击切换</div>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                  className="text-xs text-red-400 mt-1 inline-flex items-center gap-1">
                  <Icon name="trash" size={12} />删除
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setShowAdd(true)}
          className="btn-kid mt-4 w-full bg-kid-green text-white">
          <Icon name="plus" size={20} />添加孩子
        </button>
      </div>

      {/* 添加孩子弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">添加孩子</h3>
            <div className="space-y-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="孩子姓名"
                className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-kid-blue outline-none" />
              <div className="flex items-center gap-2">
                <span className="font-bold">年龄:</span>
                <input type="number" min="3" max="7" value={newAge} onChange={e => setNewAge(+e.target.value)}
                  className="w-20 px-3 py-2 rounded-xl border-2 border-gray-200 outline-none" />
                <span className="text-gray-500">岁</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {avatars.map(a => (
                  <button key={a} onClick={() => setNewAvatar(a)}
                    className={`p-2 rounded-xl inline-flex items-center justify-center w-12 h-12 ${newAvatar === a ? 'bg-kid-yellow' : 'bg-gray-100'}`}>
                    <Icon name={a} size={28} className={newAvatar === a ? 'text-kid-orange' : 'text-gray-500'} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-2xl bg-gray-100 text-kid-ink/70 font-bold active:scale-95 transition">取消</button>
              <button onClick={handleAdd} className="flex-1 py-2.5 rounded-2xl bg-kid-blue text-white font-bold active:scale-95 transition">确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
