import { AutocompleteData, Multipliers, NS } from "@ns";
import { table } from "/table";

const FLAGS: [string, string | number | boolean][] = [
	["hacking", false],
	["combat", false],
	["misc", false],
	["hacknet", false],
	["rep", false],
	["crime", false],
	["blade", false],
];

export const PREFERENCES = new Map<string, string[]>([
	["hacking", ["hacking", "hacking_exp", "hacking_chance", "hacking_grow", "hacking_money", "hacking_speed"]],
	["combat", 	["agility", "defense", "strength","dexterity", "agility_exp", "defense_exp", "strength_exp","dexterity_exp"]],
	["misc", 		["work_money", "charisma", "charisma_exp"]],
	["hacknet", ["hacknet_node_core_cost", "hacknet_node_level_cost", "hacknet_node_money", "hacknet_node_purchase_cost", "hacknet_node_ram_cost"]],
	["rep", 		["faction_rep", "company_rep"]],
	["crime",		["crime_money", "crime_success"]],
	["blade",		["bladeburner_analysis", "bladeburner_max_stamina", "bladeburner_stamina_gain", "bladeburner_success_chance"]],
]);

export async function main(ns: NS) {
	const data = ns.flags(FLAGS);
	const focus = (Object.entries(data) as [string, boolean][]).filter(a => a[0] !== "_").filter(a => a[1]).map(a => a[0]);

	if (focus.every(a => !a[1])) return ns.alert("Specify a focus! You can specify one with --hacking, --combat or --misc!");

	const all = allAugs(ns, focus).sort((a, b) => ns.singularity.getAugmentationPrice(a) - ns.singularity.getAugmentationPrice(b));

	const final: [string, [string, number][]][] = all.map(aug => [aug, getMults(ns.singularity.getAugmentationStats(aug))]);
	const tableData = final.map(a => a.map(b => {
		if (typeof b === "string") return b;
		return b.map(c => `${c[0]}: ${c[1]}`).join(", ");
	}));

	ns.tprintf("%s", table(["Augment", "Value"], tableData));
}

export function getMults(augMults: Multipliers) {
	const entries = Object.entries(augMults) as [string, number][];
	const different = entries.filter(a => a[1] !== 1);
	return different;
}

export function allAugs(ns: NS, focuses: string[], factions = ns.getPlayer().factions) {
	const focusMults = focuses.flatMap(f => PREFERENCES.get(f));

	const allAugs = factions.flatMap(faction => ns.singularity.getAugmentationsFromFaction(faction));
	const installed = ns.singularity.getOwnedAugmentations(true);
	const possible = allAugs.filter(aug => !installed.includes(aug));
	const withFocus = possible.filter(aug => {
		const stats = ns.singularity.getAugmentationStats(aug);
		const keys = Object.keys(stats).filter(key => stats[key as keyof Multipliers] !== 1);

		console.log("TEST", keys, focusMults, keys.some(key => focusMults.includes(key)));

		return keys.some(key => focusMults.includes(key));
	});

	return Array.from(new Set(withFocus));
}

export const ALLFACTIONS = [
	"Illuminati",
	"Daedalus",
	"The Covenant",
	"ECorp",
	"MegaCorp",
	"Bachman & Associates",
	"Blade Industries",
	"NWO",
	"Clarke Incorporated",
	"OmniTek Incorporated",
	"Four Sigma",
	"KuaiGong International",
	"Fulcrum Secret Technologies",
	"BitRunners",
	"The Black Hand",
	"NiteSec",
	"Aevum",
	"Chongqing",
	"Ishima",
	"New Tokyo",
	"Sector-12",
	"Volhaven",
	"Speakers for the Dead",
	"The Dark Army",
	"The Syndicate",
	"Silhouette",
	"Tetrads",
	"Slum Snakes",
	"Netburners",
	"Tian Di Hui",
	"CyberSec",
	"Bladeburners",
	"Church of the Machine God",
	"Shadows of Anarchy",
];

export function autocomplete(data: AutocompleteData, args: string[]) {
	return [data.flags(FLAGS)];
}