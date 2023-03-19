import { NS } from "@ns";
import { errorBoundry, httpPost } from "/getter";

export const MONITORPLAYERURL = "http://localhost:3000/api/restPlayer/single";

export async function main(ns: NS) {
	ns.tail();

	const multipliers = ns.singularity.getOwnedAugmentations(true).map(s => ns.singularity.getAugmentationStats(s));
	const modified = multipliers.map(m => ({
		...m,
		name: m
	}));

	const object = {
		multipliers: modified
	};

	void errorBoundry(httpPost(MONITORPLAYERURL, JSON.stringify(object)));
}