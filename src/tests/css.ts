import { NS } from "@ns";

export async function main(ns: NS) {
	const html = `
	<html>
		<head>
			<style>
				.wrapper {
					background: white
				}

				.big {
					width: 400px;
					height: 400px;
					background: red;
				}

				.small {
					width: 200px;
					height: 200px;
					background: green;
				}

				.grid {
					display: grid;
					grid-template-columns: 1fr 1fr 1fr;
					grid-template-rows: 1fr 1fr;
				}
			</style>
		</head>
		<body>
			<div class="wrapper">
				<div class="grid">
					<div class="big"></div>
					<div class="small"></div>
					<div class="big"></div>
					<div class="small"></div>
				</div>
			</div>
		</body>
	</html>
	`;

	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	// Document Logic
	const doc = eval("document") as Document;
	const draggables = doc.querySelectorAll(".react-draggable");
	const logWindow = draggables[draggables.length - 1] as HTMLElement;

	const area = logWindow.children[0].children[1] as HTMLElement;
	const clone = area.cloneNode() as HTMLElement;
	clone.id = "graphElement";

	area.style.display = "none";
	area.innerHTML = "";
	clone.innerHTML = html;

	area.insertAdjacentElement("beforebegin", clone);
}