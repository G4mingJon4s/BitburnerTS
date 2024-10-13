export interface Opts<T> {
	/** Should be true if a < b */
	compare?: (a: T, b: T) => boolean;
	key?: (a: T) => string;
}

export interface Heap<T> {
	getMin(): T | null;
	extractMin(): T | null;
	insert(item: T): void;
	decreaseKey(item: T, newValue: T): boolean;
}

export class BinaryHeap<T> implements Heap<T> {
	data: T[] = [];
	positions: Map<T, number> = new Map();

	compare: (a: T, b: T) => boolean;

	constructor(opts?: Opts<T>) {
		const { compare } = opts ?? {};
		this.compare = compare ? compare : (a, b) => a < b;
	}

	extractMin() {
		if (this.data.length === 0) return null;
		const value = this.data[0];

		// Swap root and delete after
		this.positions.set(this.data[this.data.length - 1], 0);
		this.data[0] = this.data[this.data.length - 1];

		this.positions.delete(value);
		this.data.pop();

		// Restore heap property
		this.bubbleDown(0);

		return value;
	}

	getMin() {
		return this.data[0] ?? null;
	}

	insert(item: T): void {
		this.data.push(item);
		this.positions.set(item, this.data.length - 1);
		this.bubbleUp(this.data.length - 1);
	}

	decreaseKey(item: T, newValue: T): boolean {
		const entry = this.positions.get(item);
		if (entry === undefined) return false;

		this.data[entry] = newValue;
		this.bubbleUp(entry);
		this.positions.delete(item);
		this.positions.set(newValue, entry);

		return true;
	}

	private bubbleDown(entry: number): void {
		if (entry >= this.data.length) return;
		const [left, right] = this.childrenEntries(entry);
		if (left >= this.data.length && right >= this.data.length) return;

		const lowerChild = left >= this.data.length || right >= this.data.length ? (Math.min(left, right)) : this.compare(this.data[left], this.data[right]) ? left : right;

		if (this.compare(this.data[entry], this.data[lowerChild])) return;

		this.positions.set(this.data[entry], lowerChild);
		this.positions.set(this.data[lowerChild], entry);
		const temp = this.data[entry];
		this.data[entry]= this.data[lowerChild];
		this.data[lowerChild] = temp;

		return this.bubbleDown(lowerChild);
	}

	private bubbleUp(entry: number): void {
		if (entry === 0) return;
		const parent = this.parentEntry(entry);

		if (this.compare(this.data[parent], this.data[entry])) return;

		this.positions.set(this.data[entry], parent);
		this.positions.set(this.data[parent], entry);
		const temp = this.data[entry];
		this.data[entry] = this.data[parent];
		this.data[parent] = temp;

		return this.bubbleUp(parent);
	}

	private childrenEntries(entry: number): [number, number] {
		return [2 * entry + 1, 2 * entry + 2];
	}

	private parentEntry(entry: number): number {
		return Math.floor((entry - 1) / 2);
	}
}