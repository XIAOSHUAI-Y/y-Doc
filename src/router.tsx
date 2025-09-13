// src/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';

const router = createBrowserRouter([
	{ path: '/y-Doc', element: <HomePage /> },
	{ path: '/y-Doc/editor/:docId', element: <EditorPage /> },
]);

export default function AppRouter() {
	return <RouterProvider router={router} />;
}
