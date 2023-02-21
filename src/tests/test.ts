import { NS } from "@ns";
import { httpPut } from "/getter";

export async function main(ns: NS) {
	await httpPut("http://localhost:3000/api", JSON.stringify(makeGraphData([{
		x: 0,
		y: 1
	}])));
}

type GraphData = {
	graph: string;
	data: {
		id: string;
		data: {
			x: number;
			y: number;
		}[];
	}[]
};

export function makeGraphData(data: { x: number, y: number }[]): GraphData {
	return {
		graph: "stockForecast",
		data: [{
			id: "stockForecast",
			data: data
		}]
	};
}