import type { NS } from "@ns";
import { addBorder, getBorder, progressBar } from "table";
import { money, time } from "money";

export const skillImportance = [{
	name: "Hands of Midas",
	importance: 0.01
},{
	name: "Overclock",
	importance: 8
},{
	name: "Blade's Intuition",
	importance: 1.5
},{
	name: "Hyperdrive",
	importance: 0.2
}];

export const skillLimit = [{
	name: "Blade's Intuition",
	limit: 150
},{
	name: "Cloak",
	limit: 100
},{
	name: "Short-Circuit",
	limit: 50
},{
	name: "Digital Observer",
	limit: 100
},{
	name: "Tracer",
	limit: 20
},{
	name: "Overclock",
	limit: 90
},{
	name: "Reaper",
	limit: 50
},{
	name: "Evasive System",
	limit: 50
},{
	name: "Datamancer",
	limit: 40
},{
	name: "Cyber's Edge",
	limit: 25
},{
	name: "Hands of Midas",
	limit: 0
},
{ name: "Hyperdrive",
	limit: 50
}];

export const STAGES = [
	{
		name: "Stats",
		action: doIncreasePlayerStats,
	},{
		name: "Violence",
		action: doViolence,
	},{
		name: "Chaos",
		action: doLowerChaos,
	},{
		name: "Action",
		action: doBestAction,
	},{
		name: "Skills",
		action: doBuySkills,
	}
] as const;

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail(); await ns.asleep(1); ns.resizeTail(900, 150);

	if (!ns.bladeburner.joinBladeburnerDivision()) return ns.alert("Cannot join BB!");

	void draw(ns);

	while (true) {
		for (const step of STAGES) await step.action(ns);
		await ns.asleep(0);
	}
}

export const MAXCHAOS = 50;
export const MINCHAOS = 20;

export const CHARISMALIMIT = 5e4; // with charismaEffect => / 2 with each action

export const MINCHANCE = 0.85;
export const OPSCHANCE = 0.95;

export const ACTIONPERROUND = 1;
export const TRAINPERROUND = 4;

export const charismaEffect = (level: number) => (100 - (Math.pow(level, 0.045) + level / 1e3)) / 100;

export const skillScore: (skill: { cost: number }, importance: number) => number = (skill, importance) => skill.cost / importance;
export const minChaos = (ns: NS) => ns.getPlayer().skills.charisma < CHARISMALIMIT ? MINCHAOS : 0;

export const VALIDACTIONS: { type: string; name: string }[] = [{
	name: "Assassination",
	type: "Operations"
},{
	name: "Undercover Operation",
	type: "Operations"
},{
	name: "Investigation",
	type: "Operations"
},{
	name: "Bounty Hunter",
	type: "Contracts"
},{
	name: "Retirement",
	type: "Contracts"
},{
	name: "Tracking",
	type: "Contracts"
}];

export async function doBestAction(ns: NS) {
	Log.setStage("Action");

	await performBladeAction(ns, "General", "Field Analysis", () => !isAccurate(ns));

	for (let i = 0; i < ACTIONPERROUND; i++) {
		const bestAction = getBestAction(ns);

		await performBladeAction(ns, bestAction.type, bestAction.name);
	}
}

export async function doViolence(ns: NS) {
	Log.setStage("Violence");

	const city = ns.bladeburner.getCity();

	const bestAction = getBestAction(ns, true);

	if (ns.bladeburner.getCityChaos(city) >= MAXCHAOS || ns.bladeburner.getActionCountRemaining(bestAction.type, bestAction.name) > 0) return;
	if (ns.getPlayer().skills.charisma < CHARISMALIMIT) return;

	await performBladeAction(ns, "General", "Incite Violence", () => ns.bladeburner.getCityChaos(city) < MAXCHAOS);
}

