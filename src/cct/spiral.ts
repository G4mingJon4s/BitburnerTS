export function spiral(input: number[][]) {
	const length = input.reduce((acc, arr) => acc.concat(arr), []).length;
	const row = input.length - 1;
	const col = input[0].length - 1;

	const pos = {
		x: 0,
		y: 0
	};
	const dir = {
		x: 1,
		y: 0
	};
	const prev = [];
	const result: number[] = [];
	while (result.length < length) {
		result.push(getValue(input, pos));
		prev.push({ ...pos });
		changePos(pos, dir, prev, col, row);
	}
	return result;
}

function getValue(input: number[][], pos: { x: number, y: number }) {
	return input[pos.y][pos.x];
}

function changePos(pos: { x: number, y: number }, dir: { x: number, y: number }, prev: { x: number, y: number }[], col: number, row: number) {
	if (!canMoveTo(pos, dir, prev, col, row)) {
		const temp = rotateVector90ClockWise(dir);
		dir.x = temp.x;
		dir.y = temp.y;
	}
	pos.x += dir.x;
	pos.y += dir.y;
}

function canMoveTo(pos: { x: number, y: number }, dir: { x: number, y: number }, prev: { x: number, y: number }[], col: number, row: number) {
	return (
		pos.x + dir.x <= col &&
		pos.x + dir.x >= 0 &&
		pos.y + dir.y <= row &&
		pos.y + dir.y >= 0 &&
		!prev.some((p) => p.x === pos.x + dir.x && p.y === pos.y + dir.y)
	);
}

function rotateVector90ClockWise({ x, y }: { x: number, y: number }) {
	return {
		x: y * -1,
		y: x
	};
}
