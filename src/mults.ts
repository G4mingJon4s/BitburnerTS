import { NS } from "@ns";
import { table } from "./table";

const DEFAULTS = {
	"DaedalusAugsRequirement": {
		value: 30,
		type: "absolute" },
	"StaneksGiftExtraSize": {
		value: 0,
		type: "percentage" },
};

export async function main(ns: NS) {
	const mults = ns.getBitNodeMultipliers();
	const data = Object.entries(mults).filter(entry => {
		const special = Object.keys(DEFAULTS).includes(entry[0]);
		return special ? entry[1] !== DEFAULTS[entry[0] as keyof typeof DEFAULTS] : entry[1] !== 1;
	}).map(entry => {
		const special = Object.keys(DEFAULTS).includes(entry[0]);
		if (!special) return [entry[0], (entry[1] * 100).toFixed(2) + "%"];
		const defaults = DEFAULTS[entry[0] as keyof typeof DEFAULTS];
		return defaults.type === "percentage" ? [entry[0], (entry[1] * 100).toFixed(2) + "%"] : [entry[0], String(entry[1])];
	});
	const head = ["Multiplier", "Value"];

	const tableString = table(head, data);

	ns.tprintf("%s", tableString);
}