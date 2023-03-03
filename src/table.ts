import { NS } from "@ns";

export const TERMINALLENGTH = 235;

export async function main(ns: NS): Promise<void> {
	ns.clearLog(); ns.tail();

	const testData = [
		["Look mom, I made a table", 	"to show some", "numbers: 12 123"],
		["Or my", 										"numbers", 			"69420.187$"],
		["Im missing something", 			"up there", 		"but I don't know what it could be", "asdasdasdasd "]
	];
	const testHead = ["Key", "Value", "Number"];

	const result = table(testHead, testData, {
		inlineHeader: false,
		alignNumbersRight: true,
		ml: 2,
		mr: 2
	});

	ns.print(result);
}

export function objectToArray(obj: Record<string, unknown>) {
	const data = Object.entries(obj);
	return data.map(pair => [pair[0], String(pair[1])]);
}

export function table(head: string[], data: string[][], opts: Opts = {}) {
	const { ml = 1, mr = 1, alignNumbersRight = true, inlineHeader = false, middleDivider: withMiddleDivider = false } = opts;
	
	// make all rows have the same number columns
	const columnCount = data.reduce((acc, cur) => Math.max(acc, cur.length), head.length);

	const filledHead = [...head, ...Array(columnCount - head.length).fill(0).map(() => "")];
	const filledData = data.map(row => [...row, ...Array(columnCount - row.length).fill(0).map(() => "")]);

	// count max length of each column
	const columnLengths = filledData.reduce((acc, cur) => {
		// for every row, count the lengths of each column and carry the maximum
		const lengths = countLengths(cur);
		return acc.map((n, i) => Math.max(n, lengths[i]));
	}, countLengths(filledHead));

	// make header
	const headerString = header(filledHead, columnLengths, ml, mr, alignNumbersRight, inlineHeader);

	// make rows to strings
	const rowStrings = filledData.map(arr => row(arr, columnLengths, ml, mr, alignNumbersRight));

	// make dividers
	const topDivider = divider(columnLengths, 0, ml, mr, getBorder);
	const middleDivider = divider(columnLengths, 1, ml, mr, getBorder);
	const bottomDivider = divider(columnLengths, 2, ml, mr, getBorder);

	const combinedHead = inlineHeader ? headerString : [topDivider, headerString, middleDivider].reduce(append);
	const combinedData = rowStrings.join("\n" + (withMiddleDivider ? middleDivider + "\n" : ""));

	const combinedString = [combinedHead, combinedData, bottomDivider].reduce(append);

	return combinedString;
}

export function countLengths(arr: string[]) {
	return arr.map(s => s.length);
}

export function append(a: string, b: string) {
	return a + "\n" + b;
}

export function header(head: string[], columnLengths: number[], ml: number, mr: number, alignNumbersRight: boolean, inlineHeader: boolean, fillChar = " ", border = getBorder) {
	const headValues = head.map((string, i) => value(string, columnLengths[i], ml, mr, alignNumbersRight, inlineHeader ? border()[0][3] : fillChar));
	const connected = connectValues(headValues, Number(!inlineHeader), inlineHeader, border);
	return connected;
}

export function row(arr: string[], columnLengths: number[], ml: number, mr: number, alignNumbersRight: boolean, fillChar = " ", border = getBorder) {
	const rowValues = arr.map((string, i) => value(string, columnLengths[i], ml, mr, alignNumbersRight, fillChar));
	const connected = connectValues(rowValues, 1, false, border);
	return connected;
}

/**
 * @param mode Chooses the border chars to be used, 0 is top, 1 is middle, 2 is bottom
 */
export function divider(columnLengths: number[], mode = 1, ml: number, mr: number, border = getBorder) {
	const values = columnLengths.map(n => value("", n, ml, mr, false, border()[mode][3]));
	const connected = connectValues(values, mode, true, border);
	return connected;
}

/**
 * @param mode Chooses the border chars to be used, 0 is top, 1 is middle, 2 is bottom
 * @param strikethrough wether or not to use the alternate, strikethrough connect Char
 */
export function connectValues(arr: string[], mode = 1, strikethrough = false, border = getBorder) {
	const [startChar, connectChar2, endChar, _, connectChar] = border()[mode];

	return (strikethrough ? startChar : connectChar) + arr.join(strikethrough ? connectChar2 : connectChar) + (strikethrough ? endChar : connectChar);
}

export function value(string: string, length: number, ml: number, mr: number, alignNumbersRight: boolean, fillChar = " ") {
	// add ml padding, add padding to string (padStart if number, padEnd if not or disabled), add mr padding
	return pad(ml, fillChar) + string[(alignNumbersRight && isNumber(string)) ? "padStart" : "padEnd"](length, fillChar) + pad(mr, fillChar);
}

export function isNumber(string: string) {
	const numberRegEx = /^[$]?-?[\d']+[.,]?\d*[tsmhkbtqQ%]?[€$]?$/;

	return numberRegEx.test(string);
}

export function pad(length: number, fillChar = " ") {
	return fillChar.padEnd(length, fillChar);
}

export function getBorder() {
	return [
		["┌", "┬", "┐", "─", "│"],
		["├", "┼", "┤", "─", "│"],
		["└", "┴", "┘", "─", "│"],
	];
}

interface Opts {
	ml?: number;
	mr?: number;
	alignNumbersRight?: boolean;
	inlineHeader?: boolean;
	middleDivider?: boolean;
}

export function progressBar(percentage: number, size: number) {
	const lit = Math.round(percentage * size);
	const unLit = size - lit;
	return `[${String("").padEnd(lit, "|")}${String("").padEnd(unLit, "-")}]`;
}
