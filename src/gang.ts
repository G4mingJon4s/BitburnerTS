import { AutocompleteData, GangMemberAscension, GangOtherInfo, NS } from "@ns";
import { readFile } from "getter";

const NAMEFILE = "gangNames.txt";
const LOGGING = true;
const SHOWCLASHONHOCK = true;
const MINCLASHCHANCE = 0.6;

const ALLTASKS = [
	"Mug People",
	"Deal Drugs",
	"Strongarm Civilians",
	"Run a Con",
	"Armed Robbery",
	"Traffick Illegal Arms",
	"Threaten & Blackmail",
	"Human Trafficking",
	"Terrorism"
];

const FLAGS: [string, string | number | boolean][] = [
	["money", false],
	["noBuy", false],
];

export async function main(ns:NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	const data = ns.flags(FLAGS);
	const noBuy = data["noBuy"] as boolean;
	const focusMoney = data["noBuy"] as boolean;

	const doc = eval("document") as Document;
	const hook0 = doc.getElementById("overview-extra-hook-0");
	if (hook0 === null) throw new Error("no hook");

	if (SHOWCLASHONHOCK) ns.atExit(() => hook0.innerText = "");

	const allNames = JSON.parse(await readFile(ns, NAMEFILE, "home")) as string[];

	if (LOGGING) ns.print(`Found ${allNames.length} names.${allNames.length < 12 ? ` Missing ${12 - allNames.length} names!` : ""}`);

	if (allNames.length < 12) return;

	ns.print("Syncing with territory warfare!");

	while (!await tickSync(ns)) ns.print("Could not tickSync!");
	let warfareTick = ns.getTimeSinceLastAug();
	let checkBack = ns.gang.getBonusTime() > 100 ? 800 : 20000;

	while (true) {
		recruitMember(ns, allNames);

		const members = ns.gang.getMemberNames();
		const gangInfo = ns.gang.getGangInformation();

		members.forEach(member => ascendMember(ns, member));

		if (!noBuy) buyEquipments(ns, members, ns.getPlayer().money * 0.8, getDiscount(ns) > 0.3);
		
		if (gangInfo.territory < 1 && warfareTick + checkBack < ns.getTimeSinceLastAug() + 500) {
			if (SHOWCLASHONHOCK) hook0.innerText = "Gang clash now ";
			
			const clashAllowed = canClash(ns);
			ns.gang.setTerritoryWarfare(clashAllowed);
			if (LOGGING && clashAllowed) ns.print("Engaging in warfare!");
			
			members.filter(member => !clashAllowed || ns.gang.getMemberInformation(member).def >= 600).forEach(member => ns.gang.setMemberTask(member, "Territory Warfare"));
			
			while (!await tickSync(ns)) ns.print("Could not tickSync!");
			warfareTick = ns.getTimeSinceLastAug();
			checkBack = ns.gang.getBonusTime() > 100 ? 800 : 20000;
			
			ns.gang.setTerritoryWarfare(false);
		}

		members.forEach(member => assignTask(ns, member, focusMoney));

		if (LOGGING) displayPresence(ns);
		if (gangInfo.territory < 1 && SHOWCLASHONHOCK) hook0.innerText = `Gang clash in ${((warfareTick + checkBack - ns.getTimeSinceLastAug()) / 1000).toFixed(1)}s `;
		if (gangInfo.territory === 1 && hook0.innerText !== "" && SHOWCLASHONHOCK) hook0.innerText = "";
		
		await ns.sleep(500);
	}
}

export function canClash(ns: NS) {
	const otherGangs = Object.entries(ns.gang.getOtherGangInformation());
	const wins = otherGangs.filter(pair => pair[1].territory > 0 && pair[0] !== ns.gang.getGangInformation().faction).map(pair => Number(ns.gang.getChanceToWinClash(pair[0]) > MINCLASHCHANCE ? 1 : -1)).reduce((a, b) => a + b);
	return wins > 0;
}

export function ascendMember(ns: NS, member: string) {
	const importantStats: (keyof GangMemberAscension)[] = ["agi", "str", "dex", "def"];

	const respect = ns.gang.getMemberInformation(member).earnedRespect;
	const gangRespect = ns.gang.getGangInformation().respect;
	const ratio = respect / gangRespect;
	if (ratio > 1 / 10 || ns.gang.getMemberNames().length !== 12) return false;
	
	const threshold = calculateAscendTreshold(ns, member);
	
	const ascension = ns.gang.getAscensionResult(member);
	if (ascension === undefined) return false;
	
	if (importantStats.some(stat => ascension[stat] >= threshold)) {
		ns.gang.ascendMember(member);
		if (LOGGING) ns.print(`Ascending ${member}!`);
		return true;
	}
	return false;
}

export function recruitMember(ns: NS, allNames: string[]) {
	while (ns.gang.canRecruitMember()) {
		const members = ns.gang.getMemberNames();
		const possible = allNames.filter(name => !members.includes(name));
		const name = possible[Math.floor(Math.random() * possible.length)];
		if (LOGGING) ns.print(`Recruiting ${name}!`);
		ns.gang.recruitMember(name);
	}
}

