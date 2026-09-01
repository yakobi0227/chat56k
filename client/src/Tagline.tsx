import { useEffect, useState } from "react";
import { TAGS } from "./tags";

export default function Tagline({ className }: { className?: string }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * TAGS.length));

  useEffect(() => {
    const id = window.setInterval(() => {
      setI((n) => (n + 1) % TAGS.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  return <span className={className}>{TAGS[i]}</span>;
}
