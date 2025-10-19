import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import CommandConfirmationOverlay from "./CommandConfirmationOverlay";
import { createModel } from "vosk-browser";

function splitArgs(input: string): string[] {
	const out: string[] = [];
	let buf = "";
	let quote: '"' | "'" | null = null;
	for (const ch of input) {
		if (quote) {
			if (ch === quote) quote = null;
			else buf += ch;
		} else {
			if (ch === '"' || ch === "'") quote = ch;
			else if (/\s/.test(ch)) {
				if (buf) {
					out.push(buf);
					buf = "";
				}
			} else buf += ch;
		}
	}
	if (buf) out.push(buf);
	return out;
}

export default function TerminalView() {
	const termRef = useRef<Terminal | null>(null);
	const fitRef = useRef<FitAddon | null>(null);
	const inputBuf = useRef<string>("");

	// Learning mode state
	const [learningMode, setLearningMode] = useState(true); // Default to true for learning
	const [pendingCommand, setPendingCommand] = useState<string | null>(null);

	// Speech recognition state (Vosk - offline)
	const [isListening, setIsListening] = useState(false);
	const voskModelRef = useRef<any>(null);
	const voskRecognizerRef = useRef<any>(null);

	// Use refs to avoid stale closures in terminal callbacks
	const pendingCommandRef = useRef<string | null>(null);

	// Debug: Log when pendingCommand changes
	useEffect(() => {
		console.log("📊 pendingCommand state changed to:", pendingCommand);
	}, [pendingCommand]);
	const write = (s: string) => termRef.current?.write(s);
	const writeln = (s = "") => write(s + "\r\n");
	const prompt = () => write("\r\n$ git ");

	// Execute the git command
	const executeCommand = async (command: string) => {
		const args = splitArgs(command);
		console.log("🚀 Executing git command:", args);
		const res = await window.api.execGit(args);
		if (!res.output && !res.err) writeln("(no output)");
		writeln(`(exit ${res.code ?? -1})`);
		prompt();
	};

	// Handle command confirmation
	const handleConfirm = () => {
		if (pendingCommand) {
			executeCommand(pendingCommand);
			setPendingCommand(null);
			pendingCommandRef.current = null;
		}
	};

	// Handle command cancellation
	const handleCancel = () => {
		console.log("❌ Command cancelled by user");
		writeln("Command cancelled.");
		prompt();
		setPendingCommand(null);
		pendingCommandRef.current = null;
	};

	// Initialize Vosk Model (offline speech recognition)
	const initVoskModel = async () => {
		if (voskModelRef.current) return voskModelRef.current;

		try {
			console.log("� Initializing Vosk model...");
			const model = await createModel(
				"/models/vosk-model-small-en-us-0.15.tar.gz"
			);
			voskModelRef.current = model;
			console.log("✅ Vosk model loaded");
			return model;
		} catch (error) {
			console.error("❌ Failed to load Vosk model:", error);
			return null;
		}
	};

	// Start Vosk speech recognition
	const startListening = useCallback(async () => {
		if (isListening) return;

		try {
			const model = await initVoskModel();
			if (!model) {
				write("\r\n⚠️  Failed to initialize speech recognition.\r\n");
				prompt();
				return;
			}

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const recognizer = new model.KaldiRecognizer(16000);
			voskRecognizerRef.current = recognizer;

			setIsListening(true);
			write("\r\n🎙 Listening...");

			// Listen for recognition results
			recognizer.addEventListener("result", (event: any) => {
				console.log("🎤 Recognition result event:", event);
				console.log("🎤 Event detail:", event.detail);
				console.log("🎤 Event detail.result:", event.detail.result);

				const result = event.detail.result;

				setIsListening(false);

				if (result && result.text) {
					const transcript = result.text.trim();
					console.log("🎤 Transcribed text:", transcript);
					write("\r\x1b[K");
					inputBuf.current = transcript;
					write(`$ git ${transcript}`);
				} else {
					console.log("🎤 No text found in result:", result);
					write("\r\x1b[K\r\n⚠️  No speech detected.\r\n");
					prompt();
				}

				recognizer.remove();
				stream.getTracks().forEach((track) => track.stop());
			});

			// Set up MediaRecorder to capture audio
			const mediaRecorder = new MediaRecorder(stream);
			const audioChunks: Blob[] = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				// Convert audio to PCM format for Vosk
				const audioBlob = new Blob(audioChunks);
				const arrayBuffer = await audioBlob.arrayBuffer();
				const audioContext = new AudioContext({ sampleRate: 16000 });
				const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

				console.log(
					"🎤 Audio buffer duration:",
					audioBuffer.duration,
					"seconds"
				);
				console.log("🎤 Audio buffer length:", audioBuffer.length, "samples");

				// Feed audio buffer to recognizer
				recognizer.acceptWaveform(audioBuffer);

				// Trigger final result retrieval
				recognizer.retrieveFinalResult();

				audioContext.close();
			};

			// Record for 3 seconds
			mediaRecorder.start();
			setTimeout(() => {
				if (mediaRecorder.state !== "inactive") {
					mediaRecorder.stop();
				}
			}, 3000);
		} catch (error) {
			console.error("❌ Failed to start recognition:", error);
			write("\r\n⚠️  Microphone access denied or error occurred.\r\n");
			prompt();
			setIsListening(false);
		}
	}, [isListening]);

	// Stop Vosk speech recognition
	const stopListening = useCallback(() => {
		if (voskRecognizerRef.current) {
			voskRecognizerRef.current.remove();
			voskRecognizerRef.current = null;
		}
		setIsListening(false);
	}, []);

	useEffect(() => {
		const term = new Terminal({
			convertEol: true,
			fontFamily: "ui-monospace, monospace",
			fontSize: 14,
			theme: { background: "#000000", foreground: "#e5e5e5" },
		});
		const fit = new FitAddon();
		termRef.current = term;
		fitRef.current = fit;
		term.loadAddon(fit);

		const el = document.getElementById("xterm-root");
		if (!el) {
			console.error("❌ Could not find #xterm-root div!");
			return;
		}

		term.open(el);
		fit.fit();

		writeln("Voice Git Coach — JS-only version");
		writeln("Type a git subcommand (e.g. status, log, diff).");
		prompt();

		const off = window.api.onGitOutput((data: string) => write(data));

		term.onData(async (data: string) => {
			const code = data.charCodeAt(0);

			// Handle Enter key
			if (code === 13) {
				const line = inputBuf.current.trim();
				inputBuf.current = "";
				writeln("");

				if (!line) {
					prompt();
					return;
				}

				// Show confirmation overlay instead of executing directly
				console.log("🔔 Setting pending command:", line);
				pendingCommandRef.current = line;
				setPendingCommand(line);
				return;
			}

			// Handle Backspace
			if (code === 127) {
				if (inputBuf.current.length > 0) {
					write("\b \b");
					inputBuf.current = inputBuf.current.slice(0, -1);
				}
				return;
			}

			// Handle normal characters
			if (data >= " " && data <= "~") {
				inputBuf.current += data;
				write(data);
			}
		});

		const onResize = () => fit.fit();
		window.addEventListener("resize", onResize);
		onResize();

		return () => {
			off();
			window.removeEventListener("resize", onResize);
			term.dispose();
		};
	}, []);

	// Separate useEffect for keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			console.log(
				"🔑 Key pressed:",
				e.key,
				"Code:",
				e.code,
				"Ctrl:",
				e.ctrlKey,
				"Meta:",
				e.metaKey
			);

			// Ctrl+Space to toggle speech recognition
			if (e.ctrlKey && e.code === "Space") {
				console.log("🎯 Ctrl+Space detected!");
				e.preventDefault();
				e.stopPropagation();

				if (isListening) {
					console.log("🛑 Stopping listening...");
					stopListening();
				} else {
					console.log("🎤 Starting listening...");
					startListening();
				}
			}
		};

		console.log("🎧 Keyboard listener attached, isListening:", isListening);
		window.addEventListener("keydown", handleKeyDown, true); // Use capture phase

		return () => {
			console.log("🎧 Keyboard listener removed");
			window.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [isListening, startListening, stopListening]); // Include callbacks in dependencies

	// Cleanup Vosk on unmount
	useEffect(() => {
		return () => {
			if (voskRecognizerRef.current) {
				voskRecognizerRef.current.remove();
			}
		};
	}, []);

	return (
		<div style={{ position: "relative", height: "100%", background: "#000" }}>
			<div id="xterm-root" style={{ height: "100%", background: "#000" }} />

			{/* Show overlay when there's a pending command */}
			{pendingCommand && (
				<CommandConfirmationOverlay
					command={pendingCommand}
					learningMode={learningMode}
					onConfirm={handleConfirm}
					onCancel={handleCancel}
				/>
			)}
		</div>
	);
}
