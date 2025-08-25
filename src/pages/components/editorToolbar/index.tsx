export default function Toolbar() {

	return (
		<>
			<div id='editor-toolbar'>
				<div id='text-format-group'>
					<div id='heading-dropdown'>
						<span>正文</span>
						<i className='fa fa-chevron-down'></i>
					</div>
					<div className='toolbar-divider'></div>
					<button
						id='bold-button'
						// className='toolbar-button active'
						className={`toolbar-button active`}
            onClick={() => toggleBold()}
						>
						<i className='fa fa-bold'>B</i>
					</button>
					<button
						id='italic-button'
						className='toolbar-button'>
						<i className='fa fa-italic'>I</i>
					</button>
					<button
						id='underline-button'
						className='toolbar-button'>
						<i className='fa fa-underline'>U</i>
					</button>
					<button
						id='strikethrough-button'
						className='toolbar-button'>
						<i className='fa fa-strikethrough'>删除</i>
					</button>
					<div className='toolbar-divider'></div>
					<button
						id='text-color-button'
						className='toolbar-button'>
						<i className='fa fa-font'>画笔</i>
					</button>
					<button
						id='highlight-button'
						className='toolbar-button'>
						<i className='fa fa-highlighter'>A</i>
					</button>
					<div className='toolbar-divider'></div>
				</div>

				<div id='paragraph-format-group'>
					<button
						id='align-left-button'
						className='toolbar-button active'>
						<i className='fa fa-align-left'>左对齐</i>
					</button>
					<button
						id='align-center-button'
						className='toolbar-button'>
						<i className='fa fa-align-center'>中</i>
					</button>
					<button
						id='align-right-button'
						className='toolbar-button'>
						<i className='fa fa-align-right'>右</i>
					</button>
					<button
						id='align-justify-button'
						className='toolbar-button'>
						<i className='fa fa-align-justify'>两端</i>
					</button>
					<div className='toolbar-divider'></div>
				</div>

				<div id='list-format-group'>
					<button
						id='bullet-list-button'
						className='toolbar-button'>
						<i className='fa fa-list-ul'>无序</i>
					</button>
					<button
						id='number-list-button'
						className='toolbar-button'>
						<i className='fa fa-list-ol'>有序</i>
					</button>
					<button
						id='checklist-button'
						className='toolbar-button'>
						<i className='fa fa-tasks'>待办</i>
					</button>
					<div className='toolbar-divider'></div>
				</div>

				<div id='insert-group'>
					<button
						id='insert-image-button'
						className='toolbar-button'>
						<i className='fa fa-image'>图片</i>
					</button>
					<button
						id='insert-table-button'
						className='toolbar-button'>
						<i className='fa fa-table'>表格</i>
					</button>
					<button
						id='insert-link-button'
						className='toolbar-button'>
						<i className='fa fa-link'>链接</i>
					</button>
					<button
						id='insert-code-button'
						className='toolbar-button'>
						<i className='fa fa-code'>代码</i>
					</button>
					<button
						id='insert-formula-button'
						className='toolbar-button'>
						<i className='fa fa-square-root-alt'>开根</i>
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
		</>
	);
}