export async function doIncreasePlayerStats(ns: NS) {
	Log.setStage("Stats");

	if (ns.bladeburner.getStamina()[0] / ns.bladeburner.getStamina()[1] < 0.5) {
		for (let i = 0; i < TRAINPERROUND; i++) await performBladeAction(ns, "General", "Training");

		await performBladeAction(ns, "General", "Hyperbolic Regeneration Chamber", () => ns.bladeburner.getStamina()[0] < ns.bladeburner.getStamina()[1]);
	}

	if (ns.getPlayer().hp.current / 2 < ns.getPlayer().hp.max) await performBladeAction(ns, "General", "Hyperbolic Regeneration Chamber", () => ns.getPlayer().hp.current < ns.getPlayer().hp.max);
}

export async function doLowerChaos(ns: NS) {
	Log.setStage("Chaos");

	const city = ns.bladeburner.getCity();

	if (ns.bladeburner.getCityChaos(city) < MAXCHAOS) return;

	await performBladeAction(ns, "General", "Diplomacy", () => ns.bladeburner.getCityChaos(city) > minChaos(ns));
}

export async function doBuySkills(ns: NS) {
	Log.setStage("Skills");

	for (let up = getBestUpgrade(ns); up !== undefined && up.cost < ns.bladeburner.getSkillPoints(); up = getBestUpgrade(ns)) {
		console.log(`Buying ${up.name} for ${up.cost} points`);

		ns.bladeburner.upgradeSkill(up.name);
		await ns.asleep(2000);
	}
}

export function getBestAction(ns: NS, ignoreCountRemaining = false) {
	for (const action of [...ns.bladeburner.getBlackOpNames().map(n => ({
		name: n,
		type: "BlackOps"
	})), ...VALIDACTIONS]) {
		if (!ignoreCountRemaining && ns.bladeburner.getActionCountRemaining(action.type, action.name) < 1) continue;
		if (action.type === "BlackOps" && ns.bladeburner.getBlackOpRank(action.name) > ns.bladeburner.getRank()) continue;
		if (ns.bladeburner.getActionEstimatedSuccessChance(action.type, action.name)[0] < (action.type === "BlackOps" ? OPSCHANCE : MINCHANCE)) continue;

		return action;
	}

	return {
		name: "Field Analysis",
		type: "General"
	};
}

export function isAccurate(ns: NS) {
	const action = getAvailableBlackOps(ns) ?? "Assassination";
	const type = action === "Assassination" ? "Operation" : "BlackOps";
	const chances = ns.bladeburner.getActionEstimatedSuccessChance(type, action);
	return chances[0] === chances[1];
}

export function getBestUpgrade(ns: NS) {
	const allSkillUpgrades = ns.bladeburner.getSkillNames().map(n => ({
		name: n,
		cost: ns.bladeburner.getSkillUpgradeCost(n)
	})).filter(v => v !== undefined && v.cost !== undefined && ns.bladeburner.getSkillLevel(v.name) < (skillLimit.find(l => l.name === v.name)?.limit ?? Number.MAX_SAFE_INTEGER));

	return allSkillUpgrades.sort((a, b) => {
		const aScore = skillScore(a, skillImportance.find(v => v.name === a.name)?.importance ?? 1);
		const bScore = skillScore(b, skillImportance.find(v => v.name === a.name)?.importance ?? 1);

		if (bScore === aScore) return a.cost - b.cost;
		return aScore - bScore; // lower scores are better
	}).at(0);
}

export function startBladeAction(ns: NS, type: string, name: string) {
	if (!ns.singularity.getOwnedAugmentations().includes("The Blade's Simulacrum") && ns.singularity.isBusy()) ns.singularity.stopAction();

	return ns.bladeburner.startAction(type, name);
}

export async function performBladeAction(ns: NS, type: string, name: string, condition = (start: number, actionTime: number) => start + actionTime > Date.now()) {
	let start = Date.now();

	const actionTime = getActionTime(ns, type, name);

	while(condition(start, actionTime)) {
		await ns.asleep(200);

		if (ns.bladeburner.getActionCountRemaining(type, name) === 0) break; // stop if no contract available
		if (ns.bladeburner.getCurrentAction().name === name) continue;

		startBladeAction(ns, type, name);
		start = Date.now(); // reset, because someone (the player) interfered
	}
}

