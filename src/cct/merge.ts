/**@param {number[][]} arr */
export async function mergeOverlap(arr: number[][]) {
	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

	while (true) {
		let merged = false;
		for (let i = 0; i < arr.length; i++) {
			for (let j = 0; j < arr.length; j++) {
				if (i === j) continue;
				if (!hasOverlap(arr[i], arr[j])) continue;
				const jValue = arr[j];
				const newEntry = merge(arr[i], jValue);
				arr.splice(i, 1);
				arr.splice(arr.indexOf(jValue), 1);
				arr.push(newEntry);
				merged = true;
				break;
			}
			if (merged) break;
		}
		if (!merged) break;
		await sleep(10);
	}
	return arr.sort((a, b) => a[0] - b[0]);
}

function hasOverlap(a: number[], b: number[]) {
	if (a[0] === b[0] || a[1] === b[1]) return true;
	return a[0] < b[0] ? b[0] <= a[1] : a[0] <= b[1];
}

function merge(a: number[], b: number[]) {
	return [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
}
