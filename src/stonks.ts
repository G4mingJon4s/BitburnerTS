import { NS } from "@ns";
import { table } from "table";
import { money } from "./money";

const ALLOWSHORTS = false; // CAUTION: LATEST TEST (BN8.2) WITH SHORTS RESULTED IN LOSSES
const MONEYPERCENTAGE = 0.75;
const MINPURCHASE = 5_000_000;
const MAXPURCHASE = 10_000_000_000_000;
const TRANSACTION = 100_000;
const RATES = {
	short: {
		buy: 0.4,
		sell: 0.45,
	},
	long: {
		buy: 0.6,
		sell: 0.55,
	}
};
let HAS4SACCESS = false;

export async function main(ns:NS) {
	ns.clearLog(); ns.disableLog("ALL"); ns.tail();
	if (!ns.stock.purchaseWseAccount() || !ns.stock.purchaseTixApi()) return ns.tprint("You can't buy a WSE Account or Access to the TIX API!");
	HAS4SACCESS = ns.stock.has4SDataTIXAPI();
	const doc = eval("document") as Document;
	const hook1 = doc.getElementById("overview-extra-hook-1");
	if (hook1 === null) throw new Error("Couldn't find hook1!");

	const stocks = ns.stock.getSymbols().map(symbol => new Stock(ns, symbol));

	ns.atExit(() => {
		hook1.innerText = "";
	});

	const marketUpdated = isMarketUpdated(ns); // Generator, whose value is a boolean wether the market is updated

	sellStocks(ns, stocks, true); // Sell all stocks from the previous script

	const allCycles = Math.floor(ns.getTimeSinceLastAug() / 6000);
	let currentCycle = allCycles % 75;

	while (true) {
		while (!marketUpdated.next().value) await ns.sleep(2000);
		currentCycle++;

		stocks.forEach(stock => stock.update(ns, currentCycle === 75));

		if (currentCycle === 75) console.warn("FLIP");
		console.log(stocks);

		currentCycle %= 75;

		console.log(currentCycle);

		sellStocks(ns, stocks);
		
		if (currentCycle <= 35) buyStocks(ns, stocks, ns.getPlayer().money * MONEYPERCENTAGE);

		scriptTable(ns, stocks);
		overviewDisplay(hook1, stocks);

		// Check after buying stocks, because you could have just enough to buy it, but not enough to recover
		HAS4SACCESS = ns.stock.purchase4SMarketDataTixApi();
	}
}

export function* isMarketUpdated(ns: NS) {
	let ECPBIDPrice = ns.stock.getBidPrice("ECP");

	while (true) {
		if (ECPBIDPrice !== ns.stock.getBidPrice("ECP")) {
			ECPBIDPrice = ns.stock.getBidPrice("ECP");
			yield true;
		} else yield false;
	}
}

export function buyStocks(ns: NS, stocksUnsorted: Array<Stock>, availableMoney: number) {
	const stocks = stocksUnsorted.slice().sort((a, b) => b.rating - a.rating);
	const startingMoney = ns.getPlayer().money;
	const totalStockValue = stocks.reduce((acc, stock) => acc + stock.value, 0);
	const optimalStocks = getOptimalStocks(ns, stocks, availableMoney + totalStockValue);
	for (const stock of stocks) {
		if (!stock.allowed) continue;
		if (stock.boughtThisCycle || !stock.ownsShares || optimalStocks.includes(stock)) continue;
		stock.sell(ns);
	}
	availableMoney += ns.getPlayer().money - startingMoney;

	let skipped = 0;
	for (const stock of stocks) {
		if (availableMoney < MINPURCHASE) break;
		if (skipped >= 3) break;
		const maxBuyableShares = stock.maxShares - stock.longShares - stock.shortShares;
		if (!stock.allowed) {
			skipped++;
			continue;
		}
		if (maxBuyableShares <= 0) continue;
		if (stock.forecast > RATES.long.buy || (stock.forecast < RATES.short.buy && ALLOWSHORTS)) {
			const buyPrice = stock.forecast > 0.5 ? stock.askPrice : stock.bidPrice;
			const buyableShares = Math.min(
				maxBuyableShares,
				Math.floor((availableMoney - TRANSACTION) / buyPrice),
				Math.floor((MAXPURCHASE - TRANSACTION) / buyPrice)
			);	
			if (buyableShares <= 0) continue;
			stock.buy(ns, buyableShares, stock.forecast < 0.5);
			availableMoney -= buyableShares * buyPrice + TRANSACTION;
		}
	}
}

