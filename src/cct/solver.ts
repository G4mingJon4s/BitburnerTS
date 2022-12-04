import { NS } from "@ns";

import { intToHam, hamToInt } from "cct/ham";
import { generateIPs } from "cct/ip";
import { maxSum } from "cct/maxSum";
import { traderI, traderII, traderIII, traderIV } from "cct/trader";
import { mergeOverlap } from "cct/merge";
import { sumPathsI, sumPathsII } from "cct/uniquePaths";
import { triangle } from "cct/triangle";
import { spiral } from "cct/spiral";
import { RLEEncode } from "cct/rle";
import { findFactor } from "cct/prim";
import { strToSalad } from "cct/caesar";
import { jumpI, jumpII } from "cct/jump";
import { shortestPath } from "cct/shortestPath";
import { distilVinegar } from "cct/vinegar";
import { totalSum, totalSumII } from "cct/totalSum";

import { getAllServers } from "/network";

export const availableSolvers = {
	"Compression I: RLE Compression": RLEEncode,
	"Algorithmic Stock Trader I": traderI,
	"Algorithmic Stock Trader II": traderII,
	"Algorithmic Stock Trader III": traderIII,
	"Algorithmic Stock Trader IV": traderIV,
	"Minimum Path Sum in a Triangle": triangle,
	"Find Largest Prime Factor": findFactor,
	"Spiralize Matrix": spiral,
	"Unique Paths in a Grid I": sumPathsI,
	"Unique Paths in a Grid II": sumPathsII,
	"Generate IP Addresses": generateIPs,
	"Merge Overlapping Intervals": mergeOverlap,
	"Subarray with Maximum Sum": maxSum,
	"HammingCodes: Integer to Encoded Binary": intToHam,
	"HammingCodes: Encoded Binary to Integer": hamToInt,
	"Encryption I: Caesar Cipher": strToSalad,
	"Array Jumping Game": jumpI,
	"Array Jumping Game II": jumpII,
	"Shortest Path in a Grid": shortestPath,
	"Encryption II: Vigenère Cipher": distilVinegar,
	"Total Ways to Sum": totalSum,
	"Total Ways to Sum II": totalSumII,
};

export const CONTRACTFILES = {
	error: "contractError.txt",
	missing: "contractMissing.txt",
	finished: "contractFinished.txt",
};
export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail(); ns.resizeTail(2500, 1000); ns.moveTail(10, 10);
	await ns.sleep(100);

	const allServers = getAllServers(ns);
	const list = getAllContracts(ns, allServers);

	const contracts = list
		.map((entry) => entry.contracts.map((name) => ({ name,
			server: entry.name })))
		.reduce((acc, current) => acc.concat(current), []);

	const contractsData: IContract[] = contracts.map((contract) => ({
		name: contract.name,
		server: contract.server,
		type: ns.codingcontract.getContractType(contract.name, contract.server) as keyof typeof availableSolvers,
		input: ns.codingcontract.getData(contract.name, contract.server) as never,
		answer: undefined as never,
		failure: "",
	}));

	ns.print(`INFO: Found ${contractsData.length} contracts.`);

	for (const contract of contractsData) {
		try {
			contract.answer = await solveContract(ns, contract) as never;
		} catch {
			contract.answer = undefined as never;
			contract.failure = "tryCatch";
			await addError(ns, contract);
		}

		if (contract.answer === undefined || !canDoContract(ns, contract)) continue;

		const result = ns.codingcontract.attempt(contract.answer, contract.name, contract.server);

		if (result) {
			ns.print(`SUCCESS! ${result}`);
			await addFinished(ns, contract);
		} else {
			ns.print(`ERROR! Removing ${contract.type}`);
			contract.failure = "value";
			await addError(ns, contract);
		}
		await ns.sleep(1000);
	}
}

export function getAllContracts(ns: NS, servers: string[]) {
	return servers.map(server => ({
		name: server,
		contracts: ns.ls(server, ".cct")
	}));
}

export async function solveContract(ns: NS, { input, type }: IContract) {
	const answer = await availableSolvers[type]?.(input);
	if (typeof answer === "undefined") await addMissing(ns, { type });
	return answer;
}

/** @param {import('../NetscriptDefinitions').NS} ns */
export function canDoContract(ns: NS, { type }: IContract) {
	const data = JSON.parse(ns.read(CONTRACTFILES.error)) as { type: keyof typeof availableSolvers }[];
	return !data.some((error) => error.type === type);
}

/** @param {import('../NetscriptDefinitions').NS} ns */
export async function addError(ns: NS, contract: IContract) {
	const data = JSON.parse(ns.read(CONTRACTFILES.error)) as IContract[];
	data.push(contract);
	ns.write(CONTRACTFILES.error, JSON.stringify(data), "w");
}

/** @param {import('../NetscriptDefinitions').NS} ns */
export async function addFinished(ns: NS, { type, input, answer }: IContract) {
	const data = JSON.parse(ns.read(CONTRACTFILES.finished)) as Record<keyof typeof availableSolvers, { input: never, output: never }[]>;
	if (!data[type]) data[type] = [];
	data[type].push({
		input,
		output: answer
	});
	ns.write(CONTRACTFILES.finished, JSON.stringify(data), "w");
}

/** @param {import('../NetscriptDefinitions').NS} ns */
export async function addMissing(ns: NS, { type }: { type: keyof typeof availableSolvers }) {
	const data = JSON.parse(ns.read(CONTRACTFILES.missing)) as (keyof typeof availableSolvers)[]; // act. not, but it works, so idc
	if (data.includes(type)) return;
	data.push(type);
	ns.write(CONTRACTFILES.missing, JSON.stringify(data), "w");
}

interface IContract {
	name: string,
	server: string,
	type: keyof typeof availableSolvers,
	input: never,
	answer: never,
	failure: string,
}
