import React from 'react'
import { Select, MenuItem, InputLabel } from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select';
import "@fontsource/quicksand";

interface IProps {
	selected: string;
	setSelected: (name: string) => void;
	names: Array<string>;
}

export function GraphForm(props: IProps): React.ReactElement {

	function onSelectChange(event: SelectChangeEvent) {
		props.setSelected(event.target.value);
	}

	return (
		<>
		<InputLabel id="select-graph-label" sx={{"fontFamily": "Quicksand","fontWeight": 600, "fontSize": 24}}>Graphs</InputLabel>
		<Select
			label="Graphs"
			labelId='select-graph-label'
			value={props.selected}
			onChange={onSelectChange}
			variant="filled"
			sx={{
				"fontFamily": "Quicksand",
				"fontWeight": 600,
				"fontSize": 20
			}}
		>
			{props.names.map((name, i) =>
			<MenuItem
				value={name}
				key={`select-graph-${i}`}
				sx={{
				"fontFamily": "Quicksand",
				"fontWeight": 600
			}}>
				{name}
			</MenuItem>)}
		</Select>

		</>
	)
}
