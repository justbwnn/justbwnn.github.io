// Generate data/projects.json from GitHub API. Jalankan: gh auth token | node sync-projects.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";

const dir = new URL(".", import.meta.url).pathname.replace(/^\//, "");
const TOKEN = (process.env.GH_TOKEN || "").trim() || process.argv[2];
assert.ok(TOKEN, "token GitHub wajib: set GH_TOKEN atau `gh auth token`");

const res = await fetch("https://api.github.com/users/justbwnn/repos?per_page=100&sort=updated", {
  headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${TOKEN}` }
});
assert.equal(res.status, 200, `GitHub API status ${res.status}`);
const repos = await res.json();

const SKIP = new Set(["justbwnn.github.io"]);
const LANG_TAG = {
  JavaScript: "web", TypeScript: "web", HTML: "web", CSS: "web", Astro: "web", Vue: "web",
  Python: "python", Jupyter: "python",
  Shell: "tools", PowerShell: "tools", Dockerfile: "tools", Makefile: "tools"
};
const list = repos
  .filter(r => !r.fork && !SKIP.has(r.name))
  .map(r => ({
    name: r.name,
    url: r.html_url,
    home: r.homepage || "",
    desc: r.description || "Tanpa deskripsi.",
    lang: r.language || "",
    tag: LANG_TAG[r.language] || "lainnya",
    pushed: new Date(r.pushed_at).getFullYear()
  }));

mkdirSync(dir + "/data", { recursive: true });
writeFileSync(dir + "/data/projects.json", JSON.stringify({ at: new Date().toISOString(), repos: list }, null, 2));
console.log(`OK — ${list.length} proyek -> data/projects.json`);
