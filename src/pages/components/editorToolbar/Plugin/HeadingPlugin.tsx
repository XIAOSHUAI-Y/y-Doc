import { useRef } from 'react';
import { type LexicalEditor } from 'lexical';
import { handleHeadingSelect } from '../handlers';

interface HeadingControlsProps {
	editor: LexicalEditor;
	currentHeading: string;
	showHeadingDropdown: boolean;
	setShowHeadingDropdown: (show: boolean) => void;
}

export default function HeadingControls({
	editor,
	currentHeading,
	showHeadingDropdown,
	setShowHeadingDropdown,
}: HeadingControlsProps) {
	const dropdownRef = useRef<HTMLDivElement | null>(null);

	return (
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
						onClick={() =>
							handleHeadingSelect(editor, 'h1', setShowHeadingDropdown)
						}
						onMouseDown={(e) => e.preventDefault()}>
						H1 标题
					</div>
					<div
						onClick={() =>
							handleHeadingSelect(editor, 'h2', setShowHeadingDropdown)
						}
						onMouseDown={(e) => e.preventDefault()}>
						H2 标题
					</div>
					<div
						onClick={() =>
							handleHeadingSelect(editor, 'h3', setShowHeadingDropdown)
						}
						onMouseDown={(e) => e.preventDefault()}>
						H3 标题
					</div>
				</div>
			)}
		</div>
	);
}
