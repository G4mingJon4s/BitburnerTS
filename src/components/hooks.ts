export type get<T> = () => T;
export type set<T> = (value: T | ((value: T) => T)) => void;
export type action<T> = (value: T) => void;
export type subscribe<T> = (action: action<T>) => () => undefined;

export function state<T>(value: T): [get<T>, set<T>, subscribe<T>] {
	let state = value;

	const actions = new Map<string, action<T>>();

	const subscribe: subscribe<T> = action => {
		const id = crypto.randomUUID();
		actions.set(id, action);

		return () => void actions.delete(id);
	};

	const get: get<T> = () => state;
	const set: set<T> = value => {
		state = value instanceof Function ? value(state) : value;

		actions.forEach(a => a(state));
	};

	return [get, set, subscribe];
}