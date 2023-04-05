/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-fallthrough */
import type { AutocompleteData, NS } from "@ns";
import { time } from "./money";
import { addBorder } from "./table";

export const FILENAME = "network.js";
export const HACKNETREGEX = /^hacknet-server-\d+$/;

export async function main(ns: NS) {
	const mode = ns.args[0] as (string | boolean) ?? false;

	if (typeof mode === "string") {
		ns.scp(FILENAME, mode, "home"); // QoL
		const path = getConnectArray(ns, mode);
		return path.forEach(server => ns.singularity.connect(server));
	}

	const allServers = getAllServers(ns).filter(s => !HACKNETREGEX.test(s));
	
	const hacked = allServers.reduce((acc, server) => acc + Number(hackServer(ns, server)), 0);

	ns.tprint(`Hacked ${hacked} new servers!`);

	if (!mode) return;

	const player = ns.getPlayer();
	let backdoored = 0;

	const sorted = [...allServers.filter(s => ns.hasRootAccess(s) && ns.getServerRequiredHackingLevel(s) < player.skills.hacking && !ns.getServer(s).backdoorInstalled)].map(s => ({
		server: s,
		time: ns.getHackTime(ns.getHostname()) / 4 * 1000
	})).sort((a, b) => a.time - b.time);

	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	for (const object of sorted) {
		const serverObject = ns.getServer(object.server);
		if (serverObject.backdoorInstalled || !serverObject.hasAdminRights || serverObject.requiredHackingSkill > player.skills.hacking) continue;
		
		const path = getConnectArray(ns, object.server);
		path.forEach(server => ns.singularity.connect(server));
		
		display(ns, object, sorted);
		await ns.singularity.installBackdoor();

		backdoored += Number(ns.getServer(object.server).backdoorInstalled);
	}

	ns.singularity.connect("home"); // QoL

	ns.tprint(`Backdoored ${backdoored} new servers!`);
}

export function display(ns: NS, current: { server: string, time: number }, all: { server: string, time: number }[]) {
	const index = all.findIndex(s => s.server === current.server);
	const remaining = all.length - index; // including current
	const totalTime = all.slice(remaining).reduce((acc, cur) => acc + cur.time, 0);

	const remainingString = `Servers remaining: ${remaining}`;
	const timeString = `Estimated time: ${time(totalTime)}`;
	const currentString = `Current server: ${current.server}`;

	ns.clearLog();
	ns.printf("%s", addBorder([remainingString, timeString, currentString]));
}

export function hackServer(ns: NS, server: string) {
	if (ns.hasRootAccess(server)) return false;

	switch (ns.getServerNumPortsRequired(server)) {
	case 5: if (ns.fileExists("SQLInject.exe")) { ns.sqlinject(server); }
	case 4: if (ns.fileExists("HTTPWorm.exe" )) { ns.httpworm(server); }
	case 3: if (ns.fileExists("relaySMTP.exe")) { ns.relaysmtp(server); }
	case 2: if (ns.fileExists("FTPCrack.exe" )) { ns.ftpcrack(server); }
	case 1: if (ns.fileExists("BruteSSH.exe" )) { ns.brutessh(server); }
	default: try { ns.nuke(server); } catch { break; }
	}

	return ns.hasRootAccess(server);
}

export function getConnectArray(ns: NS, targetServerName: string) {
	const allServers = getAllServers(ns);
	const connections = new Map<string, string[]>(allServers.map(server => [server, ns.scan(server)]));
	
	const path = new Array<string>(targetServerName);

	while (path[0] !== "home") {
		const current = path[0];
		const parentElement = Array.from(connections.entries()).find(entry => entry[1].includes(current));
		if (parentElement === undefined) throw new Error(`Could not find parent server of ${current}!`);
		path.unshift(parentElement[0]);
	}

	return path;
}

export function getConnectString(ns: NS, targetServerName: string, currentServerName = ns.singularity.getCurrentServer()) {
	const allServers = getAllServers(ns);
	const connections = new Map<string, string[]>(allServers.map(server => [server, ns.scan(server)]));
	
	const path = new Array<string>(targetServerName);

	while (path[0] !== currentServerName || path[0] !== "home") {
		const current = path[0];
		const parentElement = Array.from(connections.entries()).find(entry => entry[1].includes(current));
		if (parentElement === undefined) throw new Error(`Could not find parent server of ${current}!`);
		path.unshift(parentElement[0]);
	}

	const terminalString = path.reduce((acc, serverName) => {
		if (serverName.toLowerCase() === "home") return acc + "home; ";
		return acc + `connect ${serverName}; `;
	}, "");

	console.log(terminalString);

	return terminalString;
}

export function runCommand(terminalCommand: string, silent = true) {
	const doc = eval("document") as Document;
	const terminalInput = doc.getElementById("terminal-input") as HTMLInputElement;
	if (terminalInput === null) {
		if (silent) return;
		throw new Error("Couldn't find TerminalInput Element");
	}

	terminalInput.value = terminalCommand;

	const handler = Object.keys(terminalInput)[1] as keyof HTMLInputElement;

	const handlerObject = terminalInput[handler] as any;
	handlerObject.onChange({
		target: terminalInput,
	});
	handlerObject.onKeyDown({
		key: "Enter",
		preventDefault: () => null,
	});
}

export function getAllServers(ns: NS) {
	const stack = new Array<string>("home");
	const serverList = new Array<string>();
	while (stack.length > 0) {
		const current = stack.shift();
		if (current === undefined) throw new Error("Current server is undefined!");
		stack.push(...ns.scan(current).filter(serverName => !serverList.includes(serverName)));
		serverList.push(current);
	}
	return serverList;
}

export function autocomplete(data: AutocompleteData, _args: string[]) {
	return [...data.servers, "true", "false"];
}