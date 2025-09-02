import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { useUserStore } from '../../../store/userStore';

export default function Header() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('未命名文档');
  const { docId } = useParams<{ docId: string }>();
  const [_isSaving, setIsSaving] = useState(false);
  const { username } = useUserStore();

  // 加载文档标题（实际项目中应从API获取）
  useEffect(() => {
    if (docId) {
      // 模拟从本地存储加载标题
      const savedTitle = localStorage.getItem(`docTitle_${docId}`);
      if (savedTitle) setTitle(savedTitle);
    }
  }, [docId]);

	// 自动保存标题
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setIsSaving(true);
    
    // 模拟保存到本地存储（实际项目中应调用API）
    setTimeout(() => {
      localStorage.setItem(`docTitle_${docId}`, newTitle);
      setIsSaving(false);
    }, 500);
  };
  return (
    <>
    <header id='top-navbar'>
				<div id='left-section'>
					{/* 替换a标签为按钮+useNavigate（符合React路由跳转规范） */}
					<button
						id='back-button'
						onClick={() => navigate('/P-DOC_LIST')} // 假设文档列表路由是/P-DOC_LIST
					>
						<i className='fa fa-arrow-left'></i>
					</button>
					<div id='document-title-container'>
						<input
							id='document-title'
							type='text'
							value={title}
							onChange={handleTitleChange}
						/>
						<span id='save-status'>已保存</span>
					</div>
				</div>

				<div id='right-section'>
					<button id='share-button'>
						<i className='fa fa-share-alt'></i>
						<span>分享</span>
					</button>

					{/* 修复按钮闭合错误：将自闭合标签改为正常闭合 */}
					<button
						id='history-button'
						className='toolbar-button'>
						<i className='fa fa-history'></i>
					</button>

					<div id='collaborators'>
						<div className='avatar-stack'>
							<div className='avatar'>
								<span>ZL</span>
							</div>
							<div className='avatar'>
								<span>WX</span>
							</div>
							<div className='avatar'>
								<span>LY</span>
							</div>
						</div>
						{/* 修复按钮闭合错误 */}
						<button id='add-collaborator'>
							<i className='fa fa-plus'></i>
						</button>
					</div>

					<div id='user-avatar'>
						{/* 显示当前用户名（替换固定的ME） */}
						<span>{username || 'ME'}</span>
					</div>
				</div>
			</header>
    </>
  )
}
