import { useState, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import HeadingControls from './Plugin/HeadingPlugin';
import TextFormatControls from './Plugin/TextFormatPlugin';
import AlignmentControls from './Plugin/AlingenmentPlugin';
import ListControls from './Plugin/ListPlugin';
import TableControls from './Plugin/TablePlugin';
import CodeBlockControls from './Plugin/CodeBlockPlugin';
import { useSelectionSync } from './hooks';
import { useClickOutsideClose } from './hooks';
import './toolbar.css'

export default function Toolbar() {
  const [editor] = useLexicalComposerContext();
  // 标题相关状态
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
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  // 代码块相关状态
  const [isInCodeBlock, setIsInCodeBlock] = useState(false);
  const [currentCodeLanguage, setCurrentCodeLanguage] = useState('javascript');
  const [currentCodeTheme, setCurrentCodeTheme] = useState('light');
  const [showCodeLanguageDropdown, setShowCodeLanguageDropdown] =
    useState(false);
  const [showCodeThemeDropdown, setShowCodeThemeDropdown] = useState(false);

  // 下拉菜单Ref
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const codeLanguageRef = useRef<HTMLDivElement | null>(null);
  const codeThemeRef = useRef<HTMLDivElement | null>(null);
  const tableDropdownRef = useRef<HTMLDivElement | null>(null);

  // 1. 引入选择状态同步钩子
  useSelectionSync(
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
    setCurrentCodeTheme
  );

  // 2. 引入外部点击关闭下拉钩子
  useClickOutsideClose(
    dropdownRef,
    codeLanguageRef,
    codeThemeRef,
    setShowHeadingDropdown,
    setShowCodeLanguageDropdown,
    setShowCodeThemeDropdown
  );

  return (
    <div id='editor-toolbar'>
      {/* 文本格式组 */}
      <div id='text-format-group'>
        <HeadingControls
          editor={editor}
          currentHeading={currentHeading}
          showHeadingDropdown={showHeadingDropdown}
          setShowHeadingDropdown={setShowHeadingDropdown}
        />
        <div className='toolbar-divider'></div>
        <TextFormatControls
          editor={editor}
          isBoldActive={isBoldActive}
          isItalicActive={isItalicActive}
          isUnderlineActive={isUnderlineActive}
          isStrikethroughActive={isStrikethroughActive}
        />
      </div>

      {/* 段落格式组 */}
      <div id='paragraph-format-group'>
        <AlignmentControls editor={editor} alignment={alignment} />
      </div>

      {/* 列表格式组 */}
      <div id='list-format-group'>
        <ListControls editor={editor} listType={listType} />
      </div>

      {/* 插入内容组 */}
      <div id='insert-group'>
        <button id='insert-image-button' className='toolbar-button'>
          <i className='fa fa-image'>图片</i>
        </button>

        <TableControls
          editor={editor}
          isInTable={isInTable}
          showTableDropdown={showTableDropdown}
          setShowTableDropdown={setShowTableDropdown}
        />

        <button id='insert-link-button' className='toolbar-button'>
          <i className='fa fa-link'>链接</i>
        </button>

        <CodeBlockControls
          editor={editor}
          isInCodeBlock={isInCodeBlock}
          currentCodeLanguage={currentCodeLanguage}
        />
      </div>
    </div>
  );
}
