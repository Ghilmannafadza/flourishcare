import { useEffect, useRef, useState } from "react";
import { Eraser, Upload } from "lucide-react";

/** Kanvas tanda tangan (coret dengan mouse/jari) atau unggah gambar → PNG data URL ter-trim. */
export function SignaturePad({ value, onChange }: { value: string | null; onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [mode, setMode] = useState<"view" | "draw">(value ? "view" : "draw");

  useEffect(() => {
    if (mode !== "draw") return;
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const g = c.getContext("2d")!;
    g.scale(ratio, ratio);
    g.lineWidth = 2.2;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "#111";
    dirty.current = false;
  }, [mode]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  }

  function finish() {
    drawing.current = false;
    if (!dirty.current || !ref.current) return;
    onChange(trimCanvas(ref.current));
  }

  async function fromFile(f: File) {
    const url = await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => res(String(fr.result));
      fr.readAsDataURL(f);
    });
    const img = new Image();
    await new Promise((res) => {
      img.onload = res;
      img.src = url;
    });
    const k = Math.min(1, 600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    onChange(c.toDataURL("image/png"));
    setMode("view");
  }

  return (
    <div>
      {mode === "view" && value ? (
        <div className="bg-white border border-black/10 rounded-2xl h-36 flex items-center justify-center">
          <img src={value} alt="Tanda tangan" className="max-h-32 max-w-full object-contain" />
        </div>
      ) : (
        <canvas
          ref={ref}
          className="w-full h-36 bg-white border border-dashed border-black/20 rounded-2xl touch-none cursor-crosshair"
          onPointerDown={(e) => {
            drawing.current = true;
            dirty.current = true;
            const g = e.currentTarget.getContext("2d")!;
            const [x, y] = pos(e);
            g.beginPath();
            g.moveTo(x, y);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const g = e.currentTarget.getContext("2d")!;
            const [x, y] = pos(e);
            g.lineTo(x, y);
            g.stroke();
          }}
          onPointerUp={finish}
          onPointerLeave={() => drawing.current && finish()}
        />
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setMode("draw");
          }}
          className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 inline-flex items-center gap-1"
        >
          <Eraser size={12} /> {mode === "view" ? "Coret ulang" : "Bersihkan"}
        </button>
        <label className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 inline-flex items-center gap-1 cursor-pointer">
          <Upload size={12} /> Unggah gambar
          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && void fromFile(e.target.files[0])} />
        </label>
        <span className="text-[11px] text-text-secondary self-center">Coret di kotak dengan mouse/jari, atau unggah foto tanda tangan (latar putih).</span>
      </div>
    </div>
  );
}

function trimCanvas(c: HTMLCanvasElement): string {
  const g = c.getContext("2d")!;
  const { width, height } = c;
  const d = g.getImageData(0, 0, width, height).data;
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (d[(y * width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
  if (x1 <= x0 || y1 <= y0) return c.toDataURL("image/png");
  const pad = 6;
  const out = document.createElement("canvas");
  out.width = x1 - x0 + pad * 2;
  out.height = y1 - y0 + pad * 2;
  out.getContext("2d")!.drawImage(c, x0 - pad, y0 - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
