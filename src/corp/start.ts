import { NS } from "@ns";
import { adVert, assignCustom, buyMaterials, EMaterial, newEmployees, recruit, retrieveOffice, sell, totalEmployees, warehouseSize } from "corp/helpers";

// Names
export const CORPNAME = "G4ming Inc.";
export const AGRICULTURE = "Verdant Robotics";

// Constants
export const CITIES = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
export const AVGSTATS = 99.5;
export const WAITCYLCES = 5;
export const INVESTDELAY = 10_000;

// Settings - I do not recommend to change these, as they are from the guide
export const UPGRADES1 = ["FocusWires", "Neural Accelerators", "Speech Processor Implants", "Nuoptimal Nootropic Injector Implants", "Smart Factories"];
export const MATERIAL1 = new Map<EMaterial, number>([
	[EMaterial.Hardware, 12.5],
	[EMaterial.AICores, 7.5],
	[EMaterial.RealEstate, 2700],
]);

export const UPGRADES2 = ["Smart Factories", "Smart Storage"];
export const MATERIAL2 = new Map<EMaterial, number>([
	[EMaterial.Hardware, 267.5],
	[EMaterial.Robots, 9.6],
	[EMaterial.AICores, 244.5],
	[EMaterial.RealEstate, 11940],
]);

export const MATERIAL3 = new Map<EMaterial, number>([
	[EMaterial.Hardware, 650],
	[EMaterial.Robots, 63],
	[EMaterial.AICores, 375],
	[EMaterial.RealEstate, 8400],
]);

// Order
export const ORDER: ((ns: NS) => Promise<void>)[] = [
	setup,
	buyPhase1,
	awaitStats,
	waitCycles,
	acceptInvestment,
	buyPhase2,
	waitCycles,
	acceptInvestment,
	buyPhase3
];

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	const start = Date.now();
	const steps = ORDER.slice();
	const done = new Map<string, number>(steps.map(step => [step.name, 0]));
	const relative = new Map<string, number>(steps.map(step => [step.name, 0]));

	ns.printf(Array.from(done.entries()).map(entry => entry[0] + " : " + entry[1].toString()).join("\n"));

	while (steps.length > 0) {
		const step = steps.shift();
		if (step === undefined) throw new Error("Could not handle step!");

		console.log(step.name);

		await step(ns);
		const finish = Date.now();
		done.set(step.name, finish);
		relative.set(step.name, finish - start);
		ns.clearLog();
		ns.printf(Array.from(done.entries()).map(entry => entry[0] + " : " + entry[1].toString()).join("\n"));
	}
}

export async function setup(ns: NS) {
	const corp = ns.corporation;

	let didCreate = false;
	try { didCreate = corp.createCorporation(CORPNAME, true); } catch { console.log("ERROR: corp create did not work, you did something wrong?"); }
	try { if (!didCreate) didCreate = corp.createCorporation(CORPNAME, false); } catch { console.log("ERROR: corp create did not work, you did something wrong?"); }
	if (!didCreate) throw new Error(`Could not create a new corporation! ${ns.getPlayer().money > 150e9 ? "You already have one!" : "You do not have enough money!"}`);

	corp.unlockUpgrade("Smart Supply");

	corp.expandIndustry("Agriculture", AGRICULTURE);

	console.log("BONUS TIME", corp.getBonusTime());
	
	CITIES.filter(city => !corp.getDivision(AGRICULTURE).cities.includes(city)).forEach(city => corp.expandCity(AGRICULTURE, city));
	CITIES.filter(city => !corp.hasWarehouse(AGRICULTURE, city)).forEach(city => corp.purchaseWarehouse(AGRICULTURE, city));
	
	await recruit(ns, AGRICULTURE, CITIES);
	assignCustom(ns, AGRICULTURE, CITIES, [1, 1, 1]);

	console.log("BONUS TIME", corp.getBonusTime());

	console.log("AVGS", retrieveOffice(ns, AGRICULTURE, CITIES, ["avgMor", "avgHap", "avgEne"]));
	
	adVert(ns, AGRICULTURE, 1);

	sell(ns, AGRICULTURE, CITIES, "Plants", "MAX", "MP");
	sell(ns, AGRICULTURE, CITIES, "Food", "MAX", "MP");

	warehouseSize(ns, AGRICULTURE, CITIES, 300);
}

export async function buyPhase1(ns: NS) {
	const corp = ns.corporation;

	UPGRADES1.forEach(upgrade => corp.levelUpgrade(upgrade));
	UPGRADES1.forEach(upgrade => corp.levelUpgrade(upgrade));

	await buyMaterials(ns, AGRICULTURE, CITIES, MATERIAL1);
}

export async function awaitStats(ns: NS) {
	const corp = ns.corporation;

	while (true) {
		await ns.sleep(1000);

		const averages = retrieveOffice(ns, AGRICULTURE, CITIES, ["avgMor", "avgHap", "avgEne"]) as number[][];

		console.log(averages, "SHOULD BREAK:", !averages.some(average => average.some(v => v < AVGSTATS)));

		if (!averages.some(average => average.some(v => v < AVGSTATS))) break;

		// Maybe optimize a bit more ?!
		if (corp.getCorporation().funds < (35e6 * corp.getDivision(AGRICULTURE).cities.length)) continue;
		CITIES.forEach(city => corp.buyCoffee(AGRICULTURE, city));
		CITIES.forEach(city => corp.throwParty(AGRICULTURE, city, 30e6 / (corp.getOffice(AGRICULTURE, city).employees)));
	}
}

export async function waitCycles(ns: NS) {
	const corp = ns.corporation;

	for (let i = 0; i < WAITCYLCES; i++) {
		while (corp.getCorporation().state !== "START") await ns.sleep(100);
		while (corp.getCorporation().state === "START") await ns.sleep(100);
	}
}

export async function acceptInvestment(ns: NS) {
	const corp = ns.corporation;

	await ns.sleep(INVESTDELAY);

	corp.acceptInvestmentOffer();
}

export async function buyPhase2(ns: NS) {
	const corp = ns.corporation;

	totalEmployees(ns, AGRICULTURE, CITIES, 9);
	await recruit(ns, AGRICULTURE, CITIES);
	assignCustom(ns, AGRICULTURE, CITIES, [3, 2, 2, 2]);

	for (let i = 0; i < 9; i++) UPGRADES2.forEach(upgrade => corp.levelUpgrade(upgrade));

	warehouseSize(ns, AGRICULTURE, CITIES, 2000);

	await buyMaterials(ns, AGRICULTURE, CITIES, MATERIAL2);
}

export async function buyPhase3(ns: NS) {
	const corp = ns.corporation;

	warehouseSize(ns, AGRICULTURE, CITIES, 3800);

	await buyMaterials(ns, AGRICULTURE, CITIES, MATERIAL3);
}