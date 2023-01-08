console.log("Loading!");

const fs = require("fs");
const path = require('node:path');

const PATH = "src/tests/cct.ts";

const data = JSON.stringify(fs.readFileSync(path.resolve(PATH), { encoding: "utf8" }), undefined, 2);

const converted = data.split("\\r\\n");

console.log("--- DONE ---");
console.log(" ");

converted.forEach(s => console.log(`"${s}",`));

console.log(" ");

console.log("--- DONE ---");