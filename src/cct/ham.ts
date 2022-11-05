export function intToHam(int: number) {
	const bin = int
		.toString(2)
		.split("")
		.map((s) => Number(s));

	const code = [0];
	const parries = [];

	for (let i = 1; bin.length > 0; i++) {
		if (Number.isInteger(Math.log2(i))) parries.push(i);
		code.push(Number.isInteger(Math.log2(i)) ? 0 : bin.shift() as number);
	}

	parries.forEach((p) => {
		code[p] = Number(code.map((a, i) => (i & p) > 0).reduce((acc, b, i) => Boolean(Number(b && Boolean(code[i])) ^ Number(acc))));
	});

	code[0] = code.reduce((acc, state) => state ^ acc);

	return code.join("");
}

export function hamToInt(ham: string) {
	const code = ham.split("").map((s) => Number(s));

	console.log("conv:", code);

	if (code.reduce((acc, a) => a ^ acc, 0)) {
		const flippedArray = code.reduce((acc, a, i) => (a ? acc.concat([i]) : acc), new Array<number>());

		console.log("flipArr:", flippedArray);

		const flipped = flippedArray.reduce((a, b) => a ^ b);

		console.log("flip:", flipped);

		code[flipped] = (code[flipped] + 1) % 2;

		console.log("change:", code);
	}

	const bin = code.reduce((acc, a, i) => (i < 1 || Number.isInteger(Math.log2(i)) ? acc : acc.concat([a])), new Array<number>());

	console.log("bin:", bin);

	return Number.parseInt(bin.join(""), 2);
}
