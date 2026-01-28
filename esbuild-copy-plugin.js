import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

export default {
  name: 'copy-config-files',
  setup(build) {
    build.onEnd(() => {
      // Copy config directory to bundle output
      const sourceDir = 'config';
      const targetDir = join(dirname(build.initialOptions.outfile), 'config');

      function copyRecursive(src, dest) {
        try {
          const stat = statSync(src);
          if (stat.isDirectory()) {
            mkdirSync(dest, { recursive: true });
            const files = readdirSync(src);
            files.forEach(file => {
              copyRecursive(join(src, file), join(dest, file));
            });
          } else {
            mkdirSync(dirname(dest), { recursive: true });
            copyFileSync(src, dest);
          }
        } catch (err) {
          console.log(`Copy ${src} to ${dest} skipped:`, err.message);
        }
      }

      copyRecursive(sourceDir, targetDir);
      console.log('📁 Copied config directory to bundle');
    });
  },
};
