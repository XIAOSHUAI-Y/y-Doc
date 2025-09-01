import { type LexicalEditor } from 'lexical';
import type React from 'react';
import {
	$getSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	FORMAT_ELEMENT_COMMAND,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode } from '@lexical/rich-text';
import {
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import {
	$createTableNode,
	$createTableRowNode,
	$createTableCellNode,
	$isTableNode,
} from '@lexical/table';
import { $createCodeNode, $isCodeNode } from '@lexical/code';

// 处理标题选择
export const handleHeadingSelect = (
	editor: LexicalEditor,
	level: 'h1' | 'h2' | 'h3',
	setShowHeadingDropdown: (show: boolean) => void
) => {
	editor.update(() => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			$setBlocksType(selection, () => $createHeadingNode(level));
		}
	});
	setShowHeadingDropdown(false);
};

// 处理对齐切换
export const handleAlignment = (
	editor: LexicalEditor,
	align: 'left' | 'center' | 'right' | 'justify'
) => {
	editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
};

// 处理文本格式切换（加粗）
export const handleBoldToggle = (editor: LexicalEditor, e: React.MouseEvent) => {
	e.preventDefault();
	editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
};

// 处理文本格式切换（斜体）
export const handleItalicToggle = (editor: LexicalEditor, e: React.MouseEvent) => {
	e.preventDefault();
	editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
};

// 处理文本格式切换（下划线）
export const handleUnderlineToggle = (editor: LexicalEditor, e: React.MouseEvent) => {
	e.preventDefault();
	editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
};

// 处理文本格式切换（删除线）
export const handleStrikethroughToggle = (
	editor: LexicalEditor,
	e: React.MouseEvent
) => {
	e.preventDefault();
	editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
};

// 处理无序列表切换
export const handleUnorderedList = (
	editor: LexicalEditor,
	listType: 'bullet' | 'number' | null,
	e: React.MouseEvent
) => {
	e.preventDefault();
	if (listType === 'bullet') {
		editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
	} else {
		editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
	}
};

// 处理有序列表切换
export const handleOrderedList = (
	editor: LexicalEditor,
	listType: 'bullet' | 'number' | null,
	e: React.MouseEvent
) => {
	e.preventDefault();
	if (listType === 'number') {
		editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
	} else {
		editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
	}
};

// 处理插入表格
export const handleInsertTable = (
	editor: LexicalEditor,
	rows: number,
	columns: number,
	setShowTableDropdown: (show: boolean) => void
) => {
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
		// 插入表格
		selection.insertNodes([tableNode]);
	});
	setShowTableDropdown(false);
};

// 处理删除表格
export const handleRemoveTable = (
  editor: LexicalEditor,
  setShowTableDropdown: (show: boolean) => void
) => {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    const nodes = selection.getNodes();
    for (const node of nodes) {
      let currentNode: any = node;
      // 查找最近的表格节点
      for (let i = 0; i < 5; i++) {
        if ($isTableNode(currentNode)) {
          currentNode.remove();
          break;
        }
        const parent = currentNode.getParent();
        if (!parent) break;
        currentNode = parent;
      }
    }
  });
  setShowTableDropdown(false);
};

// 处理插入代码块
export const handleInsertCodeBlock = (
	editor: LexicalEditor,
	currentCodeLanguage: string,
	e: React.MouseEvent
) => {
	e.preventDefault();
	editor.update(() => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			if (selection.isCollapsed()) {
				// 插入空代码块
				$setBlocksType(selection, () => $createCodeNode(currentCodeLanguage));
			} else {
				// 选中内容转代码块
				const textContent = selection.getTextContent();
				const codeNode = $createCodeNode(currentCodeLanguage);
				selection.insertNodes([codeNode]);
				selection.insertRawText(textContent);
			}
		}
	});
};

// 处理代码语言切换
export const handleCodeLanguageChange = (
	editor: LexicalEditor,
	language: string,
	setCurrentCodeLanguage: (lang: string) => void,
	setShowCodeLanguageDropdown: (show: boolean) => void
) => {
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

// 处理代码主题切换
export const handleCodeThemeChange = (
	editor: LexicalEditor,
	theme: string,
	setCurrentCodeTheme: (theme: string) => void,
	setShowCodeThemeDropdown: (show: boolean) => void
) => {
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
