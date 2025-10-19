import TerminalView from "./components/TerminalView";

export default function App() {
	return (
		<div
			id="app-root"
			style={{
				height: "100vh",
				background: "#000",
				position: "relative", // <-- overlay anchor
				overflow: "hidden",
			}}
		>
			<TerminalView />
		</div>
	);
}
