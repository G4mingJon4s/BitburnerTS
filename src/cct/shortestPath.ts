export function shortestPath(arr: number[][]) {
	const row = arr.length - 1;
	const col = arr[0].length - 1;

	const queue = [{
		x: 0,
		y: 0,
		path: ""
	}];
	const went = [];
	let current = {
		x: 0,
		y: 0,
		path: ""
	};
	while (queue.length > 0) {
		current = queue.shift() as { x: number, y: number, path: string};
		went.push(current);

		if (current.x === col && current.y === row) return current.path;

		let dir = {
			x: 1,
			y: 0
		};
		for (let i = 0; i < 4; i++) {
			const newX = current.x + dir.x;
			const newY = current.y + dir.y;

			if (newX >= 0 && newX <= col && newY >= 0 && newY <= row && arr[newY][newX] === 0 && !went.some((entry) => entry.x === newX && entry.y === newY))
				queue.push({
					x: newX,
					y: newY,
					path: current.path + vecToChar(dir)
				});
			dir = rotateVector90ClockWise(dir);
		}
	}
	return "";
}

function rotateVector90ClockWise({ x, y }: { x: number, y: number }) {
	return {
		x: y * -1,
		y: x
	};
}

function vecToChar(vec: { x: number, y: number }) {
	if (vec.y === -1) return "U";
	if (vec.x === 1) return "R";
	if (vec.y === 1) return "D";
	if (vec.x === -1) return "L";
	return "";
}
