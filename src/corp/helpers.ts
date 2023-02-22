import { CityName, NS, Office } from "@ns";

// As of V2.1, src: game files
export const materialSizes: Record<EMaterial, number> = {
	Water: 0.05,
	Energy: 0.01,
	Food: 0.03,
	Plants: 0.05,
	Metal: 0.1,
	Hardware: 0.06,
	Chemicals: 0.05,
	Drugs: 0.02,
	Robots: 0.5,
	AICores: 0.1,
	RealEstate: 0.005,
	"Real Estate": 0.005,
	"AI Cores": 0.1,
};

export enum EMaterial {
	Water = "Water",
	Energy = "Energy",
	Food = "Food",
	Plants = "Plants",
	Metal = "Metal",
	Hardware = "Hardware",
	Chemicals = "Chemicals",
	Drugs = "Drugs",
	Robots = "Robots",
	AICores = "AICores",
	RealEstate = "RealEstate",
	"Real Estate" = "Real Estate",
	"AI Cores" = "AI Cores",
}

// As of V2.1, src: game files
export enum EPosition {
	Operations = "Operations",
  Engineer = "Engineer",
  Business = "Business",
  Management = "Management",
  RandD = "Research & Development",
  Training = "Training",
  Unassigned = "Unassigned",
}

export const JOBS = new Map<number, EPosition>([
	[0, EPosition.Operations],
	[1, EPosition.Engineer],
	[2, EPosition.Business],
	[3, EPosition.Management],
	[4, EPosition.RandD],
	[5, EPosition.Training],
	[6, EPosition.Unassigned]
]);

export const DEFAULTJOBS = new Map<EPosition, number>([
	[EPosition.Operations, 2],
	[EPosition.Engineer, 2],
	[EPosition.Business, 1],
	[EPosition.Management, 2],
	[EPosition.RandD, 2],
	[EPosition.Training, 0]
]);

export const JOBCOUNT = 5;

/**
 * Buys the given materials for the given cities of the given divison once.
 * @param materials A Map, where each key is the material name and each value the amount/s to buy
 */
export async function buyMaterials(ns: NS, divisonName: string, cities: CityName[], materials: Map<EMaterial, number>) {
	const corp = ns.corporation;
	const materialNames = Array.from(materials.keys());

	// Get the total storage needed for the materials
	const totalWeight = materialNames.map(material => (materials.get(material) as number) * 10 * materialSizes[material]).reduce((a, b) => a + b);

	// If any city of the divison doesn't have enough storage, throw an error
	if (cities.some(city => corp.getWarehouse(divisonName, city).size - corp.getWarehouse(divisonName, city).sizeUsed < totalWeight)) throw new Error(
		`${String(cities.find(city => corp.getWarehouse(divisonName, city).size - corp.getWarehouse(divisonName, city).sizeUsed < totalWeight))} does not have enough storage to buy all materials!`
	);

	// Get the current stock, used to check for a state change
	const currentStock = corp.getMaterial(divisonName, cities[0], materialNames[0]).qty;

	// Set the buy amounts
	cities.forEach(city => materialNames.forEach(material => corp.buyMaterial(divisonName, city, material, materials.get(material) as number)));

	// Wait, until the materials have been bought
	while (corp.getMaterial(divisonName, cities[0], materialNames[0]).qty === currentStock) await ns.sleep(200);

	// Reset the buy amounts
	cities.forEach(city => materialNames.forEach(material => corp.buyMaterial(divisonName, city, material, 0)));
}

export function newEmployees(ns: NS, divisonName: string, cities: CityName[], count: number) {
	const corp = ns.corporation;

	const funds = corp.getCorporation().funds;

	const costs = cities.map(city => corp.getOfficeSizeUpgradeCost(divisonName, city, count));
	if (costs.reduce((a, b) => a + b) > funds) throw new Error(`Could not create new room for ${count} employees! ${costs.reduce((a, b) => a + b)} > ${funds}`);

	cities.forEach(city => corp.upgradeOfficeSize(divisonName, city, count));
}

export function totalEmployees(ns: NS, divisonName: string, cities: CityName[], size: number) {
	const corp = ns.corporation;

	const funds = corp.getCorporation().funds;

	const costs = cities.map(city => {
		const currentSize = corp.getOffice(divisonName, city).size;
		const needed = size - currentSize;
		if (needed <= 0) return 0;

		return corp.getOfficeSizeUpgradeCost(divisonName, city, needed);
	});
	if (costs.reduce((a, b) => a + b) > funds) throw new Error(`Could not get office to size ${size}! ${costs.reduce((a, b) => a + b)} > ${funds}`);

	cities.map(city => ({
		city,
		needed: size - corp.getOffice(divisonName, city).size
	}))
		.filter(entry => entry.needed <= 0)
		.forEach(entry => corp.upgradeOfficeSize(divisonName, entry.city, entry.needed));
}

