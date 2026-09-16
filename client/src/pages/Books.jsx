import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { speak } from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Books() {
  const { activeChild } = useAuth();
  const [books, setBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    api.get('/courses/books').then(res => setBooks(res.data)).catch(() => {});
  }, []);

  const openBook = (id) => {
    api.get(`/courses/books/${id}`).then(res => {
      setCurrentBook(res.data);
      setPage(0);
    });
  };

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;

  if (currentBook) {
    const p = currentBook.pages[page];
    return (
      <div className="space-y-4">
        <button onClick={() => setCurrentBook(null)} className="text-kid-blue font-bold inline-flex items-center gap-1">
          <Icon name="chevronRight" size={18} className="rotate-180" />返回书架
        </button>
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-kid-pink/20 to-kid-purple/20 p-8 text-center">
            <div className="text-7xl mb-4 cursor-pointer hover:scale-110 transition" onClick={() => speak(currentBook.title)}>{p.img}</div>
          </div>
          <div className="p-6">
            <p className="text-2xl leading-relaxed text-gray-800 text-center cursor-pointer hover:text-kid-orange"
               onClick={() => speak(p.text)}>
              {p.text}
            </p>
            <p className="text-center text-sm text-gray-400 mt-2">点击文字或图片可朗读</p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="btn-kid bg-gray-300 text-white disabled:opacity-30">
            <Icon name="chevronRight" size={18} className="rotate-180" />上一页
          </button>
          <span className="text-lg font-bold text-gray-600">{page + 1} / {currentBook.pages.length}</span>
          <button onClick={() => setPage(Math.min(currentBook.pages.length - 1, page + 1))} disabled={page === currentBook.pages.length - 1}
            className="btn-kid bg-kid-pink text-white disabled:opacity-30">下一页 <Icon name="chevronRight" size={18} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
        <Icon name="book" size={26} className="text-kid-purple" />绘本书架
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {books.map(b => (
          <button key={b.id} onClick={() => openBook(b.id)}
            className="bg-white rounded-3xl shadow-lg p-6 text-center hover:scale-105 transition">
            <div className="text-7xl mb-2">{b.cover}</div>
            <div className="text-lg font-bold text-gray-800">{b.title}</div>
            <div className="text-sm text-gray-400">L{b.level} 绘本</div>
          </button>
        ))}
      </div>
    </div>
  );
}
