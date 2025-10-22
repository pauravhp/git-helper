import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import CommandConfirmationOverlay from "./CommandConfirmationOverlay";
import { createModel } from "vosk-browser";
import { inferCommand } from "../lib/groq";
import {
	wakeWordController,
	type WakeWordDetection,
} from "../lib/wakewordPorcupine";

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

	// Wake word state
	const [wakeWordArmed, setWakeWordArmed] = useState(false);
	const [wakeWordStatus, setWakeWordStatus] = useState("idle");
	const chimeAudioRef = useRef<HTMLAudioElement | null>(null);
	const startListeningRef = useRef<(() => void) | null>(null);

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
	const handleConfirm = async () => {
		if (pendingCommand) {
			executeCommand(pendingCommand);
			setPendingCommand(null);
			pendingCommandRef.current = null;

			// Re-arm wake word if it was armed
			if (wakeWordArmed) {
				console.log("🔄 Re-arming wake word after command confirmation");
				try {
					await wakeWordController.startWakeword();
				} catch (error) {
					console.error("❌ Failed to re-arm wake word:", error);
				}
			}
		}
	};

	// Handle command cancellation
	const handleCancel = async () => {
		console.log("❌ Command cancelled by user");
		writeln("Command cancelled.");
		prompt();
		setPendingCommand(null);
		pendingCommandRef.current = null;

		// Re-arm wake word if it was armed
		if (wakeWordArmed) {
			console.log("🔄 Re-arming wake word after command cancellation");
			try {
				await wakeWordController.startWakeword();
			} catch (error) {
				console.error("❌ Failed to re-arm wake word:", error);
			}
		}
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

	// Start Vosk speech recognition with VAD (Voice Activity Detection)
	const startListening = useCallback(async () => {
		if (isListening) return;

		// Store whether wake word was armed before we started listening
		const wasWakeWordArmed = wakeWordArmed;

		try {
			const model = await initVoskModel();
			if (!model) {
				write("\r\n⚠️  Failed to initialize speech recognition.\r\n");
				prompt();
				return;
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					sampleRate: 16000,
				},
			});

			const recognizer = new model.KaldiRecognizer(16000);
			voskRecognizerRef.current = recognizer;

			setIsListening(true);
			write("\r\n🎙 Listening... (speak your command)");

			let fullTranscript = "";
			let silenceTimeout: number | null = null;
			let audioContext: AudioContext | null = null;
			let scriptProcessor: ScriptProcessorNode | null = null;
			const SILENCE_DURATION = 2000; // 2 seconds of silence to stop

			// Listen for partial results (real-time transcription)
			recognizer.addEventListener("partialresult", (event: any) => {
				const partial = event.detail.result?.partial || "";
				if (partial) {
					console.log("🎤 Partial result:", partial);
					// Update terminal with partial result (optional visual feedback)
					// Clear any existing silence timeout since user is still speaking
					if (silenceTimeout) {
						clearTimeout(silenceTimeout);
						silenceTimeout = null;
					}
				}
			});

			// Listen for final recognition results
			recognizer.addEventListener("result", async (event: any) => {
				console.log("🎤 Recognition result event:", event);
				const result = event.detail.result;

				if (result && result.text) {
					const newText = result.text.trim();
					if (newText) {
						fullTranscript = fullTranscript
							? `${fullTranscript} ${newText}`
							: newText;
						console.log("🎤 Updated transcript:", fullTranscript);

						// Reset silence timer - user spoke
						if (silenceTimeout) {
							clearTimeout(silenceTimeout);
						}

						// Start new silence timer
						silenceTimeout = setTimeout(async () => {
							// User has stopped speaking for SILENCE_DURATION
							console.log("🎤 Silence detected, finalizing...");
							setIsListening(false);

							// Clean up audio processing
							if (scriptProcessor) {
								scriptProcessor.disconnect();
								scriptProcessor = null;
							}
							if (audioContext) {
								audioContext.close();
								audioContext = null;
							}

							recognizer.remove();
							stream.getTracks().forEach((track) => track.stop());

							if (fullTranscript) {
								write("\r\x1b[K");
								write(`\r\n📝 Transcribed: "${fullTranscript}"\r\n`);
								write("🤖 Processing with AI...\r\n");

								// Fetch real repository snapshot
								try {
									const repoSnapshot = await window.api.getRepoSnapshot();

									// Check if we're in a git repository
									if (!repoSnapshot.inRepo) {
										write("\r\n[!] Not a git repository.\r\n");
										prompt();

										// Re-arm wake word
										if (wasWakeWordArmed) {
											console.log(
												"🔄 Re-arming wake word after non-repo detection"
											);
											try {
												await wakeWordController.startWakeword();
											} catch (error) {
												console.error("❌ Failed to re-arm wake word:", error);
											}
										}
										return;
									}

									console.log("📊 Repository snapshot:", repoSnapshot);

									// Call Groq LLM to infer git command with real snapshot
									const llmResult = await inferCommand({
										utterance: fullTranscript,
										repoSnapshot,
										history: [], // TODO: Track command history
										learningMode: learningMode,
									});

									console.log("🤖 LLM result:", llmResult);

									if (llmResult.needs_clarification) {
										write(`\r\n❓ ${llmResult.clarification_question}\r\n`);
										prompt();

										// Re-arm wake word since no command to confirm
										if (wasWakeWordArmed) {
											console.log("🔄 Re-arming wake word after clarification");
											try {
												await wakeWordController.startWakeword();
											} catch (error) {
												console.error("❌ Failed to re-arm wake word:", error);
											}
										}
									} else {
										write(`\r\n💡 ${llmResult.explanation}\r\n`);
										// Extract git subcommand (remove "git " prefix if present)
										const gitCommand = llmResult.command
											.replace(/^git\s+/, "")
											.trim();
										inputBuf.current = gitCommand;
										write(`$ git ${gitCommand}`);
										// Trigger confirmation overlay
										pendingCommandRef.current = gitCommand;
										setPendingCommand(gitCommand);
									}
								} catch (error) {
									console.error("❌ LLM inference failed:", error);
									write(
										`\r\n⚠️  AI processing failed: ${
											error instanceof Error ? error.message : "Unknown error"
										}\r\n`
									);
									prompt();

									// Re-arm wake word after error
									if (wasWakeWordArmed) {
										console.log("🔄 Re-arming wake word after LLM error");
										try {
											await wakeWordController.startWakeword();
										} catch (rearmError) {
											console.error(
												"❌ Failed to re-arm wake word:",
												rearmError
											);
										}
									}
								}
							} else {
								write("\r\x1b[K\r\n⚠️  No speech detected.\r\n");
								prompt();

								// Re-arm wake word if no speech detected
								if (wasWakeWordArmed) {
									console.log("🔄 Re-arming wake word after no speech");
									try {
										await wakeWordController.startWakeword();
									} catch (error) {
										console.error("❌ Failed to re-arm wake word:", error);
									}
								}
							}
						}, SILENCE_DURATION);
					}
				}
			});

			// Set up AudioContext and ScriptProcessor for real-time audio processing
			audioContext = new AudioContext({ sampleRate: 16000 });
			const source = audioContext.createMediaStreamSource(stream);

			// Use ScriptProcessor to get raw PCM audio data
			const bufferSize = 4096;
			scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

			scriptProcessor.onaudioprocess = (e) => {
				// Feed the AudioBuffer directly to Vosk recognizer
				try {
					recognizer.acceptWaveform(e.inputBuffer);
				} catch (error) {
					console.error("❌ Error feeding audio to recognizer:", error);
				}
			};

			source.connect(scriptProcessor);
			scriptProcessor.connect(audioContext.destination);
		} catch (error) {
			console.error("❌ Failed to start recognition:", error);
			write("\r\n⚠️  Microphone access denied or error occurred.\r\n");
			prompt();
			setIsListening(false);
		}
	}, [isListening, learningMode]);

	// Update the ref whenever startListening changes
	useEffect(() => {
		startListeningRef.current = startListening;
	}, [startListening]);

	// Stop Vosk speech recognition
	const stopListening = useCallback(() => {
		if (voskRecognizerRef.current) {
			voskRecognizerRef.current.remove();
			voskRecognizerRef.current = null;
		}
		setIsListening(false);
	}, []);

	// Initialize wake word detector
	const initWakeWord = useCallback(async () => {
		try {
			// Get access key from environment variable
			const accessKey = import.meta.env.VITE_PORCUPINE_ACCESS_KEY;

			if (!accessKey) {
				console.warn("⚠️  VITE_PORCUPINE_ACCESS_KEY not found in environment");
				write(
					"\r\n⚠️  Wake word disabled: Missing access key. Set VITE_PORCUPINE_ACCESS_KEY in .env\r\n"
				);
				return false;
			}

			await wakeWordController.initialize({
				accessKey,
				keywordPath: "/porcupine/hey_gitty.ppn",
				modelPath: "/porcupine/porcupine_params.pv",
				sensitivity: 0.7,
			});

			// Load chime audio
			if (!chimeAudioRef.current) {
				chimeAudioRef.current = new Audio("/sounds/wake.mp3");
				chimeAudioRef.current.volume = 0.5;
			}

			return true;
		} catch (error) {
			console.error("❌ Failed to initialize wake word:", error);
			write(
				`\r\n⚠️  Wake word disabled: ${
					error instanceof Error ? error.message : "Unknown error"
				}\r\n`
			);
			write(
				"\r\n   You can still use Ctrl+Enter to activate voice commands.\r\n"
			);
			return false;
		}
	}, []);

	// Toggle wake word detection
	const toggleWakeWord = useCallback(async () => {
		if (wakeWordArmed) {
			// Disarm
			await wakeWordController.stopWakeword();
			setWakeWordArmed(false);
			setWakeWordStatus("idle");
			write("\r\n🔇 Wake word disarmed\r\n");
			prompt();
		} else {
			// Arm
			const initialized = await initWakeWord();
			if (!initialized) return;

			try {
				await wakeWordController.startWakeword();
				setWakeWordArmed(true);
				setWakeWordStatus("armed");
				write("\r\n🎤 Wake word armed - say 'Hey Gitty' to activate\r\n");
				prompt();
			} catch (error) {
				console.error("❌ Failed to start wake word:", error);
				write(
					`\r\n⚠️  Failed to arm wake word: ${
						error instanceof Error ? error.message : "Unknown error"
					}\r\n`
				);
				prompt();
			}
		}
	}, [wakeWordArmed, initWakeWord]);

	// Handle wake word detection - stable callback using refs
	const handleWakeWordDetection = useCallback(
		async (detection: WakeWordDetection) => {
			console.log("🎯 Wake word detected:", detection);

			// Play chime
			if (chimeAudioRef.current) {
				try {
					chimeAudioRef.current.currentTime = 0;
					await chimeAudioRef.current.play();
				} catch (error) {
					console.error("❌ Failed to play chime:", error);
				}
			}

			// Show detection message in terminal
			const term = termRef.current;
			if (term) {
				term.write(`\r\n🎤 "${detection.keyword}" detected!\r\n`);
			}

			// Trigger the same listening flow as Ctrl+Enter
			if (startListeningRef.current) {
				startListeningRef.current();
			}
		},
		[]
	); // Empty deps - uses refs only

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
		writeln("Press Ctrl + Enter to start talking to Gitty.");
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
				e.metaKey,
				"Shift:",
				e.shiftKey
			);

			// Ctrl+Enter to start speech recognition
			if (e.ctrlKey && e.code === "Enter") {
				console.log("🎯 Ctrl+Enter detected!");
				e.preventDefault();
				e.stopPropagation();

				if (!isListening) {
					console.log("🎤 Starting listening...");
					startListening();
				}
			}

			// Ctrl+Shift+G to toggle wake word
			if (e.ctrlKey && e.shiftKey && e.code === "KeyG") {
				console.log("🎯 Ctrl+Shift+G detected!");
				e.preventDefault();
				e.stopPropagation();
				toggleWakeWord();
			}
		};

		console.log("🎧 Keyboard listener attached, isListening:", isListening);
		window.addEventListener("keydown", handleKeyDown, true); // Use capture phase

		return () => {
			console.log("🎧 Keyboard listener removed");
			window.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [isListening, startListening, stopListening, toggleWakeWord]); // Include callbacks in dependencies

	// Register wake word detection callback (only once on mount)
	useEffect(() => {
		const unsubscribe = wakeWordController.onWake(handleWakeWordDetection);
		return () => {
			// Cleanup: unsubscribe callback and stop wake word
			unsubscribe();
			wakeWordController.stopWakeword();
		};
	}, []); // Empty deps - register only once, handleWakeWordDetection uses refs

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

			{/* Wake word armed indicator */}
			{wakeWordArmed && (
				<div
					style={{
						position: "absolute",
						top: "10px",
						right: "10px",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						background: "rgba(0, 100, 0, 0.8)",
						padding: "8px 12px",
						borderRadius: "6px",
						fontSize: "12px",
						color: "#0f0",
						fontFamily: "monospace",
						border: "1px solid #0f0",
						boxShadow: "0 0 10px rgba(0, 255, 0, 0.3)",
						zIndex: 100,
					}}
				>
					<span
						style={{
							width: "8px",
							height: "8px",
							borderRadius: "50%",
							background: "#0f0",
							boxShadow: "0 0 8px rgba(0, 255, 0, 0.8)",
							animation: "pulse 2s ease-in-out infinite",
						}}
					/>
					<span>🎤 "Hey Gitty" armed</span>
				</div>
			)}

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
