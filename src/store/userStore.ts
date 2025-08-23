// src/store/userStore.ts
import { create } from 'zustand';

interface UserState {
	username: string;
	setUsername: (name: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
	username: `User-${Math.random().toString(36).slice(2, 8)}`, // 随机用户名
	setUsername: (name) => set({ username: name }),
}));
