import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#FF8C42', '#60A5FA', '#34D399', '#A78BFA', '#FF6B9D'];

export default function Progress() {
  const { activeChild } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (activeChild) {
      api.get(`/progress/${activeChild.id}`).then(res => setData(res.data)).catch(() => {});
    }
  }, [activeChild]);

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;
  if (!data) return <p className="text-center text-gray-400 py-10">加载中...</p>;

  const moduleName = { characters: '汉字', english: '英语', math: '数学', books: '绘本' };

  const pieData = data.byModule.map(m => ({ name: moduleName[m.module] || m.module, value: m.count }));

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">📊 学习进度</h2>

      {/* 总览 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-kid-orange">{data.total.count}</div>
          <div className="text-sm text-gray-500">总学习次数</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-kid-green">{data.total.accuracy}%</div>
          <div className="text-sm text-gray-500">正确率</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-kid-blue">{Math.round(data.total.duration / 60)}</div>
          <div className="text-sm text-gray-500">总时长(分)</div>
        </div>
      </div>

      {/* 各模块统计 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <h3 className="text-lg font-bold mb-3">各模块学习分布</h3>
        {pieData.length === 0 ? (
          <p className="text-center text-gray-400 py-6">暂无学习记录</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {pieData.map((d, i) => (
            <div key={i} className="flex items-center gap-1 text-sm">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></span>
              {d.name}: {d.value}次
            </div>
          ))}
        </div>
      </div>

      {/* 每日学习趋势 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <h3 className="text-lg font-bold mb-3">近14天学习次数</h3>
        {data.byDay.length === 0 ? (
          <p className="text-center text-gray-400 py-6">暂无记录</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...data.byDay].reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#FF8C42" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
