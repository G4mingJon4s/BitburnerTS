export function sumPathsI([x, y]: number[]) {
	const val = fact(x + y - 2);
	return val / (fact(x - 1) * fact(y - 1));
}

export function fact(n: number): number {
	if (n < 2) return 1;
	return n * fact(n - 1);
}

export function sumPathsII(input: number[][]) {
	const pos = {
		x: 0,
		y: 0,
	};

	function perm(pos: { x: number, y: number }, grid: number[][], paths = 0): number {
		if (pos.x === grid[pos.y].length - 1 && pos.y === grid.length - 1) return 1;
		if (canMoveRight(pos, grid))
			paths += perm(
				{
					x: pos.x + 1,
					y: pos.y,
				},
				grid
			);
		if (canMoveDown(pos, grid))
			paths += perm(
				{
					x: pos.x,
					y: pos.y + 1,
				},
				grid
			);
		return paths;
	}
	const paths = perm(pos, input);
	return paths;
}

function canMoveRight(pos: { x: number, y: number }, grid: number[][]) {
	const colM = grid[pos.y].length - 1;
	if (pos.x + 1 > colM) return false;
	const right = grid[pos.y][pos.x + 1];
	return right === 0;
}

function canMoveDown(pos: { x: number, y: number }, grid: number[][]) {
	const rowM = grid.length - 1;
	if (pos.y + 1 > rowM) return false;
	const down = grid[pos.y + 1][pos.x];
	return down === 0;
}