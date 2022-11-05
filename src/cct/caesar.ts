export function strToSalad(input: [string, number]) {
	const lookup = ["A","B","C","D","E","F","G","H","I", "J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",];
	return input[0]
		.split("")
		.map((char) => char === " " ? " " : lookup.at(lookup.indexOf(char) - input[1])).join("");
}
