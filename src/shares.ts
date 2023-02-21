import { NS } from "@ns";
import { getAllOwnedStocks } from "./stonks";
import { table } from "./table";

export async function main(ns: NS) {
	const stocks = getAllOwnedStocks(ns);

	const data = ns.stock.getSymbols().map(symbol => {
		const pos = ns.stock.getPosition(symbol);
		return [symbol, stocks.includes(symbol) ? "Yes" : "No", (pos[0] + pos[2]).toString()];
	});

	const string = table(["Stock", "Owned", "Count"], data);

	if (ns.args.length === 0) return ns.tprintf("%s", string);

	for (const line of string.split("\n")) {
		ns.tprintf("%s", line);
		await ns.sleep(30);
	} // fancy
}