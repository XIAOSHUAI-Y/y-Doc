// import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
// import {
// 	$getSelection,
// 	$isRangeSelection,
// 	TextNode,
// 	$isTextNode,
// } from 'lexical';
// import { $setBlocksType } from '@lexical/selection';
// import type React from 'react';
// import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';
// import { useEffect, useState, useRef } from 'react';
// // 导入 Lexical 文本格式化核心依赖
// import { FORMAT_TEXT_COMMAND } from 'lexical';
// import './toolbar.css';

// export default function Toolbar() {
// 	const [editor] = useLexicalComposerContext();
// 	const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
// 	const [currentHeading, setCurrentHeading] = useState('正文');
// 	// 新增：跟踪斜体按钮激活状态（与选中文本格式同步）
// 	const [isBoldActive, setIsBoldActive] = useState(false);
// 	const [isItalicActive, setIsItalicActive] = useState(false);
// 	const [isStrikethroughActive, setIsStrikethroughActive] = useState(false);
// 	const dropdownRef = useRef<HTMLDivElement>(null);

// 	// 监听选择变化：同步标题状态 + 斜体按钮激活状态
// 	useEffect(() => {
// 		if (editor) {
//       console.log('Editor 实例有效：', editor);
//     } else {
//       console.error('Editor 实例无效！Toolbar 未正确获取 Lexical 上下文');
//     }
// 		return editor.registerUpdateListener(({ editorState }) => {
// 			editorState.read(() => {
// 				const selection = $getSelection();
// 				if ($isRangeSelection(selection)) {
// 					// 1. 同步标题状态（原有逻辑保留）
// 					const nodes = selection.getNodes();
// 					if (nodes.length > 0) {
// 						const firstNode = nodes[0];
// 						if ($isHeadingNode(firstNode)) {
// 							setCurrentHeading(
// 								`H${
// 									firstNode.getTag() === 'h1'
// 										? 1
// 										: firstNode.getTag() === 'h2'
// 										? 2
// 										: 3
// 								}`
// 							);
// 						} else {
// 							setCurrentHeading('正文');
// 						}
// 					}

// 					// 2. 同步斜体按钮激活状态（核心：检测选中文本是否含斜体格式）
// 					let isBold = false;
// 					let isItalic = false;
// 					let isStrikethrough = false;
// 					const selectedNodes = selection.getNodes();

// 					for (const node of selectedNodes) {
// 						if ($isTextNode(node)) {
// 							const format = node.getFormat();
// 							// 加粗对应二进制标志位：0b1（Lexical 内部 TEXT_TYPE_TO_FORMAT.bold 的值）
// 							isBold = (format & 0b1) !== 0;
// 							// 斜体对应二进制标志位：0b10（原有逻辑保留）
// 							isItalic = (format & 0b10) !== 0;
// 							// 删除线对应二进制标志位：0b1000（16进制的 0x8）
// 							isStrikethrough = (format & 0b1000) !== 0;

// 							// 只要有一个文本节点含目标格式，就标记为激活（提前跳出循环优化）
// 							if (isBold && isItalic && isStrikethrough) break;
// 						}
// 					}

// 					setIsBoldActive(isBold);
// 					setIsItalicActive(isItalic);
// 					setIsStrikethroughActive(isStrikethrough);
// 				} else {
// 					// 无选择时重置所有格式状态
// 					setCurrentHeading('正文');
// 					setIsBoldActive(false);
// 					setIsItalicActive(false);
// 					setIsStrikethroughActive(false);
// 				}
// 			});
// 		});
// 	}, [editor]);

// 	// 点击外部关闭下拉菜单（原有逻辑保留）
// 	useEffect(() => {
// 		const handleClickOutside = (e: MouseEvent) => {
// 			if (
// 				dropdownRef.current &&
// 				!dropdownRef.current.contains(e.target as Node)
// 			) {
// 				setShowHeadingDropdown(false);
// 			}
// 		};
// 		document.addEventListener('mousedown', handleClickOutside);
// 		return () => document.removeEventListener('mousedown', handleClickOutside);
// 	}, []);

