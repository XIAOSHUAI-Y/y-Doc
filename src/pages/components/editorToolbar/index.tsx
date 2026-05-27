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
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [currentHeading, setCurrentHeading] = useState('正文');
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);
  const [isStrikethroughActive, setIsStrikethroughActive] = useState(false);
  const [alignment, setAlignment] = useState<
    'left' | 'center' | 'right' | 'justify'
  >('left');
  const [listType, setListType] = useState<'bullet' | 'number' | null>(null);
  const [isInTable, setIsInTable] = useState(false);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [isInCodeBlock, setIsInCodeBlock] = useState(false);
  const [currentCodeLanguage, setCurrentCodeLanguage] = useState('javascript');
  const [_currentCodeTheme, setCurrentCodeTheme] = useState('light');
  const [_showCodeLanguageDropdown, setShowCodeLanguageDropdown] =
    useState(false);
  const [_showCodeThemeDropdown, setShowCodeThemeDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const codeLanguageRef = useRef<HTMLDivElement | null>(null);
  const codeThemeRef = useRef<HTMLDivElement | null>(null);

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

  useClickOutsideClose(
    dropdownRef,
    codeLanguageRef,
    codeThemeRef,
    setShowHeadingDropdown,
    setShowCodeLanguageDropdown,
    setShowCodeThemeDropdown
  );

  return (
    <div className='toolbar'>
      <div className='toolbar-group'>
        <HeadingControls
          editor={editor}
          currentHeading={currentHeading}
          showHeadingDropdown={showHeadingDropdown}
          setShowHeadingDropdown={setShowHeadingDropdown}
        />
      </div>

      <div className='toolbar-group'>
        <TextFormatControls
          editor={editor}
          isBoldActive={isBoldActive}
          isItalicActive={isItalicActive}
          isUnderlineActive={isUnderlineActive}
          isStrikethroughActive={isStrikethroughActive}
        />
      </div>

      <div className='toolbar-group'>
        <AlignmentControls editor={editor} alignment={alignment} />
      </div>

      <div className='toolbar-group'>
        <ListControls editor={editor} listType={listType} />
      </div>

      <div className='toolbar-group'>
        <button className='tbtn'>
          <span>🖼 图片</span>
        </button>

        <TableControls
          editor={editor}
          isInTable={isInTable}
          showTableDropdown={showTableDropdown}
          setShowTableDropdown={setShowTableDropdown}
        />

        <button className='tbtn'>
          <span>🔗 链接</span>
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
