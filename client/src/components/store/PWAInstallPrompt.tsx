import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  if (!visible || !deferred) return null;
  async function install() {
    const installEvent = deferred;
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setDeferred(null);
    setVisible(false);
  }
  return (
    <div className="pwa-install-card" dir="rtl">
      <div>
        <strong>ثبّت المتجر كتطبيق</strong>
        <span>وصول أسرع وتجربة أفضل على الهاتف</span>
      </div>
      <button onClick={install} className="gold-button compact">
        <Download size={15} /> تثبيت
      </button>
      <button
        onClick={() => setVisible(false)}
        className="icon-button small"
        aria-label="إغلاق"
      >
        <X size={15} />
      </button>
    </div>
  );
}