export function assignTask(ns: NS, member: string, forceMoney = false) {
	const gangInfo = ns.gang.getGangInformation();
	const memberInfo = ns.gang.getMemberInformation(member);
	const fromWarfare = memberInfo.task === "Territory Warfare";
	const money = forceMoney || (ns.gang.getMemberNames().length === 12 && ns.singularity.getFactionRep(gangInfo.faction) > 2e6);
	const applicableTasks = [];
	for (const taskName of ALLTASKS) {
		const taskStats = ns.gang.getTaskStats(taskName);
		const moneyGain = ns.formulas.gang.moneyGain(gangInfo, memberInfo, taskStats);
		const respectGain = ns.formulas.gang.respectGain(gangInfo, memberInfo, taskStats);
		const wantedGain = ns.formulas.gang.wantedLevelGain(gangInfo, memberInfo, taskStats);

		if (money && moneyGain <= 0) continue;
		if (!money && respectGain <= 0) continue;
		if (wantedGain > respectGain / 2) continue;
		applicableTasks.push({
			taskName,
			moneyGain,
			respectGain,
			wantedGain
		});
	}

	if (applicableTasks.length > 1) {
		const sort = money ? "moneyGain" : "respectGain";
		applicableTasks.sort((a, b) => b[sort] - a[sort]);
	}

	if (applicableTasks.length === 0 || (memberInfo.str + memberInfo.def + memberInfo.agi + memberInfo.dex + memberInfo.hack) < 200) applicableTasks.unshift({
		taskName: "Train Combat",
		moneyGain: 0,
		respectGain: 0,
		wantedGain: 0,
	});

	if (memberInfo.task === applicableTasks[0].taskName) return;

	if (LOGGING && !fromWarfare) ns.print(`Assigning ${member} to ${applicableTasks[0].taskName}`);

	ns.gang.setMemberTask(member, applicableTasks[0].taskName);
}

export function isNewTick(ns: NS, oldInfo: GangOtherInfo) {
	const ownGangInfo = ns.gang.getGangInformation();
	const old = Object.entries(oldInfo);
	const current = Object.entries(ns.gang.getOtherGangInformation());
	return current.some((entry, i) => {
		if (entry[0] === ownGangInfo.faction) return false;
		const oldObject = old[i][1];
		const currentObject = entry[1];
		return currentObject.power !== oldObject.power || currentObject.territory !== oldObject.territory;
	});
}

export async function tickSync(ns: NS) {
	const oldData = ns.gang.getOtherGangInformation();
	const start = Date.now();
	const maxTime = 21000;

	while (!isNewTick(ns, oldData)) {
		if (Date.now() > start + maxTime) return false;
		await ns.sleep(10);
	}

	return true;
}

export function buyEquipments(ns: NS, members: string[], money: number, allowAugs: boolean) {
	let budget = Math.min(money, ns.getPlayer().money);

	const allEquipments = ns.gang.getEquipmentNames();
	const missingEquipments = members.reduce((acc, member) => {
		const info = ns.gang.getMemberInformation(member);
		const equipments = info.upgrades.concat(info.augmentations);
		const missing = allEquipments.filter(equipment => !equipments.includes(equipment));
		return acc.set(member, missing);
	}, new Map<string, string[]>());

	for (const member of members) {
		const missing = missingEquipments.get(member);
		if (missing === undefined) continue;

		missing.sort((a, b) => ns.gang.getEquipmentCost(a) - ns.gang.getEquipmentCost(b));
		const cheapest = missing.find(equipment => allowAugs || ns.gang.getEquipmentType(equipment) !== "Augmentation");
		if (cheapest === undefined) continue;

		const price = ns.gang.getEquipmentCost(cheapest);
		if (price > budget) continue;

		const success = ns.gang.purchaseEquipment(member, cheapest);
		if (!success) continue;

		budget -= price;
		if (LOGGING) ns.print(`Buying ${member} ${cheapest}!`);
	}
}

export function displayPresence(ns: NS) {
	const display = (num: number) => `Checking Gang (${num})`;
	const displayRegex = /^Checking Gang \((\d+)\)$/;

	const extractNum = (displayString: string) => {
		const possible = displayString.match(displayRegex);
		if (possible === null || possible.length < 2) return 1;
		return Number(possible[1]);
	};
	const removeDisplay = (log: string[]) => log.filter(entry => entry.match(displayRegex) === null);
	const findDisplay = (log: string[]) => log.find(entry => entry.match(displayRegex) !== null);

	const log = ns.getScriptLogs().reverse();

	const lastDisplay = findDisplay(log);
	if (lastDisplay === undefined) return ns.print(display(1));

	const num = extractNum(lastDisplay) + 1;
	const refinedLog = removeDisplay(log);
	refinedLog.unshift(display(num));

	ns.clearLog();
	refinedLog.reverse().forEach(entry => ns.print(entry));
}

export function getDiscount(ns: NS) {
	const defaultPrice = 12e6;
	return 1 - ns.gang.getEquipmentCost("Katana") / defaultPrice;
}

export function calculateAscendTreshold(ns: NS, member: string) {
	const mult = ns.gang.getMemberInformation(member)["str_asc_mult"];
	if (mult < 1.632) return 1.6326;
	if (mult < 2.336) return 1.4315;
	if (mult < 2.999) return 1.284;
	if (mult < 3.363) return 1.2125;
	if (mult < 4.253) return 1.1698;
	if (mult < 4.860) return 1.1428;
	if (mult < 5.455) return 1.1225;
	if (mult < 5.977) return 1.0957;
	if (mult < 6.496) return 1.0869;
	if (mult < 7.008) return 1.0789;
	if (mult < 7.519) return 1.073;
	if (mult < 8.025) return 1.0673;
	if (mult < 8.513) return 1.0631;

	return 1.0591;
}

export function autocomplete(data: AutocompleteData, args: string[]) {
	return [data.flags(FLAGS), "true", "false"];
}