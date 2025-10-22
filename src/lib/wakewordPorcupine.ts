import { PorcupineWorker } from "@picovoice/porcupine-web";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";

/**
 * Wake word status
 */
export type WakeWordStatus =
	| "idle"
	| "initializing"
	| "armed"
	| "listening"
	| "error"
	| "disabled";

/**
 * Configuration for the wake word detector
 */
export interface WakeWordConfig {
	keywordPath?: string;
	modelPath?: string;
	accessKey: string;
	sensitivity?: number;
}

/**
 * Wake word detection result
 */
export interface WakeWordDetection {
	keyword: string;
	timestamp: number;
}

/**
 * Porcupine-based wake word detector for "Hey Gitty"
 * Renderer-only implementation using Web Workers
 */
class WakeWordController {
	private porcupine: PorcupineWorker | null = null;
	private webVoiceProcessor: WebVoiceProcessor | null = null;
	private status: WakeWordStatus = "idle";
	private wakeCallbacks: Array<(detection: WakeWordDetection) => void> = [];
	private lastDetectionTime = 0;
	private debounceMs = 2000; // 2 second debounce
	private config: WakeWordConfig | null = null;
	private initPromise: Promise<void> | null = null;

	/**
	 * Initialize the wake word detector
	 */
	async initialize(config: WakeWordConfig): Promise<void> {
		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = this._initialize(config);
		return this.initPromise;
	}

	private async _initialize(config: WakeWordConfig): Promise<void> {
		if (this.porcupine) {
			console.log("✅ Porcupine already initialized");
			return;
		}

		this.status = "initializing";
		this.config = config;

		const keywordPath = config.keywordPath || "/porcupine/hey_gitty.ppn";
		const modelPath = config.modelPath || "/porcupine/porcupine_params.pv";

		try {
			console.log("🎤 Initializing Porcupine wake word detector...");
			console.log("   Keyword:", keywordPath);
			console.log("   Model:", modelPath);

			// Check if assets exist
			await this.checkAssets(keywordPath, modelPath);

			// Initialize Porcupine worker with detection callback
			this.porcupine = await PorcupineWorker.create(
				config.accessKey,
				[
					{
						label: "Hey Gitty",
						publicPath: keywordPath,
						sensitivity: config.sensitivity || 0.7,
					},
				],
				(detection: any) => {
					// Detection callback
					this.handleDetection({
						keyword: detection.label,
						timestamp: Date.now(),
					});
				},
				{ publicPath: modelPath }
			);

			console.log("✅ Porcupine initialized successfully");
			this.status = "idle";
		} catch (error) {
			console.error("❌ Failed to initialize Porcupine:", error);
			this.status = "error";
			throw new Error(
				`Porcupine initialization failed: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}

	/**
	 * Check if required assets exist
	 */
	private async checkAssets(
		keywordPath: string,
		modelPath: string
	): Promise<void> {
		const checkAsset = async (path: string, name: string) => {
			try {
				const response = await fetch(path, { method: "HEAD" });
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
			} catch (error) {
				throw new Error(
					`Missing ${name} at ${path}. Please ensure the file exists in the public folder.`
				);
			}
		};

		await checkAsset(keywordPath, "keyword file (.ppn)");
		await checkAsset(modelPath, "model file (.pv)");
	}

	/**
	 * Start listening for the wake word
	 */
	async startWakeword(): Promise<void> {
		if (!this.porcupine) {
			throw new Error("Porcupine not initialized. Call initialize() first.");
		}

		if (this.status === "armed" || this.status === "listening") {
			console.log("⚠️  Wake word already active");
			return;
		}

		try {
			console.log("🎤 Starting wake word detection...");

			// Request microphone permission
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			stream.getTracks().forEach((track) => track.stop()); // Stop immediately, just checking permission

			// Start the web voice processor
			await WebVoiceProcessor.subscribe(this.porcupine);

			this.status = "armed";
			console.log("✅ Wake word armed - say 'Hey Gitty' to activate");
		} catch (error) {
			console.error("❌ Failed to start wake word:", error);
			this.status = "error";
			throw new Error(
				`Failed to start wake word: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}

	/**
	 * Stop listening for the wake word
	 */
	async stopWakeword(): Promise<void> {
		if (!this.porcupine) {
			return;
		}

		try {
			console.log("🛑 Stopping wake word detection...");
			await WebVoiceProcessor.unsubscribe(this.porcupine);
			this.status = "idle";
			console.log("✅ Wake word disarmed");
		} catch (error) {
			console.error("❌ Failed to stop wake word:", error);
		}
	}

	/**
	 * Handle wake word detection
	 */
	private handleDetection(data: { keyword: string; timestamp: number }): void {
		const now = Date.now();

		// Debounce: ignore detections within debounce window
		if (now - this.lastDetectionTime < this.debounceMs) {
			console.log("⏸️  Wake word ignored (debounce)");
			return;
		}

		this.lastDetectionTime = now;
		const label = data.keyword || "Hey Gitty";

		console.log(`🎯 Wake word detected: "${label}"`);

		const detection: WakeWordDetection = {
			keyword: label,
			timestamp: now,
		};

		// Notify all callbacks
		this.wakeCallbacks.forEach((cb) => {
			try {
				cb(detection);
			} catch (error) {
				console.error("❌ Error in wake word callback:", error);
			}
		});
	}

	/**
	 * Register a callback for wake word detection
	 */
	onWake(callback: (detection: WakeWordDetection) => void): () => void {
		this.wakeCallbacks.push(callback);

		// Return unsubscribe function
		return () => {
			const index = this.wakeCallbacks.indexOf(callback);
			if (index > -1) {
				this.wakeCallbacks.splice(index, 1);
			}
		};
	}

	/**
	 * Check if wake word detection is active
	 */
	isActive(): boolean {
		return this.status === "armed" || this.status === "listening";
	}

	/**
	 * Get current status
	 */
	getStatus(): WakeWordStatus {
		return this.status;
	}

	/**
	 * Get status as human-readable string
	 */
	getStatusMessage(): string {
		switch (this.status) {
			case "idle":
				return "Wake word inactive";
			case "initializing":
				return "Initializing wake word detector...";
			case "armed":
				return 'Say "Hey Gitty" to activate';
			case "listening":
				return "Wake word detected, listening...";
			case "error":
				return "Wake word error (check console)";
			case "disabled":
				return "Wake word disabled";
			default:
				return "Unknown status";
		}
	}

	/**
	 * Clean up resources
	 */
	async destroy(): Promise<void> {
		await this.stopWakeword();

		if (this.porcupine) {
			await this.porcupine.terminate();
			this.porcupine = null;
		}

		this.wakeCallbacks = [];
		this.status = "idle";
		this.initPromise = null;
		console.log("✅ Wake word controller destroyed");
	}

	/**
	 * Set debounce time (in milliseconds)
	 */
	setDebounce(ms: number): void {
		this.debounceMs = ms;
		console.log(`⏱️  Wake word debounce set to ${ms}ms`);
	}
}

// Export singleton instance
export const wakeWordController = new WakeWordController();