// 	// 处理标题选择（原有逻辑保留）
// 	const handleHeadingSelect = (level: 'h1' | 'h2' | 'h3') => {
// 		editor.update(() => {
// 			const selection = $getSelection();
// 			if ($isRangeSelection(selection)) {
// 				$setBlocksType(selection, () => $createHeadingNode(level));
// 			}
// 		});
// 		setShowHeadingDropdown(false);
// 	};

// 	const handleBoldToggle = (e: React.MouseEvent) => {
//     e.preventDefault(); // 防止点击失焦，丢失文本选择
//     // 发送格式化命令，参数为 'bold'（指定加粗格式）
//     editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
//   };

// 	// 核心：斜体按钮点击事件（通过 FORMAT_TEXT_COMMAND 触发格式化）
// 	const handleItalicToggle = (e: React.MouseEvent) => {
//     e.preventDefault();
//     editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
//   };

// 	return (
// 		<>
// 			<div id='editor-toolbar'>
// 				<div id='text-format-group'>
// 					{/* 标题下拉菜单（原有逻辑保留） */}
// 					<div
// 						ref={dropdownRef}
// 						id='heading-dropdown'
// 						className={showHeadingDropdown ? 'show-dropdown' : ''}
// 						onMouseEnter={(e) => {
// 							e.stopPropagation();
// 							setShowHeadingDropdown(true);
// 						}}
// 						onMouseLeave={() => setShowHeadingDropdown(false)}>
// 						<span>{currentHeading}</span>
// 						<i className='fa fa-chevron-down'></i>
// 						{showHeadingDropdown && (
// 							<div id='heading-options'>
// 								<div
// 									onClick={() => handleHeadingSelect('h1')}
// 									onMouseDown={(e) => e.preventDefault()}>
// 									H1 标题
// 								</div>
// 								<div
// 									onClick={() => handleHeadingSelect('h2')}
// 									onMouseDown={(e) => e.preventDefault()}>
// 									H2 标题
// 								</div>
// 								<div
// 									onClick={() => handleHeadingSelect('h3')}
// 									onMouseDown={(e) => e.preventDefault()}>
// 									H3 标题
// 								</div>
// 							</div>
// 						)}
// 					</div>

// 					<div className='toolbar-divider'></div>
// 					<button 
//             id='bold-button' 
//             className={`toolbar-button ${isBoldActive ? 'active' : ''}`}
//             onClick={handleBoldToggle}
//             onMouseDown={(e) => e.preventDefault()} // 防失焦
//           >
//             <i className='fa fa-bold'>B</i>
//           </button>
// 					{/* 斜体按钮：绑定事件 + 动态激活样式 */}
// 					<button
// 						id='italic-button'
// 						className={`toolbar-button ${isItalicActive ? 'active' : ''}`}
// 						onClick={handleItalicToggle}
// 						onMouseDown={(e) => e.preventDefault()} // 防止点击时丢失选择
// 					>
// 						<i className='fa fa-italic'>I</i>
// 					</button>
// 					{/* 其他按钮（原有逻辑保留） */}
// 					<button
// 						id='underline-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-underline'>U</i>
// 					</button>
// 					<button 
//             id='strikethrough-button' 
// 						className='toolbar-button'
//           >
// 						<i className='fa fa-strikethrough'>删除</i>
// 					</button>
// 					<div className='toolbar-divider'></div>
// 					<button
// 						id='text-color-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-font'>画笔</i>
// 					</button>
// 					<button
// 						id='highlight-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-highlighter'>A</i>
// 					</button>
// 					<div className='toolbar-divider'></div>
// 				</div>

