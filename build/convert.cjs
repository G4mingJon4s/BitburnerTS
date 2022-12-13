console.log("Loading!");

const fs = require("fs");
const path = require('node:path');

const data = JSON.parse(fs.readFileSync(path.resolve("src/cct/finished.json"), { encoding: "utf8" }));

if (!fs.existsSync(path.resolve("src/cct/cases"))) fs.mkdirSync(path.resolve("src/cct/cases"));

Object.keys(data).forEach(key => {
	const cases = data[key];
	fs.writeFileSync(path.resolve(`src/cct/cases/${key.replace(" ", "_").replace(":", "-")}.json`), JSON.stringify(cases, undefined, 2), { encoding: "utf8" });
});

console.log(data);