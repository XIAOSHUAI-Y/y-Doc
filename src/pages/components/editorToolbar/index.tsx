import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
	$getSelection,
	$isRangeSelection,
	$isTextNode,
	FORMAT_TEXT_COMMAND,
	FORMAT_ELEMENT_COMMAND,
	$isElementNode,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import type React from 'react';
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';
import { useEffect, useState, useRef } from 'react';
import './toolbar.css';
import {
	$isListNode,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	ListNode,
} from '@lexical/list';
import {
	$createTableNode,
	$createTableRowNode,
	$createTableCellNode,
	$isTableNode,
	$isTableRowNode,
	$isTableCellNode,
	INSERT_TABLE_COMMAND,
} from '@lexical/table';
// 导入代码块相关依赖
import { $createCodeNode, $isCodeNode } from '@lexical/code';

// 代码语言选项
const CODE_LANGUAGES = [
	{ value: 'javascript', label: 'JavaScript' },
	{ value: 'typescript', label: 'TypeScript' },
	{ value: 'python', label: 'Python' },
	{ value: 'java', label: 'Java' },
	{ value: 'c', label: 'C' },
	{ value: 'cpp', label: 'C++' },
	{ value: 'html', label: 'HTML' },
	{ value: 'css', label: 'CSS' },
	{ value: 'json', label: 'JSON' },
	{ value: 'markdown', label: 'Markdown' },
	{ value: 'bash', label: 'Bash' },
];

// 代码主题选项
const CODE_THEMES = [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
	{ value: 'github', label: 'GitHub' },
	{ value: 'dracula', label: 'Dracula' },
];

