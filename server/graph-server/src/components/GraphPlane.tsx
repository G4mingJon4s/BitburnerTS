import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line';
import React from 'react'

interface IProps {
	graphProps: any;
}

export function GraphPlane(props: IProps): React.ReactElement {
	const graph = props.graphProps;
	const type = graph.graphType;
	graph.theme ??= {};
	graph.theme["fontFamily"] ??= "Quicksand";
	graph.theme["fontSize"] ??= 18;
	const copied = {...graph};
	delete copied.graphType;
	return (
		<>
			{type === "pie" && <ResponsivePie {...graph} />}
			{type === "line" && <ResponsiveLine {...graph} />}
		</>
	)
}
