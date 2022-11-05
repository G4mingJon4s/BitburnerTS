export function jumpI(input: number[]) {
	const j = jump(input);
	return j > 0 ? 1 : 0;
}

export function jumpII(input: number[]) {
	return jump(input);
}

function jump(arrayData: number[]) {
	const n = arrayData.length;
	let reach = 0;
	let jumps = 0;
	let lastJump = -1;
	while (reach < n - 1) {
		let jumpedFrom = -1;
		for (let i = reach; i > lastJump; i--) {
			if (i + arrayData[i] > reach) {
				reach = i + arrayData[i];
				jumpedFrom = i;
			}
		}
		if (jumpedFrom === -1) {
			jumps = 0;
			break;
		}
		lastJump = jumpedFrom;
		jumps++;
	}
	return jumps;
}
