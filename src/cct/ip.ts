export function generateIPs(string: string) {
	const digits = string.split("");
	const maxDots = 3;
	const dot = ".";

	const possible = [];

	for (let i = 0; i < digits.length; i++) {
		for (let j = i + 1; j < digits.length + 1; j++) {
			for (let k = j + 1; k < digits.length + 2; k++) {
				const copy = digits.slice();
				copy.splice(i, 0, dot);
				copy.splice(j, 0, dot);
				copy.splice(k, 0, dot);
				possible.push(copy.join(""));
			}
		}
	}

	const valid = possible.filter((s) => {
		const arr = s.split("");
		let isInvalid = false;
		let count = 0;
		for (let i = 0; i < arr.length; ) {
			const char = arr[i];
			if (char === dot && arr[i + 1] === dot) {
				isInvalid = true;
				break;
			}
			if (char === dot) {
				count++;
				if (count > maxDots || i === 0) {
					isInvalid = true;
					break;
				}
				i++;
				continue;
			}
			const numbers = [char];
			i++;
			while (i < arr.length && arr[i] !== dot) {
				numbers.push(arr[i]);
				i++;
			}
			const number = parseInt(numbers.join(""));
			if (isNaN(number) || number > 255 || numbers.length > 3 || (numbers[0] === "0" && numbers.length > 1)) {
				isInvalid = true;
				break;
			}
		}
		return !isInvalid;
	});
	return valid;
}