// 				{/* 其他工具栏组（原有逻辑完全保留） */}
// 				<div id='paragraph-format-group'>
// 					<button
// 						id='align-left-button'
// 						className='toolbar-button active'>
// 						<i className='fa fa-align-left'>左对齐</i>
// 					</button>
// 					<button
// 						id='align-center-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-align-center'>中</i>
// 					</button>
// 					<button
// 						id='align-right-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-align-right'>右</i>
// 					</button>
// 					<button
// 						id='align-justify-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-align-justify'>两端</i>
// 					</button>
// 					<div className='toolbar-divider'></div>
// 				</div>

// 				<div id='list-format-group'>
// 					<button
// 						id='bullet-list-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-list-ul'>无序</i>
// 					</button>
// 					<button
// 						id='number-list-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-list-ol'>有序</i>
// 					</button>
// 					<button
// 						id='checklist-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-tasks'>待办</i>
// 					</button>
// 					<div className='toolbar-divider'></div>
// 				</div>

// 				<div id='insert-group'>
// 					<button
// 						id='insert-image-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-image'>图片</i>
// 					</button>
// 					<button
// 						id='insert-table-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-table'>表格</i>
// 					</button>
// 					<button
// 						id='insert-link-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-link'>链接</i>
// 					</button>
// 					<button
// 						id='insert-code-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-code'>代码</i>
// 					</button>
// 					<button
// 						id='insert-formula-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-square-root-alt'>开根</i>
// 					</button>
// 				</div>

// 				<div className='flex-grow'></div>

// 				<div id='view-options'>
// 					<button
// 						id='fullscreen-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-expand'></i>
// 					</button>
// 					<button
// 						id='comment-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-comment'></i>
// 					</button>
// 					<button
// 						id='export-button'
// 						className='toolbar-button'>
// 						<i className='fa fa-download'></i>
// 					</button>
// 				</div>
// 			</div>
// 		</>
// 	);
// }

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
	$getSelection,
	$isRangeSelection,
	$isTextNode,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import type React from 'react';
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';
import { useEffect, useState, useRef } from 'react';
import { FORMAT_TEXT_COMMAND } from 'lexical';
import './toolbar.css';

