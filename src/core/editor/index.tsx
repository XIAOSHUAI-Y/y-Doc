import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useCallback, useRef } from 'react';
import { Nodes } from './nodes';
import './editor.css';

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

	const initialConfig = {
		// NOTE: This is critical for collaboration plugin to set editor state to null. It
		// would indicate that the editor should not try to set any default state
		// (not even empty one), and let collaboration plugin do it instead
		editorState: null,
		namespace: 'Demo',
		nodes: [...Nodes],
		onError: (error: Error) => {
			throw error;
		},
		theme: {},
	};

	const providerFactory = useCallback(
		(id: string, yjsDocMap: Map<string, Y.Doc>) => {
			let doc = yjsDocMap.get(id);
			if (!doc) {
				doc = new Y.Doc();
				yjsDocMap.set(id, doc);
			}

			return new WebsocketProvider(
				'ws://localhost:3000/collab',
				'lexical',
				doc,
				{
					connect: false,
				}
			) as WebsocketProvider;
		},
		[]
	);

	return (
		<div className='content'>
			<LexicalComposer initialConfig={initialConfig}>
				<RichTextPlugin
					contentEditable={<ContentEditable className='editor-input' />}
					placeholder={
						<div className='editor-placeholder'></div>
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
			</LexicalComposer>
		</div>
	);
}
