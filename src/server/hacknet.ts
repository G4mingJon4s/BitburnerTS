import type { NS } from "@ns";

export const MONEYPERCENTAGE = 0.1;

export async function main(ns: NS) {
	while (true) {
		let money = ns.getPlayer().money * MONEYPERCENTAGE;

		const upgrades = getAllHacknetUpgrades(ns).sort((a, b) => b.gain - a.gain);

		for (const upgrade of upgrades) if (upgrade.cost < money) (!Number.isNaN(money -= upgrade.cost)) && upgrade.action(); // kinda hacky one liner

		await ns.sleep(4 * 1000);
	}
}

export function getAllHacknetUpgrades(ns: NS) {
	const numNodes = ns.hacknet.numNodes();
	const constants = ns.formulas.hacknetServers.constants();
	const nodeMultiplier = ns.getBitNodeMultipliers().HacknetNodeMoney;

	const found: {
		id: number;
		action: () => void;
		cost: number;
		gain: number;
	}[] = [];

	for (let i = 0; i < ns.hacknet.maxNumNodes(); i++) {
		if (i >= numNodes) {
			const gain = ns.formulas.hacknetServers.hashGainRate(1, 0, 1, 1, nodeMultiplier);
			const cost = ns.hacknet.getPurchaseNodeCost();
			found.push({
				id: i,
				action: ns.hacknet.purchaseNode,
				cost,
				gain
			});
			break;
		}

		const stats = ns.hacknet.getNodeStats(i);

		if (stats.level + 1 <= constants.MaxLevel) {
			const gain = ns.formulas.hacknetServers.hashGainRate(stats.level + 1, 0, stats.ram, stats.cores, nodeMultiplier);
			const cost = ns.hacknet.getLevelUpgradeCost(i, 1);
			found.push({
				id: i,
				action: () => ns.hacknet.upgradeLevel(i, 1),
				cost,
				gain
			});
		}

		if (stats.ram * 2 <= constants.MaxRam) {
			const gain = ns.formulas.hacknetServers.hashGainRate(stats.level, 0, stats.ram * 2, stats.cores, nodeMultiplier);
			const cost = ns.hacknet.getRamUpgradeCost(i, 1);
			found.push({
				id: i,
				action: () => ns.hacknet.upgradeRam(i, 1),
				cost,
				gain
			});
		}

		if (stats.cores + 1 <= constants.MaxCores) {
			const gain = ns.formulas.hacknetServers.hashGainRate(stats.level, 0, stats.ram, stats.cores + 1, nodeMultiplier);
			const cost = ns.hacknet.getCoreUpgradeCost(i, 1);
			found.push({
				id: i,
				action: () => ns.hacknet.upgradeCore(i, 1),
				cost,
				gain
			});
		}
	}

	return found;
}