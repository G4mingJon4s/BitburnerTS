export function triangle(input: number[][]) {
	function perm(input: number[][], layer = 0, index = 0): number {
		if (layer >= input.length - 1) return input[layer][index];
		const left = perm(input, layer + 1, index);
		const right = perm(input, layer + 1, index + 1);
		const current = input[layer][index];
		return Math.min(left + current, right + current);
	}
	return perm(input);
}
