import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { useUserStore } from '../../../store/userStore';

export default function Header() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('未命名文档');
  const { docId } = useParams<{ docId: string }>();
  const [_isSaving, setIsSaving] = useState(false);
  const { username } = useUserStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载文档标题（实际项目中应从API获取）
  useEffect(() => {
    if (docId) {
      const savedTitle = localStorage.getItem(`docTitle_${docId}`);
      if (savedTitle) setTitle(savedTitle);
    }
  }, [docId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setIsSaving(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(`docTitle_${docId}`, newTitle);
      setIsSaving(false);
    }, 500);
  };

  return (
    <header className='navbar'>
      <div className='nav-left'>
        <button className='nav-back' onClick={() => navigate(-1)}>
          ←
        </button>
        <input
          className='nav-title'
          type='text'
          value={title}
          onChange={handleTitleChange}
        />
        <span className='nav-saved'>已保存</span>
      </div>

      <div className='nav-right'>
        <button className='nav-btn'>
          <span>↗ 分享</span>
        </button>

        <button className='nav-btn'>
          <span>↺ 历史</span>
        </button>

        <div className='avatar-stack'>
          <div className='avatar'><span>ZL</span></div>
          <div className='avatar'><span>WX</span></div>
          <div className='avatar'><span>LY</span></div>
        </div>
        <button className='avatar-add'>
          +
        </button>

        <div className='user-avatar'>
          <span>{username || 'ME'}</span>
        </div>
      </div>
    </header>
  )
}
