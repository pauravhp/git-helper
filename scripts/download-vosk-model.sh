#!/bin/bash
# Download Vosk model for offline speech recognition

set -e

MODEL_NAME="vosk-model-small-en-us-0.15"
MODEL_URL="https://alphacephei.com/vosk/models/${MODEL_NAME}.zip"
MODEL_DIR="public/models"

echo "📥 Downloading Vosk speech recognition model..."
echo "   Model: ${MODEL_NAME}"
echo "   Size: ~39 MB (compressed)"
echo ""

# Create models directory if it doesn't exist
mkdir -p "${MODEL_DIR}"

# Check if model already exists
if [ -f "${MODEL_DIR}/${MODEL_NAME}.tar.gz" ]; then
    echo "✅ Model already exists at ${MODEL_DIR}/${MODEL_NAME}.tar.gz"
    echo "   Skipping download."
    exit 0
fi

# Download the model
echo "⬇️  Downloading from ${MODEL_URL}..."
curl -L -o "${MODEL_DIR}/${MODEL_NAME}.zip" "${MODEL_URL}"

echo "📦 Extracting model..."
cd "${MODEL_DIR}"
unzip -q "${MODEL_NAME}.zip"

# Convert to tar.gz (vosk-browser expects .tar.gz)
echo "🗜️  Converting to tar.gz format..."
tar -czf "${MODEL_NAME}.tar.gz" "${MODEL_NAME}"

# Clean up
rm "${MODEL_NAME}.zip"

echo "✅ Vosk model installed successfully!"
echo "   Location: ${MODEL_DIR}/${MODEL_NAME}.tar.gz"
echo ""
echo "🚀 You can now run: npm run dev"
