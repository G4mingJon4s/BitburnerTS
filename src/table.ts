import { NS } from "@ns";

const DEFAULTANSICODE = "\x1b[00;49;0m";
const TABLEANSICODE = "";

export async function main(ns: NS): Promise<void> {
	ns.clearLog(); ns.tail();

	const testData = { a: 1,
		b: 3,
		c: 4,
		d: 123123123123,
		as: 12312334 };
	const testHead = ["Key", "Value"];

	const result = table(testHead, objectToArray(testData));

	ns.print(result);
}

export function objectToArray(obj: Record<string, any>) {
	const data = Object.entries(obj);
	return data.map(pair => [pair[0], String(pair[1])]);
}

export function table(head: string[], data: string[][], opts: Opts = {}) {
	const { ml = 1, mr = 1, alignNumbersRight = true, inlineHeader = false } = opts;

	const columnCount = Math.max(data.reduce((acc, row) => Math.max(acc, row.length), 0), head.length);

	const filledData = data.map(row => new Array<string>(...row, ...Array(columnCount - row.length).fill("").map(() => "")));
	const filledHead = new Array<string>(...head, ...Array(columnCount - head.length).fill("").map(() => ""));

	const columnLengths = filledData.reduce((acc, row) => {
		const stringLengths = row.map(getStringLength);
		return acc.map((length, i) => Math.max(length, stringLengths[i]));
	}, filledHead.map(getStringLength));

	const refinedData = filledData.map(row => row.map((string, i) => {
		const columnLength = columnLengths[i];
		return DEFAULTANSICODE + (getStringPad(ml) + string + getStringPad(columnLength - getStringLength(string)) + getStringPad(mr)) + DEFAULTANSICODE;
	}));

	const joinedString = (refinedData.reduce((acc, row) => (acc + "\n") + joinRow(row), getHead(filledHead, columnLengths, ml, mr)) + "\n") + getDivider(2, columnLengths, ml, mr);

	return joinedString;
}

export function getStringLength(string: string) {
	const ansiRegEx = /\\x1b\[[0-9;]*m/ig;
	const replaced = string.replaceAll(ansiRegEx, "");
	return replaced.length;
}

export function getStringPad(padLength: number, fill = " ") {
	return String("").padEnd(padLength, fill);
}

export function joinRow(row: string[], style = getBorder()) {
	const columnDivider = style[1][4];
	return TABLEANSICODE + columnDivider + row.join(TABLEANSICODE + columnDivider) + TABLEANSICODE + columnDivider;
}

export function getHead(head: string[], columnLengths: number[], ml: number, mr: number, style = getBorder()) {
	const refinedHead = head.map((string, i) => {
		const columnLength = columnLengths[i];
		return DEFAULTANSICODE + (getStringPad(ml) + string + getStringPad(columnLength - getStringLength(string)) + getStringPad(mr)) + DEFAULTANSICODE;
	});

	const joinedHead = joinRow(refinedHead);
	return (getDivider(0, columnLengths, ml, mr) + "\n") + (joinedHead + "\n") + getDivider(1, columnLengths, ml, mr);
}

export function getDivider(mode: 0 | 1 | 2, columnLengths: number[], ml: number, mr: number, style = getBorder()) {
	const leftDivider = style[mode][0];
	const midDivider = style[mode][1];
	const rightDivider = style[mode][2];
	const line = style[mode][3];

	const columnLines = columnLengths.map(number => line.padEnd(number + ml + mr, line));
	return leftDivider + columnLines.join(midDivider) + rightDivider;
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
}
