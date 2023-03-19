import { NS, Server } from "@ns";
import { httpPost } from "/getter";
import { getAllServers } from "/network";

export const MONITORURL = "http://localhost:3000/api/restServer/multiple";

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	while (true) {
		const servers = getAllServers(ns);
		const omittedServers = servers.map(ns.getServer).map(omitServerProperties);

		try {
			await httpPost(MONITORURL, JSON.stringify(omittedServers));
		} catch (e) {
			console.log(e);
		}

		ns.clearLog();
		ns.printf(`Last update: ${new Date().toUTCString()}`);

		await ns.asleep(1000);
	}
}

export function omitServerProperties(obj: Server) {
	const invalid = ["contracts", "messages", "programs", "runningScripts", "scripts", "serversOnNetwork", "textFiles"] as const;

	return Object.fromEntries(Object.entries(obj).filter(pair => !(invalid as unknown as string[]).includes(pair[0]))) as Omit<Server, keyof typeof invalid>;
}