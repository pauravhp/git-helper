# Git Helper - Electron App

An Electron-based Git helper application built with React, TypeScript, and Vite.

## Prerequisites

Before setting up the project, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)

   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

2. **Git**

   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

3. **Code Editor** (recommended)
   - VS Code: https://code.visualstudio.com/

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/pauravhp/git-helper.git
cd git-helper
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:

- Electron
- React & TypeScript
- Vite (build tool)
- All development dependencies

### 3. Development Setup

The project uses a dual TypeScript configuration:

- Main process: ESM modules
- Preload script: CommonJS modules (required by Electron)

## Running the Application

### Development Mode (Recommended for development)

```bash
npm run dev
```

This command:

- Starts the React development server (Vite)
- Compiles TypeScript files for Electron
- Launches the Electron app with hot reload
- Enables Chrome DevTools for debugging

### Alternative Development Commands

```bash
# Run only the React dev server
npm run dev:react

# Compile Electron TypeScript files
npm run transpile:electron

# Run only the Electron app (after transpilation)
npm run dev:electron
```

## Building for Distribution

### Windows Distribution

```bash
npm run dist:win
```

**Note:** You'll need to add this script to package.json:

```json
{
	"scripts": {
		"dist:win": "npm run transpile:electron && npm run build && electron-builder --win"
	}
}
```

### Production Build (Web version)

```bash
npm run build
npm run preview
```

## Troubleshooting

### Common Windows Issues

1. **Permission Errors**

   - Run Command Prompt or PowerShell as Administrator
   - Ensure antivirus isn't blocking Node.js/npm

2. **Long Path Issues**

   - Enable long paths in Windows 10/11:
     ```cmd
     # Run as Administrator
     reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1
     ```

3. **Node.js Version Issues**

   - Use Node Version Manager for Windows (nvm-windows)
   - Download from: https://github.com/coreybutler/nvm-windows

4. **Build Errors**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`
   - Ensure Windows Build Tools are installed: `npm install --global windows-build-tools`

### Environment Variables

For development, you may need to set:

```bash
# Windows Command Prompt
set NODE_ENV=development

# Windows PowerShell
$env:NODE_ENV="development"
```

## Project Structure

```
git-helper/
├── electron/                 # Electron main process files
│   ├── main.ts              # Main Electron process (ESM)
│   ├── preload.ts           # Preload script (CommonJS)
│   ├── tsconfig.json        # TypeScript config for main process
│   └── tsconfig.preload.json # TypeScript config for preload
├── src/                     # React application
│   ├── components/          # React components
│   ├── types/              # TypeScript type definitions
│   └── main.tsx            # React entry point
├── dist-electron/          # Compiled Electron files
├── dist-react/            # Built React application
└── package.json           # Dependencies and scripts
```

## Available Scripts

| Command                      | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `npm run dev`                | Start development mode with hot reload           |
| `npm run build`              | Build React app for production                   |
| `npm run transpile:electron` | Compile Electron TypeScript files                |
| `npm run dist:mac`           | Build macOS distribution                         |
| `npm run dist:win`           | Build Windows distribution (add to package.json) |

## Technologies Used

- **Electron**: Desktop app framework
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **xterm.js**: Terminal emulator component

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly on your platform
4. Submit a pull request

## Support

For Windows-specific issues, check:

- Node.js and npm are properly installed
- Windows Defender/antivirus isn't blocking the application
- You have the latest Windows updates installed
  tseslint.configs.stylisticTypeChecked,

        // Other configs...
      ],
      languageOptions: {
        parserOptions: {
          project: ['./tsconfig.node.json', './tsconfig.app.json'],
          tsconfigRootDir: import.meta.dirname,
        },
        // other options...
      },

  },
  ])

````

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
````
