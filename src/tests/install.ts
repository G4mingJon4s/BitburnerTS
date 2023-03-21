import { NS } from "@ns";
import { Stock, sellStocks } from "/stonks";
import { getAllServers } from "/network";

export async function main(ns: NS) {
	const sure = await ns.prompt("Do you really want to install? DEPRECATED: BUG FIXED", { type: "boolean" }) as boolean;
	if (!sure) return;

	getAllServers(ns).forEach(s => ns.killall(s, true));

	ns.atExit(() => {
		try { sellStocks(ns, ns.stock.getSymbols().map(s => new Stock(ns, s)), true); } catch { console.error("Could not sell stocks!"); }
	});

	await ns.sleep(1000);

	const moneyToSpend = ns.getPlayer().money;

	const allStocks = ns.stock.getSymbols().map(s => ({
		symbol: s,
		leftOut: Math.max(moneyToSpend - (ns.stock.getMaxShares(s) * ns.stock.getAskPrice(s)), 0) + moneyToSpend % ns.stock.getAskPrice(s)
	})).sort((a, b) => a.leftOut - b.leftOut);

	console.log(allStocks);

	ns.stock.buyStock(allStocks[0].symbol, Math.min(ns.stock.getMaxShares(allStocks[0].symbol), Math.floor(moneyToSpend / ns.stock.getAskPrice(allStocks[0].symbol))));

	await ns.sleep(1000);

	ns.singularity.installAugmentations();
}