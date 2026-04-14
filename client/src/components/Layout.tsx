/*
 * 設計哲學：Maison Noire — 法式精品沙龍美學
 * 導航欄：極簡透明，Logo 置中，金色細線底部分隔
 * 頁尾：極簡，品牌資訊 + 社群連結
 *
 * [修復] 移除 framer-motion，改用 CSS transition
 * 原因：FM 的 AnimatePresence 包住 children，initial={{ opacity: 0 }} 不觸發 = 全站空白
 */
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/eagle_logo_bfca0274.jpeg";

const navItems = [
  { href: "/", label: "首頁", special: false },
  { href: "/radar", label: "賣家雷達", special: true, badge: "測試開發中" },
  { href: "/video", label: "影片生成器", special: false },
  { href: "/copy", label: "文案生成器", special: false },
  { href: "/image", label: "圖片處理器", special: false },
  { href: "/feedback", label: "修改建議", special: true },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[oklch(0.1_0.005_60/95%)] backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src={LOGO_URL}
                alt="伊果國外精品代購"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-1 ring-[oklch(0.72_0.08_75/30%)] group-hover:ring-[oklch(0.72_0.08_75/60%)] transition-all duration-300"
              />
              <span className="font-serif text-sm sm:text-base tracking-[0.15em] gold-gradient-text hidden sm:block">
                伊果國外精品代購
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                item.special ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm tracking-[0.1em] transition-all duration-300 relative py-1 px-3 rounded-full inline-flex items-center gap-1.5"
                    style={{
                      color: location === item.href ? "#c7d2fe" : "#818cf8",
                      background: location === item.href ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(129,140,248,0.3)",
                    }}
                  >
                    {item.label}
                    {item.badge && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium tracking-wide"
                        style={{ background: "rgba(251,191,36,0.2)", color: "#fcd34d", border: "1px solid rgba(251,191,36,0.35)" }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm tracking-[0.1em] transition-all duration-300 relative py-1 ${
                      location === item.href
                        ? "text-[oklch(0.72_0.08_75)]"
                        : "text-[oklch(0.7_0.01_80)] hover:text-[oklch(0.72_0.08_75)]"
                    }`}
                  >
                    {item.label}
                    {location === item.href && (
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[oklch(0.72_0.08_75)] animate-fade-in" />
                    )}
                  </Link>
                )
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[oklch(0.72_0.08_75)]"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Gold divider line */}
        <div className={`gold-divider transition-opacity duration-500 ${scrolled ? 'opacity-100' : 'opacity-0'}`} />

        {/* Mobile Menu — CSS transition instead of AnimatePresence */}
        <div
          className={`md:hidden bg-[oklch(0.1_0.005_60/98%)] backdrop-blur-md border-t border-[oklch(0.72_0.08_75/15%)] overflow-hidden transition-all duration-300 ease-in-out ${
            mobileOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-6 py-6 space-y-1">
            {navItems.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className="block py-3 text-sm tracking-[0.1em] transition-colors duration-300 flex items-center gap-2"
                  style={item.special ? {
                    color: location === item.href ? "#c7d2fe" : "#818cf8",
                  } : {
                    color: location === item.href ? "oklch(0.72 0.08 75)" : "oklch(0.7 0.01 80)",
                  }}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.2)", color: "#fcd34d", border: "1px solid rgba(251,191,36,0.35)" }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content — 直接渲染 children，不再用 AnimatePresence 包裝 */}
      <main className="flex-1 pt-16 sm:pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[oklch(0.72_0.08_75/10%)] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={LOGO_URL}
                alt="伊果國外精品代購"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-[oklch(0.72_0.08_75/20%)]"
              />
              <span className="font-serif text-sm tracking-[0.1em] text-[oklch(0.6_0.02_60)]">
                伊果國外精品代購
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://www.facebook.com/EagleShopping"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[oklch(0.5_0.02_60)] hover:text-[oklch(0.72_0.08_75)] transition-colors duration-300 text-xs tracking-[0.1em]"
              >
                粉絲專頁
              </a>
              <span className="text-[oklch(0.3_0.01_60)]">|</span>
              <span className="text-[oklch(0.4_0.02_60)] text-xs tracking-[0.05em]">
                伊果智能助手
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