export function getOptimalStocks(ns: NS, stocks: Array<Stock>, availableMoney: number) {
	return stocks.filter(stock => {
		if (availableMoney < MINPURCHASE) return false;
		if (!stock.allowed) return false;
		if (stock.forecast > RATES.long.buy || (stock.forecast < RATES.short.buy && ALLOWSHORTS)) {
			const buyPrice = stock.forecast > 0.5 ? stock.askPrice : stock.bidPrice;
			const buyableShares = Math.min(
				stock.maxShares,
				Math.floor((availableMoney - TRANSACTION) / buyPrice),
				Math.floor((MAXPURCHASE - TRANSACTION) / buyPrice)
			);
			if (buyableShares <= 0) return false;
			availableMoney -= buyableShares * buyPrice + TRANSACTION;
			return true;
		} else return false;
	});
}

export function sellStocks(ns: NS, stocks: Array<Stock>, force = false) {
	for (const stock of stocks) {
		if (stock.longShares < 1) continue;
		if (!stock.allowed && !force) continue;
		if (stock.forecast > RATES.long.sell && !force) continue;
		ns.stock.sellStock(stock.symbol, stock.longShares);
	}
	if (ALLOWSHORTS) for (const stock of stocks) {
		if (stock.shortShares < 1) continue; 
		if (!stock.allowed && !force) continue;
		if (stock.forecast < RATES.long.sell && !force) continue;
		ns.stock.sellShort(stock.symbol, stock.shortShares);
	}
}

export function overviewDisplay(hook: HTMLElement, stocks: Array<Stock>) {
	const ownedStocks =stocks.filter(stock => stock.longShares > 0 || stock.shortShares > 0);
	if (ownedStocks.length === 0) return;
	hook.innerText = ownedStocks.map(stock => 
		`${stock.symbol}\t$${money(stock.value, 2)}\t$${money(stock.profit, 2)}\n`
	).reduce((a, b) => a + b);
}

export function scriptTable(ns: NS, stocks: Array<Stock>) {
	const head = ["SYMBOL", "FCAST", "FLIP", "LSHARE", "SSHARE", "VALUE", "PROFIT"];
	const data = stocks.map(stock => [
		stock.symbol,
		(stock.forecast * 100).toFixed(2),
		(stock.forecastCalc.currentFlipProbability * 100).toFixed(2),
		money(stock.longShares, 2),
		money(stock.shortShares, 2),
		"$" + money(stock.value, 2),
		"$" + money(stock.profit, 2),
	]);
	const tableString = table(head, data);

	ns.resizeTail(800, 800);
	ns.clearLog();
	ns.print(tableString);
}

export class Stock {
	symbol: string;	// Symbol of the stock
	volatility: number;	// Volatility of the stock
	forecast: number;	// Forecast of the stock
	
	volatilityCounter: VolatilityCounter;	// Volatility counter of the stock
	forecastCalc: ForecastCalc;	// Forecast calculator of the stock

	allowed: boolean;	// Boolean wether or not you are allowed to buy the stock
	boughtThisCycle: boolean;	// Boolean wether the purchase was this cycle (75 market updates)

	askPrice: number;	// Ask price of the stock, NOT NEEDED
	bidPrice: number;	// Bid price of the stock, NOT NEEDED
	averagePrice: number;	// price of the stock
	profit: number;	// profit of the stock

	maxShares: number; // max shares of the stock
	
	longShares: number; // count of holding long shares
	longPrice: number; // average price the shares were bought at
	longValue: number; // sell value of the long shares
	shortShares: number; // count of holding short shares
	shortPrice: number; // average price the shares were bought at
	shortValue: number; // sell value of the short shares

