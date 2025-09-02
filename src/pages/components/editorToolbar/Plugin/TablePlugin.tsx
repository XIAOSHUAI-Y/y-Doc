import { useRef } from 'react';
import { type LexicalEditor } from 'lexical';
import { handleInsertTable } from '../handlers';

interface TableControlsProps {
	editor: LexicalEditor;
	isInTable: boolean;
	showTableDropdown: boolean;
	setShowTableDropdown: (show: boolean) => void;
}

export default function TableControls({
	editor,
	isInTable,
	showTableDropdown,
	setShowTableDropdown,
}: TableControlsProps) {
	const tableDropdownRef = useRef<HTMLDivElement | null>(null);

	return (
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
						{[...Array(5)].map((_, row) => (
							<div
								key={`table-row-${row}`}
								className='table-row'>
								{[...Array(5)].map((_, col) => (
									<div
										key={`table-cell-${row}-${col}`}
										className='table-cell-selector'
										onClick={() =>
											handleInsertTable(
												editor,
												row + 1,
												col + 1,
												setShowTableDropdown
											)
										}
										onMouseDown={(e) => e.preventDefault()}
									/>
								))}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
