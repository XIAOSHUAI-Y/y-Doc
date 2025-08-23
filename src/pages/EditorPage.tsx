// src/pages/EditorPage.tsx
import { useParams, useNavigate } from 'react-router-dom'; // 替换a标签为useNavigate（React路由规范）
import { Editor } from '../core/editor';
import { useUserStore } from '../store/userStore';
// import './editorpage.css';
import './ed.css';

export default function EditorPage() {
	const { docId } = useParams<{ docId: string }>();
	const { username } = useUserStore();
	const navigate = useNavigate(); // 用于返回文档列表（替换a标签）

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
							value='未命名文档'
							onChange={(e) => {
								/* 可添加标题修改逻辑 */
							}}
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
			{/* 2. 中间编辑区（editor-container，修复结构和样式依赖） */}
			<div id='editor-container'>
				{/* 编辑工具栏 */}
				<div id='editor-toolbar'>
					<div id='text-format-group'>
						<div id='heading-dropdown'>
							<span>正文</span>
							<i className='fa fa-chevron-down'></i>
						</div>
						<div className='toolbar-divider'></div>
						<button
							id='bold-button'
							className='toolbar-button active'>
							<i className='fa fa-bold'></i>
						</button>
						<button
							id='italic-button'
							className='toolbar-button'>
							<i className='fa fa-italic'></i>
						</button>
						<button
							id='underline-button'
							className='toolbar-button'>
							<i className='fa fa-underline'></i>
						</button>
						<button
							id='strikethrough-button'
							className='toolbar-button'>
							<i className='fa fa-strikethrough'></i>
						</button>
						<div className='toolbar-divider'></div>
						<button
							id='text-color-button'
							className='toolbar-button'>
							<i className='fa fa-font'></i>
						</button>
						<button
							id='highlight-button'
							className='toolbar-button'>
							<i className='fa fa-highlighter'></i>
						</button>
						<div className='toolbar-divider'></div>
					</div>

					<div id='paragraph-format-group'>
						<button
							id='align-left-button'
							className='toolbar-button active'>
							<i className='fa fa-align-left'></i>
						</button>
						<button
							id='align-center-button'
							className='toolbar-button'>
							<i className='fa fa-align-center'></i>
						</button>
						<button
							id='align-right-button'
							className='toolbar-button'>
							<i className='fa fa-align-right'></i>
						</button>
						<button
							id='align-justify-button'
							className='toolbar-button'>
							<i className='fa fa-align-justify'></i>
						</button>
						<div className='toolbar-divider'></div>
					</div>

					<div id='list-format-group'>
						<button
							id='bullet-list-button'
							className='toolbar-button'>
							<i className='fa fa-list-ul'></i>
						</button>
						<button
							id='number-list-button'
							className='toolbar-button'>
							<i className='fa fa-list-ol'></i>
						</button>
						<button
							id='checklist-button'
							className='toolbar-button'>
							<i className='fa fa-tasks'></i>
						</button>
						<div className='toolbar-divider'></div>
					</div>

					<div id='insert-group'>
						<button
							id='insert-image-button'
							className='toolbar-button'>
							<i className='fa fa-image'></i>
						</button>
						<button
							id='insert-table-button'
							className='toolbar-button'>
							<i className='fa fa-table'></i>
						</button>
						<button
							id='insert-link-button'
							className='toolbar-button'>
							<i className='fa fa-link'></i>
						</button>
						<button
							id='insert-code-button'
							className='toolbar-button'>
							<i className='fa fa-code'></i>
						</button>
						<button
							id='insert-formula-button'
							className='toolbar-button'>
							<i className='fa fa-square-root-alt'></i>
						</button>
					</div>

					<div className='flex-grow'></div>

					<div id='view-options'>
						<button
							id='fullscreen-button'
							className='toolbar-button'>
							<i className='fa fa-expand'></i>
						</button>
						<button
							id='comment-button'
							className='toolbar-button'>
							<i className='fa fa-comment'></i>
						</button>
						<button
							id='export-button'
							className='toolbar-button'>
							<i className='fa fa-download'></i>
						</button>
					</div>
				</div>

				{/* 编辑内容区 */}
				<div id='editor-content-container'>
					<div id='editor-content-wrapper'>
						{/* 将Editor组件嵌入到内容容器中 */}
						<Editor
							id={docId}
							className='editor-core'
							// initialContent={`
              //   <h1 class="text-3xl font-bold mb-6">项目概述</h1>
              //   <p class="mb-4">本项目旨在开发一款款面向面向学生群体的Web端富文本编辑器...</p>
              // `}
							// onContentChange={(content) => {
							// 	// 处理内容变化逻辑，如自动保存
							// 	console.log('内容已更新', content);
							// }}
						/>
						{/* <div
							id='editor-content'
							contentEditable='true'>
							<h1 className='text-3xl font-bold mb-6'>项目概述</h1>
							<p className='mb-4'>
								本项目旨在开发一款面向学生群体的Web端富文本编辑器，解决文档排版困难和协作编辑不便的核心痛点，提升学习和团队协作效率。编辑器将聚焦“轻量化、易上手、强协作”三大核心特性，适配学生在作业撰写、报告整理、小组项目协作等场景的需求。
							</p>

							<h2 className='text-2xl font-bold mt-8 mb-4'>背景分析</h2>
							<p className='mb-4'>
								随着在线教育的普及和小组作业的增多，学生对高效文档编辑和协作工具的需求日益增长。据2023年教育科技行业报告显示，85%的大学生在小组作业中会遇到“文档版本混乱”“排版耗时”“批注沟通低效”等问题，现有工具难以完全匹配学生的使用场景：
							</p>
							<p className='mb-4'>
								一方面，专业办公级工具（如Office
								365、飞书文档）功能冗余，学生常用功能仅占20%，复杂的操作逻辑增加了学习成本；另一方面，简易编辑器（如在线Markdown工具）虽轻量化，但缺乏可视化排版和实时协作能力，无法满足多人协同的需求。
							</p>
						</div> */}
					</div>
				</div>
			</div>
			{/* 3. Editor组件（若需嵌入编辑区，建议放在editor-content内，避免层级冲突） */}
			{/* 若Editor是核心编辑逻辑，可替换contentEditable区域，示例：
      <Editor id={docId} containerId="editor-content" />
      */}
		</div>
	);
}
