// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useUserStore } from '../store/userStore';
import './home.css';

interface DocItem {
  id: string;
  title: string;
  updatedAt: string;
  collaborators: string[];
}

export default function HomePage() {
  const navigate = useNavigate();
  const { username, setUsername } = useUserStore();
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });
  const [docs, setDocs] = useState<DocItem[]>([]);

  useEffect(() => {
    // 从 localStorage 加载已有文档
    const items: DocItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('docTitle_')) {
        const id = key.replace('docTitle_', '');
        const title = localStorage.getItem(key) || '未命名文档';
        items.push({
          id,
          title,
          updatedAt: '刚刚编辑',
          collaborators: [username?.slice(0, 2).toUpperCase() || 'ME'],
        });
      }
    }
    // 如果没有文档，展示示例
    if (items.length === 0) {
      setDocs([
        { id: 'demo-1', title: '产品需求文档', updatedAt: '2 小时前编辑', collaborators: ['ZL', 'WX', 'LY'] },
        { id: 'demo-2', title: '会议纪要 2025-05-20', updatedAt: '昨天编辑', collaborators: ['ZL', 'WX'] },
        { id: 'demo-3', title: '技术架构设计', updatedAt: '3 天前编辑', collaborators: ['LY'] },
        { id: 'demo-4', title: '未命名文档', updatedAt: '刚刚创建', collaborators: ['ME'] },
      ]);
    } else {
      setDocs(items);
    }
  }, [username]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('y-doc-theme', newTheme);
  };

  const handleCreateDoc = () => {
    const newDocId = uuidv4();
    navigate(`editor/${newDocId}`);
  };

  const handleCardClick = (id: string) => {
    if (id.startsWith('demo-')) {
      const realDocId = uuidv4();
      localStorage.setItem(`docTitle_${realDocId}`, docs.find(d => d.id === id)?.title || '未命名文档');
      navigate(`editor/${realDocId}`);
    } else {
      navigate(`editor/${id}`);
    }
  };

  const renderAvatars = (collaborators: string[]) => {
    const maxShow = 3;
    const shown = collaborators.slice(0, maxShow);
    const more = collaborators.length > maxShow ? collaborators.length - maxShow : 0;
    return (
      <div className="home-doc-avatars">
        {shown.map((name, idx) => (
          <div key={idx} className="avatar">
            <span>{name}</span>
          </div>
        ))}
        {more > 0 && (
          <div className="more">
            <span>+{more}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="home-page">
      {/* Topbar */}
      <div className="home-topbar">
        <div className="home-brand">y-Doc</div>
        <div className="home-topbar-right">
          <div className="home-user-chip">
            <div className="dot"></div>
            {username || 'User'}
          </div>
          <button
            className="home-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
          >
            <i className={theme === 'light' ? 'fa fa-moon-o' : 'fa fa-sun-o'}></i>
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="home-hero">
        <h1>我的文档</h1>
        <p>管理你的协同文档，与团队实时协作</p>
      </div>

      {/* Username input */}
      <div className="home-user-section">
        <input
          type="text"
          className="home-user-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="输入你的用户名"
        />
      </div>

      {/* Actions */}
      <div className="home-actions">
        <button className="home-btn-primary" onClick={handleCreateDoc}>
          <i className="fa fa-plus"></i>
          <span>新建文档</span>
        </button>
        <button className="home-btn-ghost" onClick={() => alert('导入功能开发中')}>
          <span>导入文档</span>
        </button>
      </div>

      {/* Doc grid */}
      <div className="home-doc-grid">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="home-doc-card"
            onClick={() => handleCardClick(doc.id)}
          >
            <h3>{doc.title}</h3>
            <div className="home-doc-meta">{doc.updatedAt}</div>
            {renderAvatars(doc.collaborators)}
          </div>
        ))}
      </div>
    </div>
  );
}
