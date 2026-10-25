// Checks the public pages of a running server.  BASE=http://localhost:3000 npm run seo:audit
const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
const PUBLIC = ["/", "/dining", "/about", "/contact", "/privacy", "/terms"];
const PRIVATE = ["/student/dashboard", "/staff/dashboard", "/admin/dashboard", "/cafe/C1", "/dashboard"];
const REDIRECTS = { "/login": "/", "/signin": "/", "/home": "/", "/cafes": "/dining", "/contact-us": "/contact", "/privacy-policy": "/privacy" };

const failures = [];
const fail = (url, msg) => failures.push(`${url}: ${msg}`);
const get = (path, init) => fetch(BASE + path, { redirect: "manual", ...init });
const all = (re, html) => [...html.matchAll(re)];
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

const titles = new Map();
const descriptions = new Map();
const sitemap = await (await get("/sitemap.xml")).text();
const links = new Set();

for (const path of PUBLIC) {
  const r = await get(path);
  if (r.status !== 200) {
    fail(path, `status ${r.status}`);
    continue;
  }
  const html = await r.text();
  const h1 = all(/<h1[\s>]/g, html).length;
  if (h1 !== 1) fail(path, `${h1} <h1> elements (want 1)`);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  if (!title || title.length > 65) fail(path, `title missing or over 65 chars: "${title}"`);
  if (titles.has(title)) fail(path, `title duplicates ${titles.get(title)}`);
  titles.set(title, path);
  const desc = attr(html.match(/<meta name="description"[^>]*>/)?.[0] ?? "", "content") ?? "";
  if (desc.length < 70 || desc.length > 160) fail(path, `description length ${desc.length} (want 70-160)`);
  if (descriptions.has(desc)) fail(path, `description duplicates ${descriptions.get(desc)}`);
  descriptions.set(desc, path);
  const canon = all(/<link rel="canonical"[^>]*>/g, html);
  if (canon.length !== 1) fail(path, `${canon.length} canonical links`);
  else if (new URL(attr(canon[0][0], "href")).pathname !== path) fail(path, `canonical is ${attr(canon[0][0], "href")}`);
  const og = attr(html.match(/<meta property="og:image"[^>]*>/)?.[0] ?? "", "content");
  if (!og) fail(path, "no og:image");
  else {
    const u = new URL(og);
    if ((await fetch(BASE + u.pathname + u.search)).status !== 200) fail(path, `og:image ${og} not 200`);
  }
  for (const [img] of all(/<img\b[^>]*>/g, html)) if (!/\salt="/.test(img)) fail(path, `img without alt: ${img.slice(0, 80)}`);
  if (!sitemap.includes(`${path === "/" ? "/<" : path + "<"}`)) fail(path, "not in sitemap.xml");
  for (const [, href] of all(/<a\b[^>]*href="(\/[^"#?]*)/g, html)) links.add(href);
}

for (const href of links) {
  const r = await get(href);
  if (r.status === 404) fail(href, "internal link is 404");
}

const nf = await get("/does-not-exist-" + Date.now());
if (nf.status !== 404) fail("/does-not-exist", `status ${nf.status} (want 404)`);

for (const [from, to] of Object.entries(REDIRECTS)) {
  const r = await get(from);
  const loc = r.headers.get("location") ?? "";
  if (r.status !== 301 || new URL(loc, BASE).pathname !== to) fail(from, `got ${r.status} → ${loc} (want 301 → ${to})`);
}

for (const path of PRIVATE) {
  const r = await get(path);
  if (!/noindex/.test(r.headers.get("x-robots-tag") ?? "")) fail(path, "missing X-Robots-Tag: noindex");
}

const robots = await (await get("/robots.txt")).text();
for (const p of ["/admin", "/staff", "/student", "/api/"]) if (!robots.includes(`Disallow: ${p}`)) fail("/robots.txt", `does not disallow ${p}`);
if (!/Sitemap: .*\/sitemap\.xml/.test(robots)) fail("/robots.txt", "no Sitemap line");

if (failures.length) {
  console.error(`SEO audit failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`SEO audit passed: ${PUBLIC.length} public pages, ${links.size} internal links, ${Object.keys(REDIRECTS).length} redirects, ${PRIVATE.length} private routes.`);
