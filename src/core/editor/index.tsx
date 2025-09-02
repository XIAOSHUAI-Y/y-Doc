import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useCallback, useRef } from 'react';
import { docNodes } from './nodes';
import './editor.css';
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	type EditorState,
	type LexicalEditor,
} from 'lexical';
import { $createHeadingNode } from '@lexical/rich-text';
import React from 'react';
import type { Provider } from '@lexical/yjs';
import { docTheme } from './theme/theme';
import Toolbar from '../../pages/components/editorToolbar/index';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';

function MyOnChangePlugin(props: {
	onChange: (editorState: EditorState) => void;
}) {
	const [editor] = useLexicalComposerContext();
	const { onChange } = props;
	React.useEffect(() => {
		return editor.registerUpdateListener(({ editorState }) => {
			onChange(editorState);
		});
	}, [onChange, editor]);
	return null;
}

export function Editor() {
	const containerRef = useRef<HTMLDivElement>(null);

	function getRandomCursorColor() {
		// 生成红色分量，范围在 200 到 255 之间，保证偏暖且颜色较浅
		const r = Math.floor(Math.random() * 56) + 200;
		// 生成绿色分量，范围在 100 到 200 之间，保证偏暖且颜色较浅
		const g = Math.floor(Math.random() * 101) + 100;
		// 生成蓝色分量，范围在 0 到 100 之间，保证偏暖且颜色较浅
		const b = Math.floor(Math.random() * 101);
		// 将 RGB 分量转换为十六进制字符串并拼接
		const color =
			'#' +
			r.toString(16).padStart(2, '0') +
			g.toString(16).padStart(2, '0') +
			b.toString(16).padStart(2, '0');
		return color;
	}

	// 修改初始内容设置部分（正确使用 Lexical 节点的 append 方法）
	const initialEditorState = useCallback((editor: LexicalEditor) => {
		editor.update(() => {
			const root = $getRoot(); // 获取根节点（RootNode）
			// 检查根节点是否为空
			if (root.getFirstChild() === null) {
				// 1. 创建标题节点并添加文本
				const heading = $createHeadingNode('h1');
				const headingText = $createTextNode('未命名文档');
				heading.append(headingText); // 向标题节点添加文本
				root.append(heading); // 向根节点添加标题

				// 2. 创建段落节点并添加文本
				const paragraph = $createParagraphNode();
				const paragraphText = $createTextNode('在此开始编辑...');
				paragraph.append(paragraphText); // 向段落节点添加文本
				root.append(paragraph); // 向根节点添加段落
			}
		});
	}, []);
	const initialConfig = {
		editorState: null,
		namespace: 'Demo',
		nodes: [...docNodes],
		onError: (error: Error) => {
			throw error;
		},
		theme: docTheme,
		onInitialize: initialEditorState, // 添加初始化回调
	};

	const providerFactory = useCallback(
		(docId: string, yjsDocMap: Map<string, Y.Doc>): Provider => {
			let doc = yjsDocMap.get(docId);
			if (!doc) {
				doc = new Y.Doc();
				yjsDocMap.set(docId, doc);
			}

			const provider = new WebsocketProvider(
				'ws://localhost:3000/collab',
				docId,
				doc,
				{
					connect: false,
				}
			);
			// 监听连接状态
			provider.on('status', (event) => {
				console.log('协作连接状态:', event.status);
			});

			// 监听连接错误
			provider.on('connection-error', (error) => {
				console.error('协作连接错误:', error);
			});
			// 初始化用户状态，确保包含所有必要的属性
			provider.awareness.setLocalState({
				name: 'User-' + Math.random().toString(36).substring(2, 8),
				color: getRandomCursorColor(),
				anchorPos: null,
				focusPos: null,
				focusing: false,
				awarenessData: {},
			});
			// 连接到协作服务器
			provider.connect();

			return provider as unknown as Provider;
		},
		[]
	);

	return (
		<div className=''>
			<LexicalComposer initialConfig={initialConfig}>
				<ListPlugin />
				<TablePlugin />
				<Toolbar />
				<div className='editor-container content'>
					<div className='editor-content-wrapper'>
						<RichTextPlugin
							contentEditable={<ContentEditable className='editor-input' />}
							placeholder={
								<div className='editor-placeholder'>Enter some text...</div>
							}
							ErrorBoundary={LexicalErrorBoundary}
						/>
						<CollaborationPlugin
							id='lexical/react-rich-collab'
							providerFactory={providerFactory}
							shouldBootstrap={true}
							cursorColor={getRandomCursorColor()}
							cursorsContainerRef={containerRef}
						/>
						<MarkdownShortcutPlugin />
						<MyOnChangePlugin
							onChange={(editorState) => {
								console.log(editorState);
							}}
						/>
					</div>
				</div>
			</LexicalComposer>
		</div>
	);
}
