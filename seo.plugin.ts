// Plugin Vite: SEO & GEO statis.
// - Menyisipkan meta tag + kartu share + JSON-LD ke index.html.
// - Saat build: membuat dist/<halaman>/index.html per halaman (kartu share berbeda per link),
//   sitemap.xml, robots.txt, llms.txt, dan site.webmanifest.
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { ROUTES, SITE_URL, SITE_NAME, THEME_COLOR, structuredData, type RouteSeo } from "./src/config/seo";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function head(r: RouteSeo) {
  const url = SITE_URL + (r.path === "/" ? "/" : r.path);
  const img = SITE_URL + r.image;
  const robots = r.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1";
  const ld = JSON.stringify(structuredData()).replace(/</g, "\\u003c");
  return [
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(r.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta name="theme-color" content="${THEME_COLOR}" />`,
    `<meta name="application-name" content="${SITE_NAME}" />`,
    `<meta name="geo.region" content="ID-JK" />`,
    `<meta name="geo.placename" content="Ciracas, Jakarta Timur" />`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
    `<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<link rel="manifest" href="/site.webmanifest" />`,
    `<link rel="alternate" type="text/plain" href="/llms.txt" title="LLM summary" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="id_ID" />`,
    `<meta property="og:title" content="${esc(r.title)}" />`,
    `<meta property="og:description" content="${esc(r.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:secure_url" content="${img}" />`,
    `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(r.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(r.title)}" />`,
    `<meta name="twitter:description" content="${esc(r.description)}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    `<meta name="twitter:image:alt" content="${esc(r.imageAlt)}" />`,
    `<script type="application/ld+json">${ld}</script>`,
  ].join("\n    ");
}

function mdToHtml(lines: string[]) {
  let out = "";
  let inList = false;
  for (const l of lines) {
    const li = l.startsWith("- ");
    if (li && !inList) { out += "<ul>"; inList = true; }
    if (!li && inList) { out += "</ul>"; inList = false; }
    if (l.startsWith("## ")) out += `<h2>${esc(l.slice(3))}</h2>`;
    else if (l.startsWith("# ")) out += `<h1>${esc(l.slice(2))}</h1>`;
    else if (li) out += `<li>${esc(l.slice(2))}</li>`;
    else out += `<p>${esc(l)}</p>`;
  }
  if (inList) out += "</ul>";
  return out;
}

// Ringkasan teks untuk crawler yang tidak menjalankan JavaScript (diganti React saat app dimuat).
function body(r: RouteSeo) {
  const nav = ROUTES.filter((x) => !x.noindex)
    .map((x) => `<a href="${x.path}">${esc(x.title.split(" | ")[0])}</a>`)
    .join(" ");
  return `<div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">${mdToHtml(r.summary)}<nav>${nav}</nav></div>`;
}

function inject(html: string, r: RouteSeo) {
  return html
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, `<!--seo:start-->\n    ${head(r)}\n    <!--seo:end-->`)
    .replace(/<!--seob:start-->[\s\S]*?<!--seob:end-->/, `<!--seob:start-->${body(r)}<!--seob:end-->`);
}

function llmsTxt() {
  const pub = ROUTES.filter((r) => !r.noindex);
  const home = pub[0];
  let t = `# FlourishCare.id\n\n> ${home.description}\n\n`;
  t += "Informasi kunci:\n";
  t += "- Nama: FlourishCare.id (FlourishCare)\n";
  t += "- Jenis: layanan/klinik tumbuh kembang anak (psikolog anak & terapis)\n";
  t += "- Lokasi: Klinik Mitra Diani Lantai 2, Jl. PKP Raya No.1, Kelapa Dua Wetan, Ciracas, Jakarta Timur, DKI Jakarta, Indonesia\n";
  t += "- Email: Flourishcare.id@gmail.com\n";
  t += "- Instagram: https://instagram.com/flourishcare.id\n";
  t += "- Booking konsultasi psikolog online: https://flourishcare.id/book\n";
  t += "- Formulir pendaftaran pasien baru: https://flourishcare.id/assessment\n\n";
  t += "## Halaman\n\n";
  for (const r of pub) t += `- [${r.title}](${SITE_URL}${r.path === "/" ? "/" : r.path}): ${r.description}\n`;
  for (const r of pub) {
    t += `\n${r.summary.map((l) => (l.startsWith("# ") ? "#" + l : l)).join("\n")}\n`;
  }
  return t;
}

export function seoPlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "flourishcare-seo",
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    transformIndexHtml(html) {
      return inject(html, ROUTES[0]);
    },
    closeBundle() {
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) return;
      const base = fs.readFileSync(indexPath, "utf8");
      for (const r of ROUTES) {
        if (r.path === "/") continue;
        const dir = path.join(outDir, r.path);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), inject(base, r));
      }
      const today = new Date().toISOString().slice(0, 10);
      const urls = ROUTES.filter((r) => !r.noindex)
        .map(
          (r) =>
            `  <url>\n    <loc>${SITE_URL}${r.path === "/" ? "/" : r.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq ?? "monthly"}</changefreq>\n    <priority>${(r.priority ?? 0.5).toFixed(1)}</priority>\n    <image:image><image:loc>${SITE_URL}${r.image}</image:loc></image:image>\n  </url>`
        )
        .join("\n");
      fs.writeFileSync(
        path.join(outDir, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`
      );
      fs.writeFileSync(
        path.join(outDir, "robots.txt"),
        [
          "# FlourishCare.id",
          "# Mesin pencari & asisten AI dipersilakan membaca halaman publik.",
          "User-agent: *",
          "Allow: /",
          "Disallow: /dashboard",
          "Disallow: /portal",
          "Disallow: /login",
          "Disallow: /book/profile",
          "Disallow: /book/schedule",
          "Disallow: /book/payment",
          "",
          ...["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "meta-externalagent"].flatMap((ua) => [
            `User-agent: ${ua}`,
            "Allow: /",
            "Disallow: /dashboard",
            "Disallow: /portal",
            "",
          ]),
          `Sitemap: ${SITE_URL}/sitemap.xml`,
          "",
        ].join("\n")
      );
      fs.writeFileSync(path.join(outDir, "llms.txt"), llmsTxt());
      fs.writeFileSync(
        path.join(outDir, "site.webmanifest"),
        JSON.stringify(
          {
            name: "FlourishCare.id",
            short_name: "FlourishCare",
            description: ROUTES[0].description,
            start_url: "/",
            display: "standalone",
            background_color: "#FDFCF8",
            theme_color: THEME_COLOR,
            lang: "id",
            icons: [
              { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
              { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
              { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
          },
          null,
          2
        )
      );
    },
  };
}
