// Dumps every built Fallen fight's one-line rule to docs/ten-isles/fallen-rules.md, so new Fall builders
// can see what is taken. Run before launching a wave: `node .list-fallen-rules.mjs`.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
const root = 'src/isles/content';
const names = [];
const out = ['# Fallen fights already built — do not repeat these rules', ''];
for (const isle of readdirSync(root)) {
  const courts = `${root}/${isle}/courts`;
  if (!existsSync(courts)) continue;
  for (const court of readdirSync(courts)) {
    const dir = `${courts}/${court}/fallen`;
    if (!existsSync(dir)) continue;
    if (existsSync(`${dir}/index.ts`)) {
      for (const n of readFileSync(`${dir}/index.ts`, 'utf8').matchAll(/foeName:\s*(['"`])(.*?)\1/g)) names.push(n[2].replace(/\\'/g, "'"));
    }
    for (const f of readdirSync(dir)) {
      const m = /^\s*rules:\s*(['"`])([\s\S]*?)\1,?\s*$/m.exec(readFileSync(`${dir}/${f}`, 'utf8'));
      if (m) out.push(`- ${isle}/${court}: ${m[2].replace(/\s+/g, ' ').replace(/\\'/g, "'")}`);
    }
  }
}
out.push('', '## Names taken — use no first name or surname from this list', '', names.join(' · '));
writeFileSync('docs/ten-isles/fallen-rules.md', out.join('\n') + '\n');
console.log(`${out.length - 2} rules`);
