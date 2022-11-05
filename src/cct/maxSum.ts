export function maxSum(input: number[]) {
	let bSum = input[0];
	for (let i = 0; i < input.length; i++) {
		for (let j = i + 1; j <= input.length; j++) {
			const arr = input.slice(i, j);
			const sum = arr.reduce((a, b) => a + b);
			bSum = Math.max(bSum, sum);
		}
	}
	return bSum;
}
