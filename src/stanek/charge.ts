import { NS } from "@ns";

export async function main(ns: NS) {
	const [rootX, rootY] = ns.args as [number, number];
	await ns.stanek.chargeFragment(rootX, rootY);
}