import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Courses() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);

  useEffect(() => {
    api.get('/courses').then(res => setModules(res.data.modules)).catch(() => {});
  }, []);

  const moduleColors = {
    characters: 'from-kid-orange to-kid-yellow',
    english: 'from-kid-blue to-kid-purple',
    math: 'from-kid-green to-kid-blue',
    books: 'from-kid-pink to-kid-purple',
  };

  return (
    <div className="space-y-6">
      {/* 学习模块 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
          <Icon name="target" size={26} className="text-kid-purple" />学习模块
        </h2>
        {!activeChild ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-gray-400">请先选择一个孩子</p>
            <button onClick={() => navigate('/children', { state: { from: '/courses' } })}
              className="bg-kid-blue text-[#3a2a1a] px-5 py-2 rounded-full font-bold inline-flex items-center gap-1">
              <Icon name="users" size={18} />选择 / 管理孩子
            </button>
          </div>
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
