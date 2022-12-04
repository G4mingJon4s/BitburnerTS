// Both grabbed from source. I hate this contract.

export function comprLZDecode(compr: string): string | null {
	let plain = "";

	for (let i = 0; i < compr.length; ) {
		const literalLength = compr.charCodeAt(i) - 0x30;

		if (literalLength < 0 || literalLength > 9 || i + 1 + literalLength > compr.length) return null;

		plain += compr.substring(i + 1, i + 1 + literalLength);
		i += 1 + literalLength;
		if (i >= compr.length) break;

		const backrefLength = compr.charCodeAt(i) - 0x30;

		if (backrefLength < 0 || backrefLength > 9) return null;
		else if (backrefLength === 0) ++i;
		else {
			if (i + 1 >= compr.length) return null;

			const backrefOffset = compr.charCodeAt(i + 1) - 0x30;
			if ((backrefLength > 0 && (backrefOffset < 1 || backrefOffset > 9)) || backrefOffset > plain.length) return null;

			for (let j = 0; j < backrefLength; ++j) plain += plain[plain.length - backrefOffset];

			i += 2;
		}
	}

	return plain;
}

export function comprLZEncode(plain: string): string {
	// for state[i][j]:
	//      if i is 0, we're adding a literal of length j
	//      else, we're adding a backreference of offset i and length j
	let curState: (string | null)[][] = Array.from(Array(10), () => Array<string | null>(10).fill(null));
	let newState: (string | null)[][] = Array.from(Array(10), () => Array<string | null>(10));

	function set(state: (string | null)[][], i: number, j: number, str: string): void {
		const current = state[i][j];
		if (current === null || str.length < current.length) {
			state[i][j] = str;
		} else if (str.length === current.length && Math.random() < 0.5) {
			// if two strings are the same length, pick randomly so that
			// we generate more possible inputs to Compression II
			state[i][j] = str;
		}
	}

	// initial state is a literal of length 1
	curState[0][1] = "";

	for (let i = 1; i < plain.length; ++i) {
		for (const row of newState) {
			row.fill(null);
		}
		const c = plain[i];

		// handle literals
		for (let length = 1; length <= 9; ++length) {
			const string = curState[0][length];
			if (string === null) {
				continue;
			}

			if (length < 9) {
				// extend current literal
				set(newState, 0, length + 1, string);
			} else {
				// start new literal
				set(newState, 0, 1, string + "9" + plain.substring(i - 9, i) + "0");
			}

			for (let offset = 1; offset <= Math.min(9, i); ++offset) {
				if (plain[i - offset] === c) {
					// start new backreference
					set(newState, offset, 1, string + String(length) + plain.substring(i - length, i));
				}
			}
		}

		// handle backreferences
		for (let offset = 1; offset <= 9; ++offset) {
			for (let length = 1; length <= 9; ++length) {
				const string = curState[offset][length];
				if (string === null) {
					continue;
				}

				if (plain[i - offset] === c) {
					if (length < 9) {
						// extend current backreference
						set(newState, offset, length + 1, string);
					} else {
						// start new backreference
						set(newState, offset, 1, string + "9" + String(offset) + "0");
					}
				}

				// start new literal
				set(newState, 0, 1, string + String(length) + String(offset));

				// end current backreference and start new backreference
				for (let newOffset = 1; newOffset <= Math.min(9, i); ++newOffset) {
					if (plain[i - newOffset] === c) {
						set(newState, newOffset, 1, string + String(length) + String(offset) + "0");
					}
				}
			}
		}

		const tmpState = newState;
		newState = curState;
		curState = tmpState;
	}

	let result = null;

	for (let len = 1; len <= 9; ++len) {
		let string = curState[0][len];
		if (string === null) {
			continue;
		}

		string += String(len) + plain.substring(plain.length - len, plain.length);
		if (result === null || string.length < result.length) {
			result = string;
		} else if (string.length === result.length && Math.random() < 0.5) {
			result = string;
		}
	}

	for (let offset = 1; offset <= 9; ++offset) {
		for (let len = 1; len <= 9; ++len) {
			let string = curState[offset][len];
			if (string === null) {
				continue;
			}

			string += String(len) + "" + String(offset);
			if (result === null || string.length < result.length) {
				result = string;
			} else if (string.length === result.length && Math.random() < 0.5) {
				result = string;
			}
		}
	}

	return result ?? "";
}