export default function Toolbar() {
	const [editor] = useLexicalComposerContext();
	const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
	const [currentHeading, setCurrentHeading] = useState('正文');
	// 跟踪所有文本格式的激活状态
	const [isBoldActive, setIsBoldActive] = useState(false);
	const [isItalicActive, setIsItalicActive] = useState(false);
	const [isUnderlineActive, setIsUnderlineActive] = useState(false);
	const [isStrikethroughActive, setIsStrikethroughActive] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// 监听选择变化：同步所有格式状态
	useEffect(() => {
		if (!editor) return;
		
		return editor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => {
				const selection = $getSelection();
				if ($isRangeSelection(selection)) {
					// 同步标题状态
					const nodes = selection.getNodes();
					if (nodes.length > 0) {
						const firstNode = nodes[0];
						if ($isHeadingNode(firstNode)) {
							setCurrentHeading(
								`H${
									firstNode.getTag() === 'h1' ? 1 :
									firstNode.getTag() === 'h2' ? 2 : 3
								}`
							);
						} else {
							setCurrentHeading('正文');
						}
					}

					// 同步所有文本格式状态
					let isBold = false;
					let isItalic = false;
					let isUnderline = false;
					let isStrikethrough = false;
					const selectedNodes = selection.getNodes();

					for (const node of selectedNodes) {
						if ($isTextNode(node)) {
							const format = node.getFormat();
							// 各格式对应的二进制标志位
							isBold = (format & 0b1) !== 0;               // 1
							isItalic = (format & 0b10) !== 0;            // 2
							isUnderline = (format & 0b100) !== 0;         // 4
							isStrikethrough = (format & 0b1000) !== 0;   // 8

							// 所有格式都找到激活状态后提前退出循环
							if (isBold && isItalic && isUnderline && isStrikethrough) break;
						}
					}

					// 更新所有格式的激活状态
					setIsBoldActive(isBold);
					setIsItalicActive(isItalic);
					setIsUnderlineActive(isUnderline);
					setIsStrikethroughActive(isStrikethrough);
				} else {
					// 无选择时重置所有状态
					setCurrentHeading('正文');
					setIsBoldActive(false);
					setIsItalicActive(false);
					setIsUnderlineActive(false);
					setIsStrikethroughActive(false);
				}
			});
		});
	}, [editor]);

	// 点击外部关闭下拉菜单
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setShowHeadingDropdown(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// 处理标题选择
	const handleHeadingSelect = (level: 'h1' | 'h2' | 'h3') => {
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				$setBlocksType(selection, () => $createHeadingNode(level));
			}
		});
		setShowHeadingDropdown(false);
	};

	// 格式化按钮点击处理函数
	const handleBoldToggle = (e: React.MouseEvent) => {
		e.preventDefault();
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
	};

	const handleItalicToggle = (e: React.MouseEvent) => {
		e.preventDefault();
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
	};

	// 下划线格式化处理
	const handleUnderlineToggle = (e: React.MouseEvent) => {
		e.preventDefault();
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
	};

	// 删除线格式化处理
	const handleStrikethroughToggle = (e: React.MouseEvent) => {
		e.preventDefault();
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
	};

	return (
		<>
			<div id='editor-toolbar'>
				<div id='text-format-group'>
					{/* 标题下拉菜单 */}
					<div
						ref={dropdownRef}
						id='heading-dropdown'
						className={showHeadingDropdown ? 'show-dropdown' : ''}
						onMouseEnter={(e) => {
							e.stopPropagation();
							setShowHeadingDropdown(true);
						}}
						onMouseLeave={() => setShowHeadingDropdown(false)}>
						<span>{currentHeading}</span>
						<i className='fa fa-chevron-down'></i>
						{showHeadingDropdown && (
							<div id='heading-options'>
								<div
									onClick={() => handleHeadingSelect('h1')}
									onMouseDown={(e) => e.preventDefault()}>
									H1 标题
								</div>
								<div
									onClick={() => handleHeadingSelect('h2')}
									onMouseDown={(e) => e.preventDefault()}>
									H2 标题
								</div>
								<div
									onClick={() => handleHeadingSelect('h3')}
									onMouseDown={(e) => e.preventDefault()}>
									H3 标题
								</div>
							</div>
						)}
					</div>

					<div className='toolbar-divider'></div>
					
					{/* 粗体按钮 */}
					<button 
						id='bold-button' 
						className={`toolbar-button ${isBoldActive ? 'active' : ''}`}
						onClick={handleBoldToggle}
						onMouseDown={(e) => e.preventDefault()}
					>
						<i className='fa fa-bold'>B</i>
					</button>
					
					{/* 斜体按钮 */}
					<button
						id='italic-button'
						className={`toolbar-button ${isItalicActive ? 'active' : ''}`}
						onClick={handleItalicToggle}
						onMouseDown={(e) => e.preventDefault()}
					>
						<i className='fa fa-italic'>I</i>
					</button>
					
					{/* 下划线按钮 - 已实现功能 */}
					<button
						id='underline-button'
						className={`toolbar-button ${isUnderlineActive ? 'active' : ''}`}
						onClick={handleUnderlineToggle}
						onMouseDown={(e) => e.preventDefault()}
					>
						<i className='fa fa-underline'>U</i>
					</button>
					
					{/* 删除线按钮 - 已实现功能 */}
					<button 
						id='strikethrough-button' 
						className={`toolbar-button ${isStrikethroughActive ? 'active' : ''}`}
						onClick={handleStrikethroughToggle}
						onMouseDown={(e) => e.preventDefault()}
					>
						<i className='fa fa-strikethrough'>删除</i>
					</button>
					
					<div className='toolbar-divider'></div>
					
					{/* 其他按钮保持不变 */}
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

				{/* 其他工具栏组保持不变 */}
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
