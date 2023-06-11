export default function Test() {
	const [count, setCount] = React.useState(0);

	return (
		<div>
			<h1>Hello there!</h1>
			<button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
		</div>
	);
}
