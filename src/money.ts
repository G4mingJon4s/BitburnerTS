import { NS } from "@ns";
import { table } from "./table";

export async function main(ns: NS) {
	const sources = ns.getMoneySources();

	const install = Object.entries(sources.sinceInstall) as [string, number][];
	const start = Object.entries(sources.sinceStart) as [string, number][];

	const head = ["Source", "Since Install", "Since Bitnode"];
	const data = install
		.map((iPair, i) => [iPair[0], money(iPair[1], 2), money(start[i][1], 2)])
		.filter(entry => entry[1] !== "0" || entry[2] !== "0");

	const tableString = table(head, data);

	ns.tprintf("%s", tableString);
}

export function money(money: number, digits: number) {
	const minus = money < 0;
	if (minus) money *= -1;
	const lookup = [
		{ value: 1,
			symbol: "" },
		{ value: 1_000,
			symbol: "k" },
		{ value: 1_000_000,
			symbol: "m" },
		{ value: 1_000_000_000,
			symbol: "b" },
		{ value: 1_000_000_000_000,
			symbol: "t" },
		{ value: 1_000_000_000_000_000,
			symbol: "q" },
		{ value: 1_000_000_000_000_000_000,
			symbol: "Q" }
	];
	const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
	const item = lookup.slice().reverse().find(function(item) {
		return money >= item.value;
	});
	return (minus ? "-" : "") + (item ? (money / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0");
}