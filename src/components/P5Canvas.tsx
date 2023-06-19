import p5 from "p5";

interface P5Props {
	sketch: (handle: p5) => void;
}

export default function P5Canvas({ sketch }: P5Props) {
	const ref = React.useRef(null);

	React.useEffect(() => {
		if (!ref.current) return;
		new p5(sketch, ref.current);
	}, [ref]);

	return (
		<div ref={ref}></div>
	);
}