export function getActionTime(ns: NS, type: string, name: string) {
	const literalTime = ns.bladeburner.getActionTime(type, name);
	const bonus = ns.bladeburner.getBonusTime() > 1000 ? ns.bladeburner.getBonusTime() : 0;
	const timeWithout = Math.max(Math.min(literalTime, literalTime - bonus), 0);
	const timeWith = Math.min(literalTime, bonus);

	return timeWithout + (timeWith / 5) + 1000; // flat increase to allow for the task to finish (desync wise)
}

export function getAvailableBlackOps(ns: NS) {
	const names = ns.bladeburner.getBlackOpNames();

	return names.find(n => ns.bladeburner.getActionCountRemaining("BlackOps", n) > 0);
}

export async function draw(ns: NS) {
	while (true) {
		await ns.asleep(0);
		ns.clearLog();
		ns.printf("%s", Log.getLog(ns));
	}
}

export class Log {
	private static currentStage = "Stats";

	static setStage(string: typeof STAGES[number]["name"]) {
		this.currentStage = string;
	}

	static getLog(ns: NS) {
		const borderString = ` ${getBorder()[1][4]} `;

		const left = STAGES.map(s => (this.currentStage === s.name ? "> " : "- ") + s.name);
		const leftLength = Math.max(...left.map(s => s.length));
		const finalLeft = left.map(s => s.padEnd(leftLength));

		const action = ns.bladeburner.getCurrentAction();
		const actionString = `Current Action: ${action.name.padEnd(13).slice(0, 13)}`;
		const percentage = ns.bladeburner.getActionCurrentTime() / ns.bladeburner.getActionTime(action.type, action.name);
		const barString = progressBar(percentage, actionString.length - 2);
		const timeRemaining = ns.bladeburner.getActionTime(action.type, action.name) - ns.bladeburner.getActionCurrentTime();

		const middle = [actionString, barString, time(timeRemaining)];
		const middleLength = Math.max(...middle.map(s => s.length));
		const finalMiddle = middle.map(s => s.padEnd(middleLength));

		const allOps = ns.bladeburner.getBlackOpNames();
		const current = getAvailableBlackOps(ns) ?? "None";
		const indexFound = allOps.findIndex(o => o === current);
		const index = indexFound === -1 ? allOps.length : indexFound;
		const remaining = allOps.length - index;
		const currentRank = ns.bladeburner.getRank();
		const requiredRank = index === allOps.length ? -1 : ns.bladeburner.getBlackOpRank(current); // should work on its own, desc is lying...
		const chance: [number, number] = requiredRank === -1 ? [1, 1] : ns.bladeburner.getActionEstimatedSuccessChance("BlackOps", current);

		const opNameString = `Current BlackOp: ${current.padStart(Math.max(...allOps.map(s => s.length)))}`;
		const remainingStringRaw = "BlackOps Remaining:";
		const remainingString = remainingStringRaw + `${remaining}`.padStart(opNameString.length - remainingStringRaw.length);
		const rankNeededStringRaw = "Current Rank:";
		const rankNeededString = rankNeededStringRaw + `${money(currentRank, 1)} / ${money(requiredRank, 1)}`.padStart(opNameString.length - rankNeededStringRaw.length);
		const chanceStringRaw = "Current Chance:";
		const chanceString = chanceStringRaw + `${Math.floor(chance[0] * 100)}%`.padStart(opNameString.length - chanceStringRaw.length);

		const right = [opNameString, remainingString, rankNeededString, chanceString];
		const rightLength = Math.max(...right.map(s => s.length));
		const finalRight = right.map(s => s.padEnd(rightLength));

		const rowCount = Math.max(...[finalLeft, finalMiddle, finalRight].map(a => a.length));
		const rows = Array.from({ length: rowCount }, (_, i) => (finalLeft[i] ?? "".padEnd(leftLength)) + borderString + (finalMiddle[i] ?? "".padEnd(middleLength)) + borderString + (finalRight[i] ?? ""));

		return addBorder(rows);
	}
}