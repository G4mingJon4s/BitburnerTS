import { NS } from "@ns";

export async function main(ns: NS) {
	for (let i = 0; i < 50; i++) {
		ns.tprint(Date.now() - ns.getTimeSinceLastAug());
	}
}