import React, { useEffect, useState } from "react";
import "./style.css";
import { GraphForm } from "./components/GraphForm";
import { GraphPlane } from "./components/GraphPlane";

export function Root(): React.ReactElement {
	const [names, setNames] = useState<Array<string> | null>(null);
	const [loadingNames, setLoadingNames] = useState(true);

	const [graph, setGraph] = useState(null);
	const [loadingGraph, setLoadingGraph] = useState(true);

	const [selected, setSelected] = useState<string | null>(null);
	
	useEffect(() => {
		fetch(`/names`).then(res => {
			if (!res.ok) return setLoadingNames(false);
			return res.json();
		}).then(json => {
			setNames(json);
			setLoadingNames(false);
			setSelected(json[0] as string);
		});
	}, []);

	useEffect(() => {
		if (selected === null) return;
		fetch(`/g=${selected}`).then(res => {
			if (!res.ok) return setLoadingGraph(false);
			return res.json();
		}).then(json => {
			setGraph(json);
			setLoadingGraph(false);
		});
	}, [selected]);

  return (
		<>
			<div style={{
				height: "10vh",
				marginBottom: "32px",
				marginLeft: "10px"
			}}>
				{(!loadingNames && selected !== null && names !== null) && <GraphForm selected={selected} setSelected={(name: string) => setSelected(name)} names={names}/>}
			</div>
			<div style={{
				height: "calc(85vh - 40px)",
				width: "100%"
			}}>
				{!loadingGraph && <GraphPlane graphProps={graph}/>}
			</div>
		</>
  );
}
