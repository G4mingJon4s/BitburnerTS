import { NS } from "@ns";

const GETTERNAME = "getter.js";

export async function main(ns:NS) {
	ns.disableLog("ALL"); ns.tail();
	await ns.sleep(1000);
	const file = ns.args[0] as string;
	const port = ns.args[1] as number ?? 1;
	const mode = ns.args[2] as boolean ?? false;
	const data = ns.args[3] as string ?? null;

	const handle = ns.getPortHandle(port);

	if (mode) {
		if (data === null) throw new Error("Data is not defined!");
		ns.write(file, data, "w");
		while (!handle.tryWrite(JSON.stringify({ 
			file,
			action: "write",
			data,
		}))) await ns.sleep(100);
		return;
	}

	if (!ns.fileExists(file)) throw new Error("File does not exist!");

	ns.print("GETTING DATA");

	const foundData = ns.read(file);

	while (!handle.tryWrite(JSON.stringify({
		file,
		action: "read",
		data: foundData 
	}))) await ns.sleep(100);

	ns.print(`FINISHED WRITING TO PORT ${port}:\n ${foundData}`);
	ns.closeTail();
}

export function writefile(ns: NS, file: string, server: string, data: string, port = 1, waitingTime = 1000 * 10) {
	interface data {
		file?: string;
		action?: "read" | "write";
		data?: string;
	}

	ns.scp(GETTERNAME, server, "home");
	const getterPID = ns.exec(GETTERNAME, server, 1, file, port, true, data);
	
	const handle = ns.getPortHandle(port);

	const foundData = new Promise<string>((resolve, reject) => {
		function checkData(start: number) {
			if (Date.now() > start + waitingTime) return reject("Time limit exceeded!");
			if (!handle.empty()) {

				const recieved = JSON.parse(String(handle.read())) as data;

				if (recieved.file === file && recieved.action === "write" && recieved.data !== undefined) return resolve(recieved.data);
			}
			if (!ns.isRunning(getterPID) && handle.empty()) return reject("No response from getter!");

			setTimeout(checkData, 100, start);
		}
		checkData(Date.now());
	});

	return foundData;
}

export function readFile(ns:NS, file: string, server: string, port = 1, waitingTime = 1000 * 10) {
	interface data {
		file?: string;
		action?: "read" | "write";
		data?: string;
	}

	ns.scp(GETTERNAME, server, "home");
	const getterPID = ns.exec(GETTERNAME, server, 1, file, port);
	
	const handle = ns.getPortHandle(port);

	const foundData = new Promise<string>((resolve, reject) => {
		function checkData(start: number) {
			if (Date.now() > start + waitingTime) return reject("Time limit exceeded!");
			if (!handle.empty()) {

				const recieved = JSON.parse(String(handle.read())) as data;

				if (recieved.file === file && recieved.action === "read") {
					if (recieved.data === undefined) return reject("Got no data!");
					return resolve(recieved.data);
				}
			}
			if (!ns.isRunning(getterPID) && handle.empty()) return reject("No response from getter!");

			setTimeout(checkData, 100, start);
		}
		checkData(Date.now());
	});

	return foundData;
}

export async function httpPut(url : string | URL, data: string) {
	return await fetch(url, {
		method: "PUT",
		body: data,
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}

export async function httpPost(url: string | URL, data: string) {
	return await fetch(url, {
		method: "POST",
		body: data,
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}

export async function httpGet(url: string | URL) {
	return await fetch(url, {
		method: "GET",
	});
}