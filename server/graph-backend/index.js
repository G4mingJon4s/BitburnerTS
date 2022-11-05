const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();

app.use(bodyParser.json());
app.use(express.static("public"));
app.listen(3001);

app.route("/api")
	.put((req, res) => {
		console.log("Updating a graph!");

		const graphs = JSON.parse(fs.readFileSync("./public/graph.json", "utf8"));

		const graph = req.body;

		if (graph.graph === undefined || graph.data === undefined || typeof graph.graph !== "string" || typeof graph.data !== "object") return res.sendStatus(403);

		graphs[graph.graph] = graph.data;

		fs.writeFile("./public/graph.json", JSON.stringify(graphs), (err) => {
			if (err) console.log(err);
			if (err) return res.sendStatus(500);
			res.sendStatus(200);
		});
	});

app.get("/names", (req, res) => {
	const allData = JSON.parse(fs.readFileSync("./public/graph.json", "utf8"));
	const allNames = Object.keys(allData);

	if (allNames.length === 0) return res.sendStatus(404);

	const allProps = JSON.parse(fs.readFileSync("./public/graphSettings.json", "utf8"));
	const allNamesProps = Object.keys(allProps);

	if (allNamesProps.length === 0) return res.sendStatus(404);

	const allReady = allNames.filter(name => allNamesProps.includes(name));

	if (allReady.length === 0) return res.sendStatus(404);

	res.status(200).json(allReady);
});

app.get("/g=:graph", (req, res) => {
	const allData = JSON.parse(fs.readFileSync("./public/graph.json", "utf8"));
	const data = allData[req.params.graph];

	if (data === undefined) return res.sendStatus(404);

	const allProps = JSON.parse(fs.readFileSync("./public/graphSettings.json", "utf8"));
	const props = allProps[req.params.graph];

	if (props === undefined) return res.sendStatus(404);

	res.status(200).json({
		data,
		...props
	});
});