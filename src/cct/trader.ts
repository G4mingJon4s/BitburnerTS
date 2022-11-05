export function traderI(prices: number[]) {
	return maxProfit([1, prices]);
}

export function traderII(prices: number[]) {
	return maxProfit([Math.ceil(prices.length / 2), prices]);
}

export function traderIII(prices: number[]) {
	return maxProfit([2, prices]);
}

export function traderIV(input: [number, number[]]) {
	return maxProfit(input);
}

function maxProfit(arrayData: [number, number[]]) {
	let i, j, k;

	const maxTrades = arrayData[0];
	const stockPrices = arrayData[1];

	const highestProfit = new Array(maxTrades).fill(0).map(() => new Array(stockPrices.length).fill(0).map(() => 0));

	for (i = 0; i < maxTrades; i++) {
		for (j = 0; j < stockPrices.length; j++) {
			// Buy
			for (k = j; k < stockPrices.length; k++) {
				// Sell
				if (i > 0 && j > 0 && k > 0) {
					highestProfit[i][k] = Math.max(
						highestProfit[i][k],
						highestProfit[i - 1][k],
						highestProfit[i][k - 1],
						highestProfit[i - 1][j - 1] + stockPrices[k] - stockPrices[j]
					);
				} else if (i > 0 && j > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i - 1][j - 1] + stockPrices[k] - stockPrices[j]);
				} else if (i > 0 && k > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i][k - 1], stockPrices[k] - stockPrices[j]);
				} else if (j > 0 && k > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i][k - 1], stockPrices[k] - stockPrices[j]);
				} else {
					highestProfit[i][k] = Math.max(highestProfit[i][k], stockPrices[k] - stockPrices[j]);
				}
			}
		}
	}
	return highestProfit[maxTrades - 1][stockPrices.length - 1];
}
