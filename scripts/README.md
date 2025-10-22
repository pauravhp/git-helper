# Setup Scripts

This directory contains setup scripts for the Git Helper application.

## download-vosk-model.sh

Downloads the Vosk speech recognition model automatically.

**What it does:**

- Downloads `vosk-model-small-en-us-0.15` from alphacephei.com (~39 MB)
- Extracts and converts to `.tar.gz` format (required by vosk-browser)
- Places it in `public/models/` directory
- Skips download if model already exists

**Usage:**

```bash
# Automatically runs after npm install
npm install

# Or run manually
npm run setup:vosk

# Or run the script directly
bash scripts/download-vosk-model.sh
```

**Why not in git?**

- The model is 39 MB (too large for git)
- Models can be updated independently
- Keeps the repository lightweight
- Downloads from official Vosk source

**Requirements:**

- `curl` for downloading
- `unzip` for extraction
- `tar` for compression
