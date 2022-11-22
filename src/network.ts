/* eslint-disable no-fallthrough */
import { NS } from "@ns";

export async function main(ns: NS) {
	const allowBackdoor = ns.args[0] as boolean ?? false;

	const allServers = getAllServers(ns);
	
	const hacked = allServers.reduce((acc, server) => acc + Number(hackServer(ns, server)), 0);

	ns.tprint(`Hacked ${hacked} new servers!`);

	if (!allowBackdoor) return;

	const player = ns.getPlayer();
	let backdoored = 0;
	for (const server of allServers) {
		const serverObject = ns.getServer(server);
		if (serverObject.backdoorInstalled || !serverObject.hasAdminRights || serverObject.requiredHackingSkill > player.skills.hacking) continue;

		const path = getConnectArray(ns, server);
		path.forEach(server => ns.singularity.connect(server));

		await ns.singularity.installBackdoor();

		backdoored += Number(ns.getServer(server).backdoorInstalled);
	}

	ns.tprint(`Backdoored ${backdoored} new servers!`);
}

export function hackServer(ns: NS, server: string) {
	if (ns.hasRootAccess(server)) return false;

	switch (ns.getServerNumPortsRequired(server)) {
	case 5: if (ns.fileExists("SQLInject.exe")) { ns.sqlinject(server); } else { break; }
	case 4: if (ns.fileExists("HTTPWorm.exe" )) { ns.httpworm(server); } else { break; }
	case 3: if (ns.fileExists("relaySMTP.exe")) { ns.relaysmtp(server); } else { break; }
	case 2: if (ns.fileExists("FTPCrack.exe" )) { ns.ftpcrack(server); } else { break; }
	case 1: if (ns.fileExists("BruteSSH.exe" )) { ns.brutessh(server); } else { break; }
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