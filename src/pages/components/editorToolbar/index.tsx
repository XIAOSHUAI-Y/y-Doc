import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type React from 'react';
import { useState, useRef } from 'react';
import './toolbar.css';
import { CODE_LANGUAGES, CODE_THEMES } from './constants';
import { useSelectionSync, useClickOutsideClose } from './hooks';
import {
  handleHeadingSelect,
  handleAlignment,
  handleBoldToggle,
  handleItalicToggle,
  handleUnderlineToggle,
  handleStrikethroughToggle,
  handleUnorderedList,
  handleOrderedList,
  handleInsertTable,
  handleInsertCodeBlock,
  handleCodeLanguageChange,
  handleCodeThemeChange,
} from './handlers';

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
    <>
      <div id='editor-toolbar'>
        {/* 文本格式组 */}
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
                  onClick={() => handleHeadingSelect(editor, 'h1', setShowHeadingDropdown)}
                  onMouseDown={(e) => e.preventDefault()}>
                  H1 标题
                </div>
                <div
                  onClick={() => handleHeadingSelect(editor, 'h2', setShowHeadingDropdown)}
                  onMouseDown={(e) => e.preventDefault()}>
                  H2 标题
                </div>
                <div
                  onClick={() => handleHeadingSelect(editor, 'h3', setShowHeadingDropdown)}
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
            onClick={(e) => handleBoldToggle(editor, e)}
            onMouseDown={(e) => e.preventDefault()}>
            <i className='fa fa-bold'>B</i>
          </button>

          <button
            id='italic-button'
            className={`toolbar-button ${isItalicActive ? 'active' : ''}`}
            onClick={(e) => handleItalicToggle(editor, e)}
            onMouseDown={(e) => e.preventDefault()}>
            <i className='fa fa-italic'>I</i>
          </button>

          <button
            id='underline-button'
            className={`toolbar-button ${isUnderlineActive ? 'active' : ''}`}
            onClick={(e) => handleUnderlineToggle(editor, e)}
            onMouseDown={(e) => e.preventDefault()}>
            <i className='fa fa-underline'>U</i>
          </button>

          <button
            id='strikethrough-button'
            className={`toolbar-button ${
              isStrikethroughActive ? 'active' : ''
            }`}
            onClick={(e) => handleStrikethroughToggle(editor, e)}
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

        {/* 段落格式组 */}
        <div id='paragraph-format-group'>
          <button
            id='align-left-button'
            className={`toolbar-button ${alignment === 'left' ? 'active' : ''}`}
            onClick={() => handleAlignment(editor, 'left')}
            onMouseDown={(e) => e.preventDefault()}>
            <i className='fa fa-align-left'>左对齐</i>
          </button>
          <button
            id='align-center-button'
            className={`toolbar-button ${
              alignment === 'center' ? 'active' : ''
            }`}
            onClick={() => handleAlignment(editor, 'center')}
            onMouseDown={(e) => e.preventDefault()}>
            <i className='fa fa-align-center'>中</i>
          </button>
          <button
            id='align-right-button'
            className={`toolbar-button ${
              alignment === 'right' ? 'active' : ''
            }`}
            onClick={() => handleAlignment(editor, 'right')}
            onMouseDown={(e) => e.preventDefault()}>
            <i className='fa fa-align-right'>右</i>
          </button>
          <button
            id='align-justify-button'
            className={`toolbar-button ${
              alignment === 'justify' ? 'active' : ''
            }`}
            onClick={() => handleAlignment(editor, 'justify')}
            onMouseDown={(e) => e.preventDefault()}>
            <i className='fa fa-align-justify'>两端</i>
          </button>
          <div className='toolbar-divider'></div>
        </div>

        {/* 列表格式组 */}
        <div id='list-format-group'>
          <button
            id='bullet-list-button'
            className={`toolbar-button ${
              listType === 'bullet' ? 'active' : ''
            }`}
            onClick={(e) => handleUnorderedList(editor, listType, e)}
            onMouseDown={(e) => e.preventDefault()}>
            <i className='fa fa-list-ul'>无序</i>
          </button>
          <button
            id='number-list-button'
            className={`toolbar-button ${
              listType === 'number' ? 'active' : ''
            }`}
            onClick={(e) => handleOrderedList(editor, listType, e)}
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

        {/* 插入内容组 */}
        <div id='insert-group'>
          <button
            id='insert-image-button'
            className='toolbar-button'>
            <i className='fa fa-image'>图片</i>
          </button>

          {/* 表格下拉菜单 */}
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
                          onClick={() => handleInsertTable(editor, row + 1, col + 1, setShowTableDropdown)}
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
            onClick={(e) => handleInsertCodeBlock(editor, currentCodeLanguage, e)}
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
                        onClick={() => handleCodeLanguageChange(editor, lang.value, setCurrentCodeLanguage, setShowCodeLanguageDropdown)}
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
                        onClick={() => handleCodeThemeChange(editor, theme.value, setCurrentCodeTheme, setShowCodeThemeDropdown)}
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

        {/* 视图选项组 */}
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