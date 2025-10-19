import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

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

	const write = (s: string) => termRef.current?.write(s);
	const writeln = (s = "") => write(s + "\r\n");
	const prompt = () => write("\r\n$ git ");

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

			if (code === 13) {
				const line = inputBuf.current.trim();
				inputBuf.current = "";
				writeln("");

				if (!line) {
					prompt();
					return;
				}

				const args = splitArgs(line);
				const res = await window.api.execGit(args);
				if (!res.output && !res.err) writeln("(no output)");
				writeln(`(exit ${res.code ?? -1})`);
				prompt();
				return;
			}

			if (code === 127) {
				if (inputBuf.current.length > 0) {
					write("\b \b");
					inputBuf.current = inputBuf.current.slice(0, -1);
				}
				return;
			}

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

	return <div id="xterm-root" style={{ height: "100%", background: "#000" }} />;
}
