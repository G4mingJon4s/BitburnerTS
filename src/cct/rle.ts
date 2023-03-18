export function RLEEncode(string: string) {
	const arr = string.split("");
	let out = "";

	let count = 0;
	let char = arr[0];
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] !== char || count >= 9) {
			out += count;
			out += char;
			char = arr[i];
			count = 1;

			if (i + 1 >= arr.length) {
				out += count;
				out += char;
				break;
			}

			continue;
		}
		if (i + 1 >= arr.length) {
			out += count + 1;
			out += char;
			break;
		}
		count++;
	}
	return out;
}
