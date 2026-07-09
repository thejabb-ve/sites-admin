import { plugin } from 'bun';
import { compile, compileModule } from 'svelte/compiler';
import { readFileSync } from 'fs';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

const SVELTE_CLIENT = new URL(
  '../../node_modules/svelte/src/index-client.js',
  import.meta.url,
).pathname;

plugin({
  name: 'svelte loader',
  setup(builder) {
    builder.onLoad({ filter: /svelte\/src\/index-server\.js$/ }, () => ({
      contents: `export * from ${JSON.stringify(SVELTE_CLIENT)}`,
      loader: 'js',
    }));

    builder.onLoad({ filter: /\.svelte$/ }, ({ path }) => {
      const source = readFileSync(path, 'utf-8');
      const result = compile(source, {
        filename: path,
        generate: 'client',
        dev: false,
      });
      return { contents: result.js.code, loader: 'js' };
    });

    builder.onLoad({ filter: /\.svelte\.[jt]s$/ }, ({ path }) => {
      const source = readFileSync(path, 'utf-8');
      const result = compileModule(source, {
        filename: path,
        generate: 'client',
        dev: false,
      });
      return { contents: result.js.code, loader: 'js' };
    });
  },
});