export async function recruit(ns: NS, divisonName: string, cities: CityName[]) {
	const corp = ns.corporation;

	for (const city of cities) while (corp.hireEmployee(divisonName, city, EPosition.Unassigned)) await ns.sleep(2);
}

export function assignEven(ns: NS, divisonName: string, cities: CityName[]) {
	const corp = ns.corporation;

	cities.forEach(city => {
		const office = corp.getOffice(divisonName, city);
		Array(JOBCOUNT).fill(0).map((a, i) => String(JOBS.get(i))).forEach(job => corp.setAutoJobAssignment(divisonName, city, job, Math.floor(office.employees / JOBCOUNT)));
	});
}

/**
 * @param threshold e.g. 5 -> 100 on all roles, 500 (100 * 5) on science. -1 sets all to default and everyone to science
 */
export function assignScience(ns: NS, divisonName: string, cities: CityName[], threshold: number) {
	const corp = ns.corporation;

	cities.forEach(city => {
		const office = corp.getOffice(divisonName, city);
		const frag = 1 / (JOBCOUNT - 1 + threshold); // percentage, everyone should get
		Array(JOBCOUNT).fill(0).map((a, i) => String(JOBS.get(i))).filter(job => job !== EPosition.RandD).forEach(job => corp.setAutoJobAssignment(divisonName, city, job, Math.floor(office.employees * frag)));
		corp.setAutoJobAssignment(divisonName, city, EPosition.RandD, Math.floor(office.employees * frag * threshold));
	});
}

export function assignDefault(ns: NS, divisonName: string, cities: CityName[]) {
	const corp = ns.corporation;

	cities.forEach(city => {
		const office = corp.getOffice(divisonName, city);
		Array(JOBCOUNT).fill(0).map((a, i) => JOBS.get(i) as EPosition).forEach(job => corp.setAutoJobAssignment(divisonName, city, String(job), DEFAULTJOBS.get(job) as number));
	});
}

/**
 * @param jobCount Sorted after UI (Ops, Eng, Bus...)
 */
export function assignCustom(ns: NS, divisonName: string, cities: CityName[], jobCount: number[]) {
	const corp = ns.corporation;

	cities.forEach(city => {
		const office = corp.getOffice(divisonName, city);
		jobCount.map((a, i) => JOBS.get(i) as EPosition).forEach((job, i) => corp.setAutoJobAssignment(divisonName, city, String(job), jobCount[i]));
	});
}

export function adVert(ns: NS, divisonName: string, count: number) {
	const corp = ns.corporation;

	Array(count).fill(0).forEach(() => corp.hireAdVert(divisonName));
}

export function warehouseSize(ns: NS, divisonName: string, cities: CityName[], size: number) {
	const corp = ns.corporation;

	const hasStorageResearch = corp.hasResearched(divisonName, "Drones - Transport");
	const upgradeLevel = corp.getUpgradeLevel("Smart Storage");

	const increase = (hasStorageResearch ? 1.5 : 1) * (100 + 10 * upgradeLevel);

	console.log("Size", size);

	console.log("Increase", increase);

	const funds = corp.getCorporation().funds;

	console.log("Funds", funds.toExponential(4));

	const costs = cities.map(city => {
		const currentSize = corp.getWarehouse(divisonName, city).size;
		const needed = size - currentSize;
		if (needed <= 0) return 0;

		const upgradesNeeded = Math.ceil(needed / increase);

		console.log("CITY", city, currentSize, needed, upgradesNeeded, corp.getUpgradeWarehouseCost(divisonName, city, upgradesNeeded));

		return corp.getUpgradeWarehouseCost(divisonName, city, upgradesNeeded);
	});

	console.log("Cost", costs.reduce((a, b) => a +b).toExponential());

	if (costs.reduce((a, b) => a + b) > funds) throw new Error(`Could not get warehouses to size ${size}! ${costs.reduce((a, b) => a + b)} > ${funds}`);

	// TODO: Get it into one loop / remove duplicate code

	cities.forEach(city => {
		const currentSize = corp.getWarehouse(divisonName, city).size;
		const needed = size - currentSize;
		if (needed <= 0) return;

		const upgradesNeeded = Math.ceil(needed / increase);

		corp.upgradeWarehouse(divisonName, city, upgradesNeeded);
	});
}

export function sell(ns: NS, divisonName: string, cities: CityName[], material: string, amount: string, price: string) {
	const corp = ns.corporation;

	cities.forEach(city => corp.sellMaterial(divisonName, city, material, amount, price));
}

export function retrieveOffice(ns: NS, divisonName: string, cities: CityName[], keys: (keyof Office)[]) {
	const corp = ns.corporation;

	const stats = cities.map(city => {
		const office = corp.getOffice(divisonName, city);
		return keys.map(key => office[key]);
	});

	return stats;
}