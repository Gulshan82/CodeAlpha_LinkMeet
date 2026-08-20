import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';

const InstallPwaBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const inStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (inStandalone) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Listen for beforeinstallprompt event (Android / Desktop Chrome / Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show banner for iOS if not already dismissed in this session
    if (iosDevice && !sessionStorage.getItem('pwa_banner_dismissed')) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (isStandalone || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-white dark:bg-slate-900 border border-primary-200 dark:border-primary-900/60 p-4 rounded-2xl shadow-2xl z-50 animate-bounce-slow text-slate-800 dark:text-white backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
        title="Close"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3.5">
        <img
          src="/pwa-192x192.png"
          alt="LinkMeet Logo"
          className="w-12 h-12 rounded-xl border border-primary-300 dark:border-primary-800 object-cover shrink-0 shadow-md"
        />

        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">Install LinkMeet App</h4>
            <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 rounded-md border border-primary-200 dark:border-primary-900">
              PWA
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
            {isIOS
              ? "Install LinkMeet on your iPhone/iPad: tap the Share icon below and select 'Add to Home Screen'."
              : "Get the fast, full-screen mobile app experience on your phone."}
          </p>

          {!isIOS ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-primary-950/30"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
              >
                Not now
              </button>
            </div>
          ) : (
            <div className="mt-2.5 p-2 bg-slate-100 dark:bg-slate-950 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Share className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <span>Tap <strong>Share</strong> &gt; <strong>Add to Home Screen</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPwaBanner;
