
      import { defineConfig } from 'vite';

      export default defineConfig({
        server: {
          fs: {
            allow: [
              // Allow the template project path which contains node_modules
              'c:\\Users\\Pavithran\\.vscode\\extensions\\robothy.slidev-copilot-0.1.4\\resources\\slidev-template',
              // Allow the session project path
              'c:\\Users\\Pavithran\\India Innovates\\.slidev\\slidev-2026-03-10-15-19-17-47def763',
              // Add the root directory containing the node_modules
              'c:\\Users\\Pavithran\\.vscode\\extensions\\robothy.slidev-copilot-0.1.4\\resources'
            ]
          }
        }
      });
    