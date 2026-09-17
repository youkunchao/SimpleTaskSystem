import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Courses() {
  const { children, setChildren, activeChild, switchChild } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(5);
  const [newAvatar, setNewAvatar] = useState('cat');
  const avatars = ['cat', 'dog', 'rabbit', 'panda', 'paw', 'bear', 'smile', 'heart'];

  useEffect(() => {
    api.get('/courses').then(res => setModules(res.data.modules)).catch(() => {});
  }, []);

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

  const moduleColors = {
    characters: 'from-kid-orange to-kid-yellow',
    english: 'from-kid-blue to-kid-purple',
    math: 'from-kid-green to-kid-blue',
    books: 'from-kid-pink to-kid-purple',
  };

  return (
    <div className="space-y-6">
      {/* 孩子管理区 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
            <Icon name="users" size={26} className="text-kid-pink" />我的孩子
          </h2>
          <button onClick={() => setShowAdd(true)} className="bg-kid-green text-white px-4 py-2 rounded-full font-bold inline-flex items-center gap-1">
            <Icon name="plus" size={18} />添加
          </button>
        </div>
        {children.length === 0 ? (
          <p className="text-gray-400 text-center py-6">还没有添加孩子，点击"添加"开始吧！</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {children.map(c => (
              <div key={c.id} className={`p-4 rounded-2xl border-4 text-center cursor-pointer transition ${
                activeChild?.id === c.id ? 'border-kid-orange bg-kid-yellow/20' : 'border-transparent bg-gray-50 hover:bg-gray-100'
              }`} onClick={() => switchChild(c)}>
                <div className="mb-1 inline-flex items-center justify-center w-14 h-14 rounded-full bg-kid-orange/10">
                  <Icon name={c.avatar} size={36} className="text-kid-orange" />
                </div>
                <div className="font-bold text-lg">{c.name}</div>
                <div className="text-sm text-gray-500">{c.age}岁</div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                  className="text-xs text-red-400 mt-1 inline-flex items-center gap-1">
                  <Icon name="trash" size={12} />删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加弹窗 */}
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
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-xl bg-gray-200 font-bold">取消</button>
              <button onClick={handleAdd} className="flex-1 py-2 rounded-xl bg-kid-blue text-white font-bold">确定</button>
            </div>
          </div>
        </div>
      )}

      {/* 课程模块 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
          <Icon name="target" size={26} className="text-kid-purple" />学习模块
        </h2>
        {!activeChild ? (
          <p className="text-gray-400 text-center py-6">请先添加并选择一个孩子</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {modules.map(m => (
              <button key={m.id} onClick={() => navigate(`/${m.id}`)}
                className={`bg-gradient-to-br ${moduleColors[m.id]} text-white rounded-3xl p-5 text-left shadow-lg hover:scale-105 transition`}>
                <div className="mb-2"><Icon name={m.icon} size={42} /></div>
                <div className="text-xl font-bold">{m.name}</div>
                <div className="text-sm opacity-90">{m.desc}</div>
                <div className="text-xs mt-2 opacity-80">{m.levels}个级别</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
