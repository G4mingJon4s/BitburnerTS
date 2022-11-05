export function findFactor(input: number) {
	const primes = [];
	for (let i = 1; i <= input; i++) {
		if (input % i !== 0) continue;
		if (isPrime(i)) primes.push(i);
	}
	return primes.at(-1) as number;
}

export function isPrime(num: number) {
	const root = Math.sqrt(num);
	for (let i = 2; i <= root; i++) {
		if (num % i === 0) return false;
	}
	return num > 1;
}
