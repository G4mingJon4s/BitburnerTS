import { NS } from "@ns";

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.tail();

	const doc = eval("document") as Document;
	const draggables = doc.querySelectorAll(".react-draggable");
	const logWindow = draggables[draggables.length - 1]; // Reference to the full log window, not just the log area. Needed because the buttons aren't in the log area.

	let paused = false;

	const killButton = logWindow.querySelector("button");
	if (killButton === null) throw new Error("What?");

	const pauseButton = killButton.cloneNode() as HTMLElement; //copies the kill button for styling purposes
	if (pauseButton === null) throw new Error("What?");

	pauseButton.addEventListener("click", () => {
		paused = !paused;
		pauseButton.innerText = paused ? "Unpause" : "Pause";
		ns.print(paused ? "Script is now paused" : "Script is now unpaused");
	});

	pauseButton.innerText = "Pause";
	killButton.insertAdjacentElement("beforebegin", pauseButton);
  
	while(true) await ns.asleep(1000);
}
