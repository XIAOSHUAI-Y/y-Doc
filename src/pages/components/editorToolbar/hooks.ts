import { useEffect } from 'react';
import type { LexicalEditor } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $isElementNode,
} from 'lexical';
import {
	$createTableNode,
	$createTableRowNode,
	$createTableCellNode,
	$isTableNode,
	$isTableRowNode,
	$isTableCellNode,
	INSERT_TABLE_COMMAND,
} from '@lexical/table';
import { $createCodeNode, $isCodeNode } from '@lexical/code';
import {
	$isListNode,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	ListNode,
} from '@lexical/list';
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';

// 监听选择变化：同步所有格式状态
export const useSelectionSync = (
  editor: LexicalEditor | undefined,
  setCurrentHeading: (heading: string) => void,
  setIsBoldActive: (active: boolean) => void,
  setIsItalicActive: (active: boolean) => void,
  setIsUnderlineActive: (active: boolean) => void,
  setIsStrikethroughActive: (active: boolean) => void,
  setAlignment: (align: 'left' | 'center' | 'right' | 'justify') => void,
  setListType: (type: 'bullet' | 'number' | null) => void,
  setIsInTable: (inTable: boolean) => void,
  setIsInCodeBlock: (inCodeBlock: boolean) => void,
  setCurrentCodeLanguage: (lang: string) => void,
  setCurrentCodeTheme: (theme: string) => void
) => {
  useEffect(() => {
    if (!editor) return;

    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // 1. 同步标题状态
          const nodes = selection.getNodes();
          if (nodes.length > 0) {
            const firstNode = nodes[0];
            if ($isHeadingNode(firstNode)) {
              setCurrentHeading(
                `H${
                  firstNode.getTag() === 'h1' ? 1 : firstNode.getTag() === 'h2' ? 2 : 3
                }`
              );
            } else if ($isCodeNode(firstNode)) {
              setCurrentHeading('代码块');
              setCurrentCodeLanguage(firstNode.getLanguage() || 'javascript');
              setCurrentCodeTheme(firstNode.getTheme() || 'light');
            } else {
              // 检查列表节点
              let listNode = null;
              let currentNode: any = firstNode;
              for (let i = 0; i < 5; i++) {
                if ($isListNode(currentNode)) {
                  listNode = currentNode;
                  break;
                }
                const parent = currentNode.getParent();
                if (!parent) break;
                currentNode = parent;
              }
              setCurrentHeading(listNode ? (listNode.getListType() === 'bullet' ? '无序列表' : '有序列表') : '正文');
            }
          }

          // 2. 同步文本格式状态
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

          // 3. 同步对齐状态
          const firstNode = selection.getNodes()[0];
          const parent = firstNode.getParent();
          const blockElement = parent ?? firstNode;
          if ($isElementNode(blockElement)) {
            const align = blockElement.getFormatType() as 'left' | 'center' | 'right' | 'justify';
            setAlignment(align || 'left');
          }

          // 4. 同步列表状态
          let listNode = null;
          let currentNode: any = blockElement;
          for (let i = 0; i < 5; i++) {
            if ($isListNode(currentNode)) {
              listNode = currentNode;
              break;
            }
            const parent = currentNode.getParent();
            if (!parent) break;
            currentNode = parent;
          }
          setListType(listNode ? (listNode.getListType() as 'bullet' | 'number') : null);

          // 5. 同步表格状态
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

          // 6. 同步代码块状态
          let inCodeBlock = false;
          currentNode = blockElement;
          for (let i = 0; i < 5; i++) {
            if ($isCodeNode(currentNode)) {
              inCodeBlock = true;
              setCurrentCodeLanguage(currentNode.getLanguage() || 'javascript');
              setCurrentCodeTheme(currentNode.getTheme() || 'light');
              break;
            }
            const parent = currentNode.getParent();
            if (!parent) break;
            currentNode = parent;
          }

          // 更新所有状态
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
  }, [
    editor,
    setCurrentHeading,
    setIsBoldActive,
    setIsItalicActive,
    setIsUnderlineActive,
    setIsStrikethroughActive,
    setAlignment,
    setListType,
    setIsInTable,
    setIsInCodeBlock,
    setCurrentCodeLanguage,
    setCurrentCodeTheme,
  ]);
};

// 点击外部关闭下拉菜单
export const useClickOutsideClose = (
  dropdownRef: React.RefObject<HTMLDivElement | null>,
  codeLanguageRef: React.RefObject<HTMLDivElement | null>,
  codeThemeRef: React.RefObject<HTMLDivElement | null>,
  setShowHeadingDropdown: (show: boolean) => void,
  setShowCodeLanguageDropdown: (show: boolean) => void,
  setShowCodeThemeDropdown: (show: boolean) => void
) => {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // 关闭标题下拉
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowHeadingDropdown(false);
      }
      // 关闭代码语言下拉
      if (codeLanguageRef.current && !codeLanguageRef.current.contains(e.target as Node)) {
        setShowCodeLanguageDropdown(false);
      }
      // 关闭代码主题下拉
      if (codeThemeRef.current && !codeThemeRef.current.contains(e.target as Node)) {
        setShowCodeThemeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [
    dropdownRef,
    codeLanguageRef,
    codeThemeRef,
    setShowHeadingDropdown,
    setShowCodeLanguageDropdown,
    setShowCodeThemeDropdown,
  ]);
};