	constructor(ns: NS, symbol: string) {
		this.symbol = symbol;
		this.volatility = 1;
		this.forecast = 0.5;

		this.volatilityCounter = new VolatilityCounter(200);
		this.forecastCalc = new ForecastCalc();

		this.allowed = true;
		this.boughtThisCycle = false;

		this.askPrice = ns.stock.getAskPrice(symbol);
		this.bidPrice = ns.stock.getBidPrice(symbol);
		this.averagePrice = ns.stock.getPrice(symbol);
		
		this.maxShares = ns.stock.getMaxShares(symbol);
		
		const [longShares, longPrice, shortShares, shortPrice] = ns.stock.getPosition(symbol);
		this.longShares = longShares;
		this.longPrice = longPrice;
		this.shortShares = shortShares;
		this.shortPrice = shortPrice;

		this.longValue = ns.stock.getSaleGain(this.symbol, this.longShares, "Long");
		this.shortValue = ns.stock.getSaleGain(this.symbol, this.shortShares, "Short");
	
		const longProfit = ns.stock.getSaleGain(this.symbol, this.longShares, "Long") - this.longShares * this.longPrice;
		const shortProfit = ns.stock.getSaleGain(this.symbol, this.shortShares, "Short") - this.shortShares * this.shortPrice;
		this.profit = longProfit + shortProfit;
	}

	update(ns: NS, isFlipCycle: boolean) {
		// Update the estimations
		const newPrice = ns.stock.getPrice(this.symbol);
		const percentageChange = newPrice > this.averagePrice ? newPrice / this.averagePrice : this.averagePrice / newPrice;
		this.volatilityCounter.addValue(2 * (percentageChange - 1));

		// Do flip calculations
		if (isFlipCycle) {
			this.forecastCalc.flip();
			this.boughtThisCycle = false;
		}

		// Update the forecast calculator
		this.forecastCalc.update(newPrice > this.averagePrice);

		// Lock the stock, if we're not sure
		this.allowed = HAS4SACCESS || (this.volatilityCounter.isCertain() && this.forecastCalc.isCertain());

		// Update the forecast and volatility
		this.forecast = HAS4SACCESS ? ns.stock.getForecast(this.symbol) : this.forecastCalc.getCurrentForecast();
		this.volatility = HAS4SACCESS ? ns.stock.getVolatility(this.symbol) : this.volatilityCounter.getAverage();

		// Update the prices
		this.averagePrice = newPrice;
		this.askPrice = ns.stock.getAskPrice(this.symbol);
		this.bidPrice = ns.stock.getBidPrice(this.symbol);

		// Update the position
		const [longShares, longPrice, shortShares, shortPrice] = ns.stock.getPosition(this.symbol);
		this.longShares = longShares;		// Owned long shares
		this.longPrice = longPrice;			// Average price, at which the long shares were bought
		this.shortShares = shortShares;	// Owned short shares
		this.shortPrice = shortPrice;		// Average price, at which the short shares were bought

		// Update the buy data
		if (isFlipCycle) this.boughtThisCycle = false;

		// Update the long and short values
		this.longValue = ns.stock.getSaleGain(this.symbol, this.longShares, "Long");
		this.shortValue = ns.stock.getSaleGain(this.symbol, this.shortShares, "Short");

		// Update the profit
		const longProfit = ns.stock.getSaleGain(this.symbol, this.longShares, "Long") - this.longShares * this.longPrice;
		const shortProfit = ns.stock.getSaleGain(this.symbol, this.shortShares, "Short") - this.shortShares * this.shortPrice;
		this.profit = longProfit + shortProfit;
	}

	buy(ns: NS, shareCount: number, short: boolean) {
		if (short && !ALLOWSHORTS) return console.error("Trying to buy shorts without permission!");
		if (!this.allowed) return console.error("Trying to buy shares without permission!");
		const price = short ? ns.stock.buyShort(this.symbol, shareCount) : ns.stock.buyStock(this.symbol, shareCount);
		if (price === 0) return console.error(`Could not buy ${shareCount.toExponential(2)} shares of ${this.symbol}`);
		console.log(`Bought ${shareCount.toExponential(2)} shares of ${this.symbol} at $${money(price, 2)}`);

		// Update the position
		const [longShares, longPrice, shortShares, shortPrice] = ns.stock.getPosition(this.symbol);
		this.longShares = longShares;		// Owned long shares
		this.longPrice = longPrice;			// Average price, at which the long shares were bought
		this.shortShares = shortShares;	// Owned short shares
		this.shortPrice = shortPrice;		// Average price, at which the short shares were bought

		// Update the buy data
		this.boughtThisCycle = true;
	}

