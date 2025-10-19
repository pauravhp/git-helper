import { useEffect } from "react";

interface CommandConfirmationOverlayProps {
	command: string;
	learningMode: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function CommandConfirmationOverlay({
	command,
	learningMode,
	onConfirm,
	onCancel,
}: CommandConfirmationOverlayProps) {
	// Debug: Log when overlay mounts
	useEffect(() => {
		console.log("🎨 CommandConfirmationOverlay mounted with command:", command);
		return () => {
			console.log("🎨 CommandConfirmationOverlay unmounted");
		};
	}, []);

	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase();
			if (key === "y") {
				console.log("✅ User confirmed command:", command);
				onConfirm();
			} else if (key === "n") {
				console.log("❌ User cancelled command:", command);
				onCancel();
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [command, onConfirm, onCancel]);

	// Get a helpful explanation based on the git command
	const getExplanation = (cmd: string): string => {
		const firstArg = cmd.split(" ")[0]?.toLowerCase();
		const explanations: Record<string, string> = {
			status:
				"Shows the current state of your working directory and staging area",
			log: "Displays commit history for the current branch",
			diff: "Shows changes between commits, commit and working tree, etc",
			add: "Adds file contents to the staging area (index)",
			commit: "Records changes to the repository",
			push: "Updates remote refs along with associated objects",
			pull: "Fetches from and integrates with another repository or local branch",
			branch: "Lists, creates, or deletes branches",
			checkout: "Switches branches or restores working tree files",
			merge: "Joins two or more development histories together",
			clone: "Clones a repository into a new directory",
			init: "Creates an empty Git repository or reinitializes an existing one",
			fetch: "Downloads objects and refs from another repository",
			reset: "Resets current HEAD to the specified state",
			rebase: "Reapplies commits on top of another base tip",
		};
		return explanations[firstArg] || "Executes a git command";
	};

	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: "rgba(0, 0, 0, 0.85)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000,
			}}
		>
			<div
				style={{
					backgroundColor: "#1e1e1e",
					border: "2px solid #4a9eff",
					borderRadius: "8px",
					padding: "24px 32px",
					minWidth: "500px",
					maxWidth: "700px",
					boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
				}}
			>
				{/* Command Display */}
				<div style={{ marginBottom: "20px" }}>
					<div
						style={{
							color: "#888",
							fontSize: "12px",
							marginBottom: "8px",
							textTransform: "uppercase",
							letterSpacing: "1px",
						}}
					>
						Command to Execute
					</div>
					<div
						style={{
							fontFamily: "ui-monospace, monospace",
							fontSize: "16px",
							color: "#4a9eff",
							backgroundColor: "#0a0a0a",
							padding: "12px 16px",
							borderRadius: "4px",
							border: "1px solid #333",
						}}
					>
						git {command}
					</div>
				</div>

				{/* Learning Mode Explanation */}
				{learningMode && (
					<div
						style={{
							marginBottom: "20px",
							padding: "12px 16px",
							backgroundColor: "#2a2a1a",
							borderLeft: "3px solid #ffd700",
							borderRadius: "4px",
						}}
					>
						<div
							style={{
								color: "#ffd700",
								fontSize: "11px",
								fontWeight: "600",
								marginBottom: "6px",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							💡 What this does
						</div>
						<div
							style={{
								color: "#e5e5e5",
								fontSize: "14px",
								lineHeight: "1.5",
							}}
						>
							{getExplanation(command)}
						</div>
					</div>
				)}

				{/* Action Buttons */}
				<div
					style={{
						display: "flex",
						gap: "16px",
						justifyContent: "center",
						marginTop: "24px",
					}}
				>
					<div
						style={{
							flex: 1,
							textAlign: "center",
							padding: "12px 24px",
							backgroundColor: "#0d7a0d",
							border: "2px solid #0f0",
							borderRadius: "6px",
							color: "#fff",
							fontWeight: "600",
							fontSize: "14px",
							cursor: "pointer",
						}}
					>
						[Y] Run Command
					</div>
					<div
						style={{
							flex: 1,
							textAlign: "center",
							padding: "12px 24px",
							backgroundColor: "#7a0d0d",
							border: "2px solid #f00",
							borderRadius: "6px",
							color: "#fff",
							fontWeight: "600",
							fontSize: "14px",
							cursor: "pointer",
						}}
					>
						[N] Cancel
					</div>
				</div>

				<div
					style={{
						marginTop: "16px",
						textAlign: "center",
						color: "#888",
						fontSize: "12px",
					}}
				>
					Press Y to run or N to cancel
				</div>
			</div>
		</div>
	);
}
