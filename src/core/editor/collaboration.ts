import type { Provider as YjsProvider } from '@lexical/yjs'; // 使用默认导入
import { WebsocketProvider } from 'y-websocket';
import type { WebsocketProvider as WsProviderType } from 'y-websocket'; // 导入类型
import { Doc } from 'yjs';
import * as Y from 'yjs'; // 确保导入 Y 命名空间

export interface User {
	name: string;
	color: string;
}

export function createWebsocketProvider(
	docId: string,
	yjsDocMap: Map<string, Y.Doc>
): YjsProvider {
	let doc = yjsDocMap.get(docId);
	if (!doc) {
		doc = new Y.Doc();
		yjsDocMap.set(docId, doc);
	} else {
		doc.load()
	}

	// 直接创建 WebsocketProvider 实例（不急于转为 Provider 类型）
	const wsProvider = new WebsocketProvider(
		`ws://localhost:3000/doc-yjs`,
		docId,
		doc,
		{
			connect: false,
		}
	);

	// 直接监听 wsProvider 的错误（无需转换类型，因为此时是原始类型）
	// 修改错误监听代码
	wsProvider.on('connection-error', (err) => {
		// 用 "connection-error" 替代 "error"
		console.error('WebSocket 连接错误:', err);
	});

	// 最后转为 Provider 类型返回（通过 unknown 中转）
	return wsProvider as unknown as YjsProvider;
}

// 生成随机光标颜色（区分不同用户）
export function getRandomCursorColor(): string {
	const r = Math.floor(Math.random() * 56) + 200; // 偏暖红色
	const g = Math.floor(Math.random() * 101) + 100; // 偏暖绿色
	const b = Math.floor(Math.random() * 101); // 低蓝色
	return `#${r.toString(16).padStart(2, '0')}${g
		.toString(16)
		.padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
