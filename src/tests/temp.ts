import { NS } from "@ns";
import { httpGet, httpPut } from "getter";

export async function main(ns: NS) {
	ns.closeTail();
	ns.disableLog("ALL"); ns.tail();

	// Document Logic
	const doc = eval("document") as Document;
	const draggables = doc.querySelectorAll(".react-draggable");
	const logWindow = draggables[draggables.length - 1] as HTMLElement;

	// Switch Button Logic
	let switchGraph = false;

	const killButton = logWindow.querySelector("button");
	if (killButton === null) throw new Error("Sad");

	const switchButton = killButton.cloneNode() as HTMLButtonElement;
	switchButton.innerText = "Switch";
	switchButton.addEventListener("click", () => switchGraph = true);

	killButton.insertAdjacentElement("beforebegin", switchButton);

	// Log area replacement
	const area = logWindow.children[0].children[1] as HTMLElement;
	const clone = area.cloneNode() as HTMLElement;
	clone.id = "graphElement";

	area.style.display = "none";
	const myHTML = "<iframe src=\"http://localhost:3000\" frameborder=\"0\" style=\"width: 100%; height: 100%;\"></iframe>";
	clone.innerHTML = myHTML;

	area.insertAdjacentElement("beforebegin", clone);

	// Page resizing
	const totalArea = logWindow.querySelector(".react-resizable") as HTMLElement;
	if (totalArea === null) throw new Error("Sad");
	
	totalArea.style.width = "1200px";
	totalArea.style.height = "650px";

	// Any removal on exit
	ns.atExit(() => ns.closeTail());

	await ns.sleep(1000);

	// tick loop
	while(true) {
		if (!doc.body.contains(logWindow)) return ns.exit();
		if (switchGraph) {
			switchGraph = false;

			logWindow.style.display = "none";

			const getRes = await httpGet("http://localhost:3000/graphs");
			const graphData = JSON.parse(await getRes.json() as string) as Record<string, object>;
			const graphNames = Object.keys(graphData);

			const graph = await ns.prompt("Select a graph!", {
				type: "select",
				choices: graphNames
			}) as string;

			logWindow.style.display = "flex";
			clone.innerHTML = myHTML;

			const res = await httpPut("http://localhost:3000/graphs", JSON.stringify({
				graph,
				data: { sample: "object" }
			}));

			console.log(res.status);
		}
		await ns.sleep(200);
	}
}