// src/pages/EditorPage.tsx
import { useParams } from 'react-router-dom'; // 替换a标签为useNavigate（React路由规范）
import { Editor } from '../core/editor';
// import { useUserStore } from '../store/userStore';
import './ed.css';
// import { useEffect, useState } from 'react';
import Header from './components/header';
// import Toolbar from './components/editorToolbar';

export default function EditorPage() {
	const { docId } = useParams<{ docId: string }>();
	// 文档ID不存在时的友好提示
	if (!docId) {
		return (
			<div className='empty-tip'>
				<i className='fa fa-exclamation-circle'></i>
				<p>文档ID不存在，请检查链接是否正确</p>
			</div>
		);
	}

	return (
		<div className='editor-page-container'>
			{' '}
			{/* 根容器，控制整体布局 */}
			{/* 1. 顶部导航栏（移除body标签，修复按钮闭合错误） */}
			<Header />
			{/* 2. 中间编辑区（editor-container，修复结构和样式依赖） */}
			<Editor />
		</div>
	);
}