	sell(ns: NS) {
		if (!this.allowed) return console.error("Trying to buy shares without permission!");
		if (this.longShares > 0) {
			const price = ns.stock.sellStock(this.symbol, this.longShares);
			console.log(`Sold ${this.longShares.toExponential(2)} shares of ${this.symbol} at $${money(price, 2)}`);
		}
		if (this.shortShares > 0) {
			const price = ns.stock.sellShort(this.symbol, this.shortShares);
			console.log(`Sold ${this.shortShares.toExponential(2)} shares of ${this.symbol} at $${money(price, 2)}`);
		}

		// Update the position
		const [longShares, longPrice, shortShares, shortPrice] = ns.stock.getPosition(this.symbol);
		this.longShares = longShares;		// Owned long shares
		this.longPrice = longPrice;			// Average price, at which the long shares were bought
		this.shortShares = shortShares;	// Owned short shares
		this.shortPrice = shortPrice;		// Average price, at which the short shares were bought

		// Update the buy data
		this.boughtThisCycle = false;
	}

	get ownsShares() {
		return this.longShares > 0 || this.shortShares > 0;
	}

	get value() {
		return this.longValue + this.shortValue;
	}

	get rating() {
		return (
			this.volatility *
			Math.pow(Math.abs(this.forecast - 0.5), 1.25) *
			(this.forecast > 0.5 ? 1.1 : 1) *
			(this.longShares - this.shortShares >= 0 ? 1 : Math.min(1, this.averagePrice / this.longPrice))
		);
	}
}

export class VolatilityCounter {
	length: number;
	values: Array<number>;

	constructor(length: number) {
		this.length = length; 
		this.values = new Array<number>();
	}

	addValue(value: number) {
		this.values.push(value);
		if (this.values.length > this.length) this.values.splice(0, this.values.length - this.length);
	}

	getAverage() {
		return this.values.length > 0 ? this.values.reduce((a, b) => a + b) / this.values.length : 0;
	}

	isCertain() {
		return this.values.length >= Math.min(this.length, 50);
	}
}

export class ForecastCalc {
	currentFlipProbability: number;
	currentForecasts: Array<boolean>;
	previousForecasts: Array<boolean>;
	
	constructor() {
		this.currentFlipProbability = 0;
		this.currentForecasts = new Array<boolean>();
		this.previousForecasts = new Array<boolean>();
	}

	update(increase: boolean) {
		this.currentForecasts.push(increase);
		this.updateFlipPercentage(increase);
	}

	flip() {
		this.currentFlipProbability = 0.45;
		this.previousForecasts = this.currentForecasts;
		this.currentForecasts = new Array<boolean>();
	}

	isCertain() {
		if (this.previousForecasts.length === 0) return this.currentForecasts.length >= 40;
		return this.currentFlipProbability >= 0.95 || this.currentFlipProbability <= 0.05;
	}

	getCurrentForecast() {
		const currentForecast = ForecastCalc.getForecast(this.currentForecasts);
		const previousForecast = ForecastCalc.getForecast(this.previousForecasts);
		if (this.previousForecasts.length === 0) return currentForecast;
		const previousForecastFlipped = this.currentFlipProbability > 0.05 ? 1 -previousForecast : previousForecast;
		return (previousForecastFlipped * this.previousForecasts.length + (currentForecast * this.currentForecasts.length)) / (this.previousForecasts.length + this.currentForecasts.length);
	}

	updateFlipPercentage(increase: boolean) {
		if (this.previousForecasts.length > 0) {
			const previousForecast = ForecastCalc.getForecast(this.previousForecasts);
			const percentageIncrease = (1 - this.currentFlipProbability) * previousForecast + this.currentFlipProbability * (1 - previousForecast);
			
			if (increase) this.currentFlipProbability = ((1 - previousForecast) * this.currentFlipProbability) / 			percentageIncrease;
			else 					this.currentFlipProbability =				 previousForecast * this.currentFlipProbability / (1 - 	percentageIncrease);
		}
	}

	static getForecast(forecasts: Array<boolean>) {
		return forecasts.filter(b => b).length / forecasts.length;
	}
}