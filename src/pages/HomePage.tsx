// src/pages/HomePage.tsx
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useUserStore } from '../store/userStore';

export default function HomePage() {
	const navigate = useNavigate();
	const { username, setUsername } = useUserStore();

	// 创建新文档
	const handleCreateDoc = () => {
		const newDocId = uuidv4(); // 生成随机文档 ID
		navigate(`editor/${newDocId}`);
	};

	return (
		<div style={{ textAlign: 'center', marginTop: '50px' }}>
			<h1>协同文档编辑器</h1>
			<div style={{ margin: '20px 0' }}>
				<input
					type='text'
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					placeholder='输入你的用户名'
					style={{ padding: '8px', marginRight: '8px' }}
				/>
			</div>
			<button
				onClick={handleCreateDoc}
				style={{ padding: '10px 20px', fontSize: '16px' }}>
				创建新文档
			</button>
		</div>
	);
}
