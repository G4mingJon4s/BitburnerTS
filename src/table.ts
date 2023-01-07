import { NS } from "@ns";

const DEFAULTANSICODE = "\x1b[00;49;00m";
const TABLEANSICODE = "\x1b[00;49;00m";

export const TERMINALLENGTH = 235;

export async function main(ns: NS): Promise<void> {
	ns.clearLog(); ns.tail();

	const testData = [
		["\x1b[30mLook mom, I made a table", 	"\x1b[00;49;31mto show some", "numbers: 12 123"],
		["Or my", 										"\u001b[32mnumbers", 			"69'420.187$"],
		["Im missing something", 			"up there", 		"but I don't know what it could be", "asdasdasdasd "]
	];
	const testHead = ["Key", "Value", "Number"];

	const result = table(testHead, testData, { inlineHeader: true,
		alignNumbersRight: true,
		ml: 2,
		mr: 2 });

	ns.print(result);
}

export function objectToArray(obj: Record<string, unknown>) {
	const data = Object.entries(obj);
	return data.map(pair => [pair[0], String(pair[1])]);
}

export function table(head: string[], data: string[][], opts: Opts = {}) {
	const { ml = 1, mr = 1, alignNumbersRight = true, inlineHeader = false, cutOff = true } = opts;

	const numberRegEx = /^[$]?-?[\d']+\.?\d*[tsmhkbtqQ%]?$/;

	const cutOffLength = cutOff ? TERMINALLENGTH : undefined;

	const columnCount = Math.max(data.reduce((acc, row) => Math.max(acc, row.length), 0), head.length);

	const filledData = data.map(row => new Array<string>(...row.map(string => string.trim()), ...Array<string>(columnCount - row.length).fill("")));
	const filledHead = new Array<string>(...head, ...Array(columnCount - head.length).fill("").map(() => ""));

	const columnLengths = filledData.reduce((acc, row) => {
		const stringLengths = row.map(getStringLength);
		return acc.map((length, i) => Math.max(length, stringLengths[i]));
	}, filledHead.map(getStringLength));

	const refinedData = filledData.map(row => row.map((string, i) => {
		const columnLength = columnLengths[i];
		if (alignNumbersRight && string.match(numberRegEx) !== null) return DEFAULTANSICODE + (getStringPad(ml) + getStringPad(columnLength - getStringLength(string)) + string + getStringPad(mr)) + DEFAULTANSICODE;
		return DEFAULTANSICODE + (getStringPad(ml) + string + getStringPad(columnLength - getStringLength(string)) + getStringPad(mr)) + DEFAULTANSICODE;
	}));

	const joinedRows = refinedData.map(row => joinRow(row).slice(0, cutOffLength));
	const headString = getHead(filledHead, columnLengths, ml, mr, inlineHeader);
	const foodString = getDivider(2, columnLengths, ml, mr);

	const finalString = `${headString.slice(0, cutOffLength)}\n${joinedRows.reduce(toSingleString)}\n${foodString.slice(0, cutOffLength)}`;

	return finalString;
}

export function toSingleString(a: string, b: string) {
	return a + "\n" + b;
}

export function getStringLength(string: string) {
	const replaced = string.replaceAll(ansiRegex(), "");
	return replaced.length;
}

export function getStringPad(padLength: number, fill = " ") {
	return String("").padEnd(padLength, fill);
}

export function joinRow(row: string[], style = getBorder()) {
	const columnDivider = style[1][4];
	return (TABLEANSICODE + columnDivider) + row.join(TABLEANSICODE + columnDivider) + (TABLEANSICODE + columnDivider);
}

export function getHead(head: string[], columnLengths: number[], ml: number, mr: number, inline: boolean, style = getBorder()) {
	const refinedHead = head.map((string, i) => {
		const columnLength = columnLengths[i];
		return DEFAULTANSICODE + (getStringPad(ml) + string + getStringPad(columnLength - getStringLength(string)) + getStringPad(mr)) + DEFAULTANSICODE;
	});

	if (inline) return ((TABLEANSICODE + style[0][0] + DEFAULTANSICODE) + refinedHead.join(TABLEANSICODE + style[0][1] + DEFAULTANSICODE) + (TABLEANSICODE + style[0][2] + DEFAULTANSICODE)).replaceAll(" ", style[0][3]);

	const joinedHead = joinRow(refinedHead);
	return (getDivider(0, columnLengths, ml, mr) + "\n") + (joinedHead + "\n") + getDivider(1, columnLengths, ml, mr);
}

export function getDivider(mode: 0 | 1 | 2, columnLengths: number[], ml: number, mr: number, style = getBorder()) {
	const leftDivider = style[mode][0];
	const midDivider = style[mode][1];
	const rightDivider = style[mode][2];
	const line = style[mode][3];

	const columnLines = columnLengths.map(number => line.padEnd(number + ml + mr, line));
	return TABLEANSICODE + leftDivider + columnLines.join(midDivider) + rightDivider;
}

export function getBorder() {
	return [
		["┌", "┬", "┐", "─", "│"],
		["├", "┼", "┤", "─", "│"],
		["└", "┴", "┘", "─", "│"],
	];
}

export function ansiRegex({ onlyFirst = false } = {}) {
	const pattern = [
		"[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
		"(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
	].join("|");

	return new RegExp(pattern, onlyFirst ? undefined : "g");
}

interface Opts {
	ml?: number;
	mr?: number;
	alignNumbersRight?: boolean;
	inlineHeader?: boolean;
	cutOff?: boolean;
}

export function progressBar(percentage: number, size: number) {
	const lit = Math.round(percentage * size);
	const unLit = size - lit;
	return `[${String("").padEnd(lit, "|")}${String("").padEnd(unLit, "-")}]`;
}
