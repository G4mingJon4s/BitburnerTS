const minRemovedCount = Number.MAX_SAFE_INTEGER;

// CCT generated using ChartGPT

export function removeInvalidParentheses(string: string) {
	const validStrings = new Set<string>();

	dfs(string, 0, 0, 0, 0, validStrings);

	// convert the set of valid strings to an array and return it
	return Array.from(validStrings).toString();
}

function dfs(
	string: string,
	index: number,
	leftCount: number,
	rightCount: number,
	removedCount: number,
	validStrings: Set<string>,
): void {
	// base case: we have reached the end of the string
	if (index === string.length) {
		// if the number of left and right parentheses is the same,
		// and we have removed the minimum number of characters
		// necessary to make the string valid, add it to the set
		// of valid strings
		if (leftCount === rightCount && removedCount === minRemovedCount) {
			validStrings.add(string);
		}
		return;
	}

	// get the current character
	const char = string[index];

	// if the current character is a left parenthesis, we have two options:
	// we can either remove it, or we can keep it
	if (char === "(") {
		// remove the left parenthesis
		dfs(
			string.substring(0, index) + string.substring(index + 1),
			index,
			leftCount,
			rightCount,
			removedCount + 1,
			validStrings,
		);

		// keep the left parenthesis
		dfs(string, index + 1, leftCount + 1, rightCount, removedCount, validStrings);

		// No idea why eslint hates this tbh
		// eslint-disable-next-line brace-style
	}
	// if the current character is a right parenthesis, we have two options:
	// we can either remove it, or we can try to find a matching left parenthesis
	// earlier in the string
	else if (char === ")") {
		// remove the right parenthesis
		dfs(
			string.substring(0, index) + string.substring(index + 1),
			index,
			leftCount,
			rightCount,
			removedCount + 1,
			validStrings,
		);

		// try to find a matching left parenthesis
		if (leftCount > rightCount) {
			dfs(
				string.substring(0, index - 1) + string.substring(index),
				index - 1,
				leftCount - 1,
				rightCount,
				removedCount + 1,
				validStrings,
			);
		}
	}
}