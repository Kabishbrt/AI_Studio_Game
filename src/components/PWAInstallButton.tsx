import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, QrCode, Smartphone, X } from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'menu' | 'header';
}

function getUrls(): { liveUrl: string; sharedUrl: string; hasSeparateShared: boolean } {
  if (typeof window === 'undefined') {
    const fallback = 'https://ais-dev-33lj6xehsti2oqgfhv2mnm-1012003880737.asia-east1.run.app';
    return {
      liveUrl: fallback,
      sharedUrl: fallback.replace('ais-dev-', 'ais-pre-'),
      hasSeparateShared: true,
    };
  }
  const origin = window.location.origin;
  const hasSeparateShared = origin.includes('ais-dev-');
  return {
    liveUrl: origin,
    sharedUrl: hasSeparateShared ? origin.replace('ais-dev-', 'ais-pre-') : origin,
    hasSeparateShared,
  };
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'menu' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [urlMode, setUrlMode] = useState<'live' | 'shared'>('live');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const { liveUrl, sharedUrl, hasSeparateShared } = getUrls();
  const activeUrl = urlMode === 'shared' ? sharedUrl : liveUrl;

  useEffect(() => {
    if (!showModal) return;
    let active = true;
    QRCode.toDataURL(activeUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#12100E',
        light: '#FFF8EE',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [showModal, activeUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {variant === 'header' ? (
        <div className="flex items-center gap-2">
          {isInstallable && (
            <button
              type="button"
              onClick={() => void install()}
              className="flex h-11 items-center gap-2 rounded-xl border border-[#E8D8C3]/15 bg-[#16120F]/88 px-3.5 text-xs font-semibold text-[#FFF8EE] shadow-lg transition-colors hover:bg-[#2A221C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E]"
            >
              <Download className="h-4 w-4 text-[#F5B82E]" aria-hidden="true" />
              <span className="whitespace-nowrap">Install App</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            aria-label="Show phone QR code"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E8D8C3]/15 bg-[#16120F]/88 text-[#FFF8EE] shadow-lg transition-colors hover:bg-[#2A221C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E]"
          >
            <QrCode className="h-4 w-4 text-[#F5B82E]" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {isInstallable ? (
            <>
              <button
                type="button"
                onClick={() => void install()}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#E8D8C3]/18 bg-[#221B16] px-4 py-2.5 text-sm font-semibold text-[#FFF8EE] transition-colors hover:bg-[#2E241E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E]"
              >
                <Download className="h-4 w-4 text-[#F5B82E]" aria-hidden="true" />
                <span className="whitespace-nowrap">Install App</span>
              </button>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                aria-label="Open phone QR code"
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#E8D8C3]/18 bg-[#221B16] px-3.5 py-2.5 text-sm font-semibold text-[#FFF8EE] transition-colors hover:bg-[#2E241E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E]"
              >
                <QrCode className="h-4 w-4 text-[#F5B82E]" aria-hidden="true" />
                <span className="whitespace-nowrap">Phone QR</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#E8D8C3]/18 bg-[#221B16] px-5 py-2.5 text-sm font-semibold text-[#FFF8EE] transition-colors hover:bg-[#2E241E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E]"
            >
              <Smartphone className="h-4 w-4 text-[#F5B82E]" aria-hidden="true" />
              <span className="whitespace-nowrap">Play & Install on Phone (QR)</span>
            </button>
          )}
        </div>
      )}

      {showModal && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-phone-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#E8D8C3]/20 bg-[#16120F] p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 id="install-phone-title" className="font-display text-lg font-bold text-[#FFF8EE]">
                Scan to Play on Phone
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close phone QR dialog"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#C7B9A5] hover:bg-[#261E18] hover:text-[#FFF8EE]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {hasSeparateShared && (
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-[#221B16] p-1">
                <button
                  type="button"
                  onClick={() => setUrlMode('live')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    urlMode === 'live'
                      ? 'bg-[#DC143C] text-white'
                      : 'text-[#C7B9A5] hover:text-[#FFF8EE]'
                  }`}
                >
                  Live Preview
                </button>
                <button
                  type="button"
                  onClick={() => setUrlMode('shared')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    urlMode === 'shared'
                      ? 'bg-[#DC143C] text-white'
                      : 'text-[#C7B9A5] hover:text-[#FFF8EE]'
                  }`}
                >
                  Shared App
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-col items-center">
              <div className="rounded-xl border border-[#F5B82E]/40 bg-[#FFF8EE] p-3 shadow-md">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR code for Kathmandu Dash on mobile"
                    className="block h-48 w-48"
                  />
                ) : (
                  <div className="flex h-48 w-48 items-center justify-center text-xs text-[#16120F]">
                    Generating QR...
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleCopy()}
                className="mt-3 flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg border border-[#E8D8C3]/15 bg-[#221B16] px-3 py-1.5 text-left text-xs text-[#D4C7B4] transition-colors hover:bg-[#2E241E]"
              >
                <span className="truncate font-mono-num">{activeUrl}</span>
                <span className="flex shrink-0 items-center gap-1 font-semibold text-[#F5B82E]">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </span>
              </button>
            </div>

            <div className="mt-4 space-y-2 border-t border-[#E8D8C3]/10 pt-3 text-xs leading-relaxed text-[#D4C7B4]">
              {urlMode === 'live' && hasSeparateShared ? (
                <p>
                  Opens the active preview right now (sign into the same Google account in your phone browser if prompted). Or click <strong>Share</strong> in AI Studio to publish the <strong>Shared App</strong> link.
                </p>
              ) : urlMode === 'shared' && hasSeparateShared ? (
                <p>
                  Make sure you clicked <strong>Share</strong> / <strong>Deploy</strong> in the AI Studio toolbar first so the shared URL is published.
                </p>
              ) : null}

              {isIOS ? (
                <p>
                  <strong className="text-[#F5B82E]">iPhone (Safari):</strong> Tap{' '}
                  <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
                </p>
              ) : (
                <p>
                  <strong className="text-[#F5B82E]">Install:</strong> On Android Chrome tap{' '}
                  <strong>⋮ → Install app</strong>; on iPhone Safari tap{' '}
                  <strong>Share → Add to Home Screen</strong>.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-4 min-h-[44px] w-full rounded-xl bg-[#DC143C] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#B91032]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
