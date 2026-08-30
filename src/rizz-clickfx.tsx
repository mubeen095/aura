import { useEffect, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import MouseEffects from "../components/originkit/ui/clickeffects";
import InteractiveGrid from "./components/originkit/ui/interactive-grid";
import "./rizz-clickfx.css";

const MOUNT_ID = "rizz-clickfx";
const LABEL_FONT: CSSProperties = {
  fontFamily: "Inter, Gilroy-SemiBold, sans-serif",
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase"
};

function RizzClickFx() {
  const [labelOn, setLabelOn] = useState(true);

  useEffect(() => {
    const hide = () => setLabelOn(false);
    document.addEventListener("click", hide, { once: true });
    const timer = window.setTimeout(hide, 4000);
    return () => {
      document.removeEventListener("click", hide);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <MouseEffects
      interactionMode="sniper"
      showLabel={labelOn}
      labelText="Click Anywhere"
      labelFont={LABEL_FONT}
    />
  );
}

const rootEl = document.getElementById(MOUNT_ID);
if (rootEl) {
  createRoot(rootEl).render(<RizzClickFx />);
}

const gridEl = document.getElementById("interactive-grid");
if (gridEl && !gridEl.dataset.mounted) {
  gridEl.dataset.mounted = "true";
  const gridImages = Array.from(
    { length: 10 },
    (_, i) => `/originkit-images/interactive-grid/logos-${i + 1}.png`
  );
  createRoot(gridEl).render(
    <InteractiveGrid images={gridImages} style={{ position: "absolute", inset: 0 }} />
  );
}