export default function Toolbar() {
	const [editor] = useLexicalComposerContext();
	const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
	const [currentHeading, setCurrentHeading] = useState('正文');
	// 文本格式状态
	const [isBoldActive, setIsBoldActive] = useState(false);
	const [isItalicActive, setIsItalicActive] = useState(false);
	const [isUnderlineActive, setIsUnderlineActive] = useState(false);
	const [isStrikethroughActive, setIsStrikethroughActive] = useState(false);
	// 对齐状态管理
	const [alignment, setAlignment] = useState<
		'left' | 'center' | 'right' | 'justify'
	>('left');
	// 列表状态管理
	const [listType, setListType] = useState<'bullet' | 'number' | null>(null);
	// 表格状态管理
	const [isInTable, setIsInTable] = useState(false);
	// 表格插入下拉菜单状态
	const [showTableDropdown, setShowTableDropdown] = useState(false);
	const tableDropdownRef = useRef<HTMLDivElement>(null);

	// 代码块相关状态
	const [isInCodeBlock, setIsInCodeBlock] = useState(false);
	const [currentCodeLanguage, setCurrentCodeLanguage] = useState('javascript');
	const [currentCodeTheme, setCurrentCodeTheme] = useState('light');
	const [showCodeLanguageDropdown, setShowCodeLanguageDropdown] =
		useState(false);
	const [showCodeThemeDropdown, setShowCodeThemeDropdown] = useState(false);
	const codeLanguageRef = useRef<HTMLDivElement>(null);
	const codeThemeRef = useRef<HTMLDivElement>(null);

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
									firstNode.getTag() === 'h1'
										? 1
										: firstNode.getTag() === 'h2'
										? 2
										: 3
								}`
							);
						} else if ($isCodeNode(firstNode)) {
							// 处理代码块状态
							setCurrentHeading('代码块');
							setCurrentCodeLanguage(firstNode.getLanguage() || 'javascript');
							setCurrentCodeTheme(firstNode.getTheme() || 'light');
						} else {
							// 检查是否为列表项（更可靠的方式）
							let listNode = null;
							let currentNode: any = firstNode;

							// 向上查找列表节点
							for (let i = 0; i < 5; i++) {
								// 限制查找深度
								if ($isListNode(currentNode)) {
									listNode = currentNode;
									break;
								}
								const parent = currentNode.getParent();
								if (!parent) break;
								currentNode = parent;
							}

							if (listNode) {
								setCurrentHeading(
									listNode.getListType() === 'bullet' ? '无序列表' : '有序列表'
								);
							} else {
								setCurrentHeading('正文');
							}
						}
					}

					// 同步文本格式状态
					let isBold = false;
					let isItalic = false;
					let isUnderline = false;
					let isStrikethrough = false;
					const selectedNodes = selection.getNodes();

					for (const node of selectedNodes) {
						if ($isTextNode(node)) {
							const format = node.getFormat();
							isBold = (format & 0b1) !== 0;
							isItalic = (format & 0b10) !== 0;
							isUnderline = (format & 0b100) !== 0;
							isStrikethrough = (format & 0b1000) !== 0;

							if (isBold && isItalic && isUnderline && isStrikethrough) break;
						}
					}

					// 同步对齐状态
					const firstNode = selection.getNodes()[0];
					const parent = firstNode.getParent();
					const blockElement = parent ?? firstNode;
					if ($isElementNode(blockElement)) {
						const align = blockElement.getFormatType() as
							| 'left'
							| 'center'
							| 'right'
							| 'justify';
						setAlignment(align || 'left');
					}

					// 同步列表状态（改进版）
					let listNode = null;
					let currentNode: any = blockElement;

					// 向上查找列表节点
					for (let i = 0; i < 5; i++) {
						if ($isListNode(currentNode)) {
							listNode = currentNode;
							break;
						}
						const parent = currentNode.getParent();
						if (!parent) break;
						currentNode = parent;
					}

					if (listNode) {
						setListType(listNode.getListType() as 'bullet' | 'number');
					} else {
						setListType(null);
					}

					// 同步表格状态 - 检查当前选中内容是否在表格中
					let inTable = false;
					currentNode = blockElement;

					for (let i = 0; i < 5; i++) {
						if ($isTableNode(currentNode)) {
							inTable = true;
							break;
						}
						const parent = currentNode.getParent();
						if (!parent) break;
						currentNode = parent;
					}

					// 同步代码块状态
					let inCodeBlock = false;
					currentNode = blockElement;

					for (let i = 0; i < 5; i++) {
						if ($isCodeNode(currentNode)) {
							inCodeBlock = true;
							// 更新当前代码块的语言和主题
							setCurrentCodeLanguage(currentNode.getLanguage() || 'javascript');
							setCurrentCodeTheme(currentNode.getTheme() || 'light');
							break;
						}
						const parent = currentNode.getParent();
						if (!parent) break;
						currentNode = parent;
					}

					// 更新格式状态
					setIsBoldActive(isBold);
					setIsItalicActive(isItalic);
					setIsUnderlineActive(isUnderline);
					setIsStrikethroughActive(isStrikethrough);
					setIsInTable(inTable);
					setIsInCodeBlock(inCodeBlock);
				} else {
					// 无选择时重置状态
					setCurrentHeading('正文');
					setIsBoldActive(false);
					setIsItalicActive(false);
					setIsUnderlineActive(false);
					setIsStrikethroughActive(false);
					setAlignment('left');
					setListType(null);
					setIsInTable(false);
					setIsInCodeBlock(false);
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
			if (
				codeLanguageRef.current &&
				!codeLanguageRef.current.contains(e.target as Node)
			) {
				setShowCodeLanguageDropdown(false);
			}
			if (
				codeThemeRef.current &&
				!codeThemeRef.current.contains(e.target as Node)
			) {
				setShowCodeThemeDropdown(false);
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

	// 对齐按钮点击处理
	const handleAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
		editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
		setAlignment(align);
	};

	// 格式化按钮处理函数
	const handleBoldToggle = (e: React.MouseEvent) => {
		e.preventDefault();
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
	};

	const handleItalicToggle = (e: React.MouseEvent) => {
		e.preventDefault();
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
	};

	const handleUnderlineToggle = (e: React.MouseEvent) => {
		e.preventDefault();
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
	};

	const handleStrikethroughToggle = (e: React.MouseEvent) => {
		e.preventDefault();
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
	};

	// 列表按钮处理函数
	const handleUnorderedList = (e: React.MouseEvent) => {
		e.preventDefault();
		// 先尝试移除现有列表格式
		if (listType === 'bullet') {
			editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
		} else {
			editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
		}
	};

	const handleOrderedList = (e: React.MouseEvent) => {
		e.preventDefault();
		// 先尝试移除现有列表格式
		if (listType === 'number') {
			editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
		} else {
			editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
		}
	};

	// 表格处理函数
	const handleInsertTable = (rows: number, columns: number) => {
		editor.update(() => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return;

			// 创建表格节点
			const tableNode = $createTableNode();

			// 创建行和单元格
			for (let i = 0; i < rows; i++) {
				const rowNode = $createTableRowNode();
				for (let j = 0; j < columns; j++) {
					const cellNode = $createTableCellNode();
					rowNode.append(cellNode);
				}
				tableNode.append(rowNode);
			}

			// 将表格插入到编辑器
			selection.insertNodes([tableNode]);
		});
		setShowTableDropdown(false);
	};

	// 代码块处理函数
	const handleInsertCodeBlock = (e: React.MouseEvent) => {
		e.preventDefault();
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				if (selection.isCollapsed()) {
					// 插入空代码块
					$setBlocksType(selection, () => $createCodeNode(currentCodeLanguage));
				} else {
					// 将选中内容转换为代码块
					const textContent = selection.getTextContent();
					const codeNode = $createCodeNode(currentCodeLanguage);
					selection.insertNodes([codeNode]);
					selection.insertRawText(textContent);
				}
			}
		});
	};

	// 切换代码语言
	const handleCodeLanguageChange = (language: string) => {
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				const nodes = selection.getNodes();
				for (const node of nodes) {
					let currentNode: any = node;
					// 查找最近的代码块节点
					for (let i = 0; i < 5; i++) {
						if ($isCodeNode(currentNode)) {
							currentNode.setLanguage(language);
							break;
						}
						const parent = currentNode.getParent();
						if (!parent) break;
						currentNode = parent;
					}
				}
			}
		});
		setCurrentCodeLanguage(language);
		setShowCodeLanguageDropdown(false);
	};

	// 切换代码主题
	const handleCodeThemeChange = (theme: string) => {
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				const nodes = selection.getNodes();
				for (const node of nodes) {
					let currentNode: any = node;
					// 查找最近的代码块节点
					for (let i = 0; i < 5; i++) {
						if ($isCodeNode(currentNode)) {
							currentNode.setTheme(theme);
							break;
						}
						const parent = currentNode.getParent();
						if (!parent) break;
						currentNode = parent;
					}
				}
			}
		});
		setCurrentCodeTheme(theme);
		setShowCodeThemeDropdown(false);
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

					{/* 文本格式按钮 */}
					<button
						id='bold-button'
						className={`toolbar-button ${isBoldActive ? 'active' : ''}`}
						onClick={handleBoldToggle}
						onMouseDown={(e) => e.preventDefault()}>
						<i className='fa fa-bold'>B</i>
					</button>

					<button
						id='italic-button'
						className={`toolbar-button ${isItalicActive ? 'active' : ''}`}
						onClick={handleItalicToggle}
						onMouseDown={(e) => e.preventDefault()}>
						<i className='fa fa-italic'>I</i>
					</button>

					<button
						id='underline-button'
						className={`toolbar-button ${isUnderlineActive ? 'active' : ''}`}
						onClick={handleUnderlineToggle}
						onMouseDown={(e) => e.preventDefault()}>
						<i className='fa fa-underline'>U</i>
					</button>

					<button
						id='strikethrough-button'
						className={`toolbar-button ${
							isStrikethroughActive ? 'active' : ''
						}`}
						onClick={handleStrikethroughToggle}
						onMouseDown={(e) => e.preventDefault()}>
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

				{/* 段落格式组 - 修复了ID重复问题 */}
				<div id='paragraph-format-group'>
					<button
						id='align-left-button'
						className={`toolbar-button ${alignment === 'left' ? 'active' : ''}`}
						onClick={() => handleAlignment('left')}
						onMouseDown={(e) => e.preventDefault()}>
						<i className='fa fa-align-left'>左对齐</i>
					</button>
					<button
						id='align-center-button'
						className={`toolbar-button ${
							alignment === 'center' ? 'active' : ''
						}`}
						onClick={() => handleAlignment('center')}
						onMouseDown={(e) => e.preventDefault()}>
						<i className='fa fa-align-center'>中</i>
					</button>
					<button
						id='align-right-button'
						className={`toolbar-button ${
							alignment === 'right' ? 'active' : ''
						}`}
						onClick={() => handleAlignment('right')}
						onMouseDown={(e) => e.preventDefault()}>
						<i className='fa fa-align-right'>右</i>
					</button>
					<button
						id='align-justify-button'
						className={`toolbar-button ${
							alignment === 'justify' ? 'active' : ''
						}`}
						onClick={() => handleAlignment('justify')}
						onMouseDown={(e) => e.preventDefault()}>
						<i className='fa fa-align-justify'>两端</i>
					</button>
					<div className='toolbar-divider'></div>
				</div>

				<div id='list-format-group'>
					<button
						id='bullet-list-button'
						className={`toolbar-button ${
							listType === 'bullet' ? 'active' : ''
						}`}
						onClick={handleUnorderedList}
						onMouseDown={(e) => e.preventDefault()}>
						<i className='fa fa-list-ul'>无序</i>
					</button>
					<button
						id='number-list-button'
						className={`toolbar-button ${
							listType === 'number' ? 'active' : ''
						}`}
						onClick={handleOrderedList}
						onMouseDown={(e) => e.preventDefault()}>
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
					<div
						ref={tableDropdownRef}
						id='table-dropdown'
						className={showTableDropdown ? 'show-dropdown' : ''}
						onMouseEnter={(e) => {
							e.stopPropagation();
							setShowTableDropdown(true);
						}}
						onMouseLeave={() => setShowTableDropdown(false)}>
						<button
							id='insert-table-button'
							className={`toolbar-button ${isInTable ? 'active' : ''}`}>
							<i className='fa fa-table'>表格</i>
						</button>

						{showTableDropdown && (
							<div id='table-options'>
								<div className='table-size-selector'>
									{/* 表格大小选择网格 - 最大5x5 */}
									{[...Array(5)].map((_, row) => (
										<div
											key={`table-row-${row}`}
											className='table-row'>
											{[...Array(5)].map((_, col) => (
												<div
													key={`table-cell-${row}-${col}`}
													className='table-cell-selector'
													onClick={() => handleInsertTable(row + 1, col + 1)}
													onMouseDown={(e) => e.preventDefault()}
												/>
											))}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
					<button
						id='insert-link-button'
						className='toolbar-button'>
						<i className='fa fa-link'>链接</i>
					</button>
					{/* 代码块相关按钮 */}
					<button
						id='insert-code-button'
						className={`toolbar-button ${isInCodeBlock ? 'active' : ''}`}
						onClick={handleInsertCodeBlock}
						onMouseDown={(e) => e.preventDefault()}>
						<i className='fa fa-code'>代码</i>
					</button>

					{/* 代码语言选择下拉菜单 */}
					{isInCodeBlock && (
						<>
							<div
								ref={codeLanguageRef}
								id='code-language-dropdown'
								className={showCodeLanguageDropdown ? 'show-dropdown' : ''}
								onMouseEnter={(e) => {
									e.stopPropagation();
									setShowCodeLanguageDropdown(true);
								}}
								onMouseLeave={() => setShowCodeLanguageDropdown(false)}>
								<button className='toolbar-button'>
									<i className='fa fa-language'>{currentCodeLanguage}</i>
								</button>

								{showCodeLanguageDropdown && (
									<div id='code-language-options'>
										{CODE_LANGUAGES.map((lang) => (
											<div
												key={lang.value}
												onClick={() => handleCodeLanguageChange(lang.value)}
												onMouseDown={(e) => e.preventDefault()}
												className={
													currentCodeLanguage === lang.value ? 'active' : ''
												}>
												{lang.label}
											</div>
										))}
									</div>
								)}
							</div>

							{/* 代码主题选择下拉菜单 */}
							<div
								ref={codeThemeRef}
								id='code-theme-dropdown'
								className={showCodeThemeDropdown ? 'show-dropdown' : ''}
								onMouseEnter={(e) => {
									e.stopPropagation();
									setShowCodeThemeDropdown(true);
								}}
								onMouseLeave={() => setShowCodeThemeDropdown(false)}>
								<button className='toolbar-button'>
									<i className='fa fa-paint-brush'>{currentCodeTheme}</i>
								</button>

								{showCodeThemeDropdown && (
									<div id='code-theme-options'>
										{CODE_THEMES.map((theme) => (
											<div
												key={theme.value}
												onClick={() => handleCodeThemeChange(theme.value)}
												onMouseDown={(e) => e.preventDefault()}
												className={
													currentCodeTheme === theme.value ? 'active' : ''
												}>
												{theme.label}
											</div>
										))}
									</div>
								)}
							</div>
						</>
					)}

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
