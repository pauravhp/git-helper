# 🎙️ Gitty: Your Voice-Controlled Git Terminal

> **"A calmer, safer, and more explainable way to use Git — powered by voice and AI."**

---

## 🧭 Overview

**Gitty** is a desktop application that transforms the Git experience into a **voice-driven, anxiety-free workflow**.  
Built with **Electron, React, and TypeScript**, it combines **Speech Recognition**, a **Groq LLM**, and a **real PTY terminal** to help developers perform Git operations using natural language — with full transparency and zero risk.

Simply **speak your intent**:

> “Create a new branch for the login feature.”

…and the app:

1. Transcribes your speech.
2. Uses an LLM (via **Groq API**) to interpret intent.
3. Takes a **live snapshot of your repository** (branch, upstream, changes, etc.).
4. Displays the **exact Git command** and a **plain-English explanation**.
5. Waits for your confirmation — **you stay in control**.

No destructive actions.  
No blind execution.  
No Git anxiety.

---

## 💡 Why This Matters

Even experienced developers feel a twinge of stress before running high-impact Git commands.  
Syntax errors, missing upstreams, or accidental resets can have serious consequences in shared codebases.

The Voice-Controlled Git Coach helps professionals:

- **Understand** what each command will do before running it.
- **Trust** that actions are safe and explainable.
- **Learn** the rationale behind commands over time.
- **Reduce cognitive load** under time pressure.

---

## 👤 Target Persona

**Alex Chen** — Mid-level software engineer, comfortable with Git but often juggling multiple branches and deadlines.  
He knows Git inside out, but that small voice of doubt — _“Am I about to break something?”_ — never quite goes away.  
This app quiets that voice by showing him exactly what will happen before anything runs.

---

## 🧩 Key Features

| Feature                           | Description                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 🎙️ **Voice-to-Git**               | Speak natural commands like "commit my changes" or "undo the last commit."                                     |
| 🔊 **Wake Word Detection**        | Say "Hey Gitty" to activate voice control hands-free (optional, requires Porcupine access key).                |
| 🧠 **Context-Aware AI**           | Uses live repo snapshots (branch, upstream, ahead/behind, uncommitted changes) to interpret intent accurately. |
| 💬 **Plain-English Explanations** | Every command is accompanied by a short, human-readable explanation of its impact.                             |
| ✅ **Pre-flight Confirmation**    | The app never executes automatically — you always see the command first.                                       |
| 🧱 **Real Terminal Core**         | Built on `child_processes` and `xterm.js`; runs genuine shell commands, not simulations.                       |
| 🧭 **Minimalist UI**              | A clean terminal interface with only essential overlays: `Idle / Listening / Parsing / Ready`.                 |

---

## 🧠 Architecture

```
User Speaks
   ↓
Vosk (Speech-to-Text)
   ↓
Repo Snapshot Collector (branch, upstream, status, ahead/behind)
   ↓
Groq LLM (Intent + JSON Response)
   ↓
Command Validation (One line explanation)
   ↓
Confirmation Overlay (Command + Explanation)
   ↓
User Confirms → executes command → Output streams to xterm.js
```

---

## ⚙️ Tech Stack

| Layer              | Technology                       |
| ------------------ | -------------------------------- |
| Desktop Shell      | **Electron**                     |
| Frontend           | **React + Vite + TypeScript**    |
| Terminal           | **xterm.js**                     |
| AI Engine          | **Groq LLM API (Llama 3.3 70B)** |
| Speech Recognition | **Vosk (offline STT)**           |
| Wake Word          | **Porcupine (Picovoice)**        |
| Validation         | **Zod + jsonrepair**             |
| Styling            | **Tailwind CSS**                 |
| Packaging          | **electron-builder**             |

---

## ⚙️ Installation & Setup

### Prerequisites

- **Node.js:** ≥ 22.12 (or 20.19 LTS)
- **npm**
- **Groq API Key** (obtain from [console.groq.com](https://console.groq.com))
- **Porcupine Access Key** (optional, for wake word detection from [console.picovoice.ai](https://console.picovoice.ai))
- Only Possible on MacOS :(

### Clone & Install

```bash
git clone git@github.com:pauravhp/git-helper.git
cd git-helper
npm install
```

**Note:** `npm install` automatically downloads the Vosk speech recognition model (~39 MB). If you need to manually download it later:

```bash
npm run setup:vosk
```

### Electron Compilation

```bash
npm run transpile:electron
```

### Build Production Executable

```bash
npm run dist:mac     # macOS
```

### Add Environment Variables

Create a `.env` file in the project root (or copy from `.env.example`):

```bash
# Required: Groq API for LLM inference
VITE_GROQ_API_KEY=your_groq_api_key_here

# Optional: Porcupine wake word detection
# Without this, you can still use Ctrl+Enter to activate voice
VITE_PORCUPINE_ACCESS_KEY=your_porcupine_access_key_here
```

### Run in Development

```bash
npm run dev
```

The packaged app will appear in `/dist`.

---

## 🎤 Voice Control Usage

### Manual Activation (Ctrl+Enter)

1. Press **Ctrl+Enter** anywhere in the terminal
2. Speak your Git command when you see "🎙 Listening..."
3. Wait for the 2-second silence detection to complete
4. Review the suggested command and confirm/cancel

### Wake Word Activation (Optional)

1. Press **Ctrl+Shift+G** to arm the wake word detector
2. You'll see a green indicator: 🎤 "Hey Gitty" armed
3. Say **"Hey Gitty"** to activate voice listening
4. A chime will play and the same listening flow starts
5. Press **Ctrl+Shift+G** again to disarm

**Note:** Wake word requires `VITE_PORCUPINE_ACCESS_KEY` in your `.env` file. Get a free key from [Picovoice Console](https://console.picovoice.ai). Look into public/porcupine/README.md for more details.

---

## 🔐 Safety Philosophy

- **Human confirmation required:** Every command requires user consent.
- **Explain before execute:** Transparency first, automation second.

---

## 🚀 Roadmap

- [ ] Multi-language STT support.
- [ ] Advanced “scenario explanations” for educational use.
- [ ] Wake word "Hey Gitty"

---

## 👥 Contributors

- **Paurav Hosur Param**
- **Abhay Anoop C**
- **Vivek Reddy**
- **Daniaal Tahir Mahmood**

---

## 🧭 Vision

Git should feel empowering — not intimidating.  
The Voice-Controlled Gitty brings **clarity, confidence, and calm** to one of the most essential tools in software development.

> “See before you run.”  
> **Understand Git. Reduce anxiety. Stay in control.**

---

## 🪪 License

MIT © 2025 Team Gitty
