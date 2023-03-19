import { NS } from "@ns";

export async function main(ns: NS) {
	ns.tprint(ns.singularity.getOwnedAugmentations(Boolean(ns.args[0]) ?? false).length);
}