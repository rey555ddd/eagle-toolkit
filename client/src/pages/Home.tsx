/*
 * 設計哲學：Maison Noire — 法式精品沙龍美學
 * 首頁：全幅 Hero 區域 + 三個工具入口卡片
 * 極致留白、香檳金強調、優雅淡入動畫
 *
 * [修復] 移除 framer-motion 依賴，改用 CSS animation
 * 原因：部署環境中 FM 的 animate prop 不觸發，所有 initial={{ opacity: 0 }} 元素永遠透明
 */
import { Link } from "wouter";
import { Film, PenTool, ImageIcon, ArrowRight, MessageSquarePlus } from "lucide-react";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/hero_bg-f8gPGgUaC9gPWv74TECkzN.webp";
const CARD_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/card_video-Jp9EhT8PgRp4ReP5jDKFky.webp";
const CARD_COPY = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/card_copywriting-KZKqzz86hXDaDGTnCwY2jZ.webp";
const CARD_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/card_image-F3ZDoZVEdbj2XA2ggRB5R2.webp";
const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/eagle_logo_bfca0274.jpeg";

const tools = [
  {
    title: "影片生成器",
    desc: "上傳商品照片，自動生成精品質感的社群影片，支援多種尺寸與風格模板。",
    icon: Film,
    href: "/video",
    image: CARD_VIDEO,
  },
  {
    title: "文案生成器",
    desc: "一鍵生成精品代購文案，支援多種風格與自動 Hashtag，讓每篇貼文都專業出眾。",
    icon: PenTool,
    href: "/copy",
    image: CARD_COPY,
  },
  {
    title: "圖片處理器",
    desc: "AI 去背 + 精品奢華背景合成，讓商品圖片呈現最佳狀態。",
    icon: ImageIcon,
    href: "/image",
    image: CARD_IMAGE,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] sm:h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src={HERO_BG}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.1_0.005_60/60%)] via-transparent to-[oklch(0.1_0.005_60)]" />
        </div>

        {/* Content */}
        <div
          className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in"
        >
          <img
            src={LOGO_URL}
            alt="伊果國外精品代購"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto mb-8 ring-1 ring-[oklch(0.72_0.08_75/30%)] animate-fade-in"
            style={{ animationDelay: "0.2s", animationFillMode: "both" }}
          />
          <h1
            className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-[0.15em] mb-6 gold-gradient-text animate-fade-in-up"
            style={{ animationDelay: "0.4s", animationFillMode: "both" }}
          >
            精品智能助手
          </h1>
          <div
            className="gold-divider max-w-[120px] mx-auto mb-6 animate-fade-in"
            style={{ animationDelay: "0.5s", animationFillMode: "both" }}
          />
          <p
            className="text-[oklch(0.7_0.01_80)] text-sm sm:text-base font-light tracking-[0.05em] leading-relaxed max-w-lg mx-auto animate-fade-in-up"
            style={{ animationDelay: "0.6s", animationFillMode: "both" }}
          >
            為伊果精品量身打造的圖片影像處理工具，<br className="sm:hidden" />
            搭配文案生成器，讓行銷更容易，素材質感大提升
          </p>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in"
          style={{ animationDelay: "1.2s", animationFillMode: "both" }}
        >
          <div
            style={{ animation: "scrollBounce 2s ease-in-out infinite" }}
            className="w-[1px] h-8 bg-gradient-to-b from-[oklch(0.72_0.08_75/60%)] to-transparent"
          />
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20 animate-fade-in-up">
            <h2 className="font-serif text-2xl sm:text-3xl tracking-[0.12em] text-[oklch(0.92_0.01_80)] mb-4">
              專業工具
            </h2>
            <div className="gold-divider max-w-[80px] mx-auto mb-4" />
            <p className="text-[oklch(0.55_0.02_60)] text-sm tracking-[0.05em]">
              三大核心工具，提升您的精品展示品質
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {tools.map((tool, index) => (
              <div
                key={tool.href}
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.1 + index * 0.15}s`, animationFillMode: "both" }}
              >
                <Link href={tool.href}>
                  <div className="luxury-card rounded-sm overflow-hidden group h-full">
                    {/* Image */}
                    <div className="relative h-48 sm:h-56 overflow-hidden">
                      <img
                        src={tool.image}
                        alt={tool.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.14_0.005_60)] via-[oklch(0.14_0.005_60/40%)] to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <tool.icon
                          size={20}
                          className="text-[oklch(0.72_0.08_75)] opacity-80"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 sm:p-8">
                      <h3 className="font-serif text-lg tracking-[0.1em] text-[oklch(0.92_0.01_80)] mb-3">
                        {tool.title}
                      </h3>
                      <p className="text-[oklch(0.55_0.02_60)] text-sm leading-relaxed mb-6 font-light">
                        {tool.desc}
                      </p>
                      <div className="flex items-center gap-2 text-[oklch(0.72_0.08_75)] text-xs tracking-[0.15em] group-hover:gap-3 transition-all duration-300">
                        <span>開始使用</span>
                        <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback Banner */}
      <section className="py-12 sm:py-16 border-t border-[oklch(0.72_0.08_75/8%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-fade-in-up">
            <Link href="/feedback">
              <div
                className="rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6 group cursor-pointer transition-all duration-300 hover:shadow-[0_0_60px_rgba(99,102,241,0.18)] hover:border-[rgba(129,140,248,0.45)]"
                style={{
                  background: "linear-gradient(135deg, rgba(30,27,75,0.8) 0%, rgba(15,10,46,0.9) 100%)",
                  border: "1px solid rgba(129,140,248,0.25)",
                  boxShadow: "0 0 40px rgba(99,102,241,0.08)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(129,140,248,0.3)" }}
                >
                  <MessageSquarePlus className="w-8 h-8" style={{ color: "#818cf8" }} />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3
                    className="text-xl font-light tracking-widest mb-2"
                    style={{ fontFamily: "'Noto Serif TC', serif", color: "#c7d2fe" }}
                  >
                    修改建議區
                  </h3>
                  <p className="text-sm font-light leading-relaxed" style={{ color: "#64748b" }}>
                    有任何功能需求、介面改善建議或 Bug 回報？歡迎告訴我們，每一條建議都是進步的動力。
                  </p>
                </div>
                <div
                  className="flex items-center gap-2 text-sm tracking-widest flex-shrink-0 group-hover:gap-3 transition-all duration-300"
                  style={{ color: "#818cf8" }}
                >
                  <span>前往留言</span>
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Brand Section */}
      <section className="py-16 sm:py-20 border-t border-[oklch(0.72_0.08_75/8%)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in">
            <p className="text-[oklch(0.45_0.02_60)] text-xs sm:text-sm tracking-[0.1em] font-light leading-loose">
              代購經驗已累積十年以上，粉專高達 39 萬人追蹤<br />
              代購服務遍及四大洲親自採買<br />
              售後服務皆有保固保修
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
