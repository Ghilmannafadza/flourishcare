import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE_URL, isNoindex, seoFor } from "@/config/seo";

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Memperbarui judul, deskripsi, canonical, kartu share, dan robots saat pindah halaman.
 * `base` = basename router (mis. "/book") agar path lengkap dipakai untuk lookup.
 * Dashboard tidak memakai komponen ini (judulnya diatur DashboardShell) tapi tetap noindex.
 */
export function Seo({ base = "" }: { base?: string }) {
  const { pathname } = useLocation();
  useEffect(() => {
    const full = (base + pathname).replace(/\/+$/, "") || "/";
    const s = seoFor(full);
    const noindex = s.noindex || isNoindex(full);
    const url = SITE_URL + (full === "/" ? "/" : full);
    const image = SITE_URL + s.image;
    if (!full.startsWith("/dashboard")) document.title = s.title;
    setMeta("name", "description", s.description);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    setMeta("property", "og:title", s.title);
    setMeta("property", "og:description", s.description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image);
    setMeta("property", "og:image:alt", s.imageAlt);
    setMeta("name", "twitter:title", s.title);
    setMeta("name", "twitter:description", s.description);
    setMeta("name", "twitter:image", image);
    setCanonical(url);
  }, [base, pathname]);
  return null;
}
