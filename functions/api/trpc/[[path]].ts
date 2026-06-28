/**
 * Cloudflare Pages Functions: tRPC Handler
 * Handles all AI-powered routes for the eagle-toolkit project
 * Runs on Cloudflare Workers runtime (V8 isolates), not Node.js
 */

import { initTRPC } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';

// ===== 品牌行銷方法論 (Brand Marketing Methodology) =====
const MARKETING_METHODOLOGY = `品牌行銷方法論（品牌通用版）

本方法論源自內訓教材「品牌行銷策略地圖」，以恩師林明樟（超級業務力）體系為核心，融合峰值體驗理論、經典行銷模型與現代趨勢。

包含：策略五問、冷→鐵六階漏斗、行銷4有、需求6問、馬斯洛7情、AIDA/PAS/FABE 廣告模型、吸睛破圈（有梗有料）與六種風、定位六把刀、十大購買障礙與信任元素、客戶經營（關鍵5問、十個值了、4種互動）、STP市場定位、飛輪模型、Byron Sharp雙可得性、社群導向成長、Founder IP 策略、文案撰寫模組（含去AI味12條守則、銷售文案六層架構、標題五技法、Hook法則、五感寫作法）。

行銷的本質：廣告是宣傳產品解決問題、滿足需求的能力；行銷是放大我們的美、排除購買障礙。目標是「選對人、說對話、做對事」，連續做對，加速、持續、複利增長。

核心心法：「買產品、傳美名、留信物——能招喚、能漲價、能回購」。方法：拆解→重組→建模。

═══════════════════════════════════════════════════════════════════════════
一、策略五問
═══════════════════════════════════════════════════════════════════════════

每一個行銷決策都要回頭檢視——決策、策略能不能夠：

1. 加速增長？
2. 價值轉型？（從電商產品→品牌思維，從規格價格→價值信任，從活動檔期→回購推薦加持）
3. 改變競爭狀態？
4. 燙平景氣週期？
5. 累積長期競爭力？（深耕鐵粉客戶、品牌價值）

這是戰略層的檢驗——確保不只在「做行銷」，而是在「做對的行銷」。

═══════════════════════════════════════════════════════════════════════════
二、STP 市場定位（Philip Kotler）
═══════════════════════════════════════════════════════════════════════════

在執行任何行銷動作前，先回答「賣給誰、怎麼定位」：

S — 市場區隔
├─ 用人口、心理、行為、地理等變數切分市場
└─ 搭配需求6問挖掘真實需求

T — 目標市場
├─ 評估各區隔吸引力，選擇最適合的客群
└─ 搭配冷→鐵漏斗判斷客群階段

P — 定位
├─ 在目標客群心中建立獨特的品牌位置
└─ 搭配定位六把刀找到切點

STP 是分析流程，定位六把刀是定位切點——兩者互補，不是替代。

═══════════════════════════════════════════════════════════════════════════
三、冷→鐵 六階漏斗
═══════════════════════════════════════════════════════════════════════════

完整行銷旅程分為上半部（獲客）和下半部（養客）：

─── 上漏斗（獲客）— 產品信任 → 相對優勢 → 量變 ───

冷：完全不認識品牌
├─ 定義：完全不認識品牌
└─ 核心策略：有梗有料吸睛、跟風破圈、廣告投放、SEO/AIO

溫：聽過但還沒買
├─ 定義：聽過但還沒買
└─ 核心策略：十大障礙排除、信任元素累積

熱：首次購買
├─ 定義：首次購買
└─ 核心策略：AIDA 轉換、PAS 痛點放大、FABE 價值說服

─── 下漏斗（養客）— 品牌信任 + 情緒價值 → 人品信任 → 絕對優勢 → 質變 ───

熟：回購客（買>3次）
├─ 定義：回購客（買>3次）
└─ 核心策略：關鍵5問、十個值了、複購推薦

團：單品數量高於自用
├─ 定義：單品數量高於自用
└─ 核心策略：問答讚、人貨場、分潤機制

鐵：全產品購買率 50%+
├─ 定義：全產品購買率 50%+
└─ 核心策略：4種互動、VIP 深耕、不公平競爭

最終目標：野生代言人——積極主動推薦、分享，不用你請他就幫你傳美名。

核心理念：成交是服務的開始。不管問題或驚喜，對公司可能只是 1%，對客戶來說是 100%。

═══════════════════════════════════════════════════════════════════════════
四、飛輪模型（Flywheel）
═══════════════════════════════════════════════════════════════════════════

傳統漏斗的問題：客戶到底端就「結束」了。飛輪思維不同——滿意客戶成為推動下一輪成長的動力：

吸引（Attract）→ 參與（Engage）→ 愉悅（Delight）→ 回到吸引

與冷→鐵漏斗的關係：漏斗告訴你每個階段「做什麼」，飛輪提醒你「鐵粉的能量要回饋到冷流量的獲取」。野生代言人就是飛輪最強的動力源。

減少摩擦力（客訴、體驗差、溝通斷層）= 讓飛輪轉更快。

═══════════════════════════════════════════════════════════════════════════
五、Byron Sharp 雙可得性
═══════════════════════════════════════════════════════════════════════════

來自《品牌如何成長》（Ehrenberg-Bass Institute），提醒我們別只顧養客：

心智可得性（Mental Availability）：消費者在購買情境中能不能想到你

實體可得性（Physical Availability）：消費者能不能方便買到你

核心觀點：品牌成長主要靠「獲取新客」，而非只靠「加深忠誠」。品牌靠「獨特辨識度」（Logo、色彩、角色）而非靠「有意義的差異化」。

與本體系的對話：上漏斗（冷→熱）偏 Byron Sharp 的「拉新客 + 心智佔有」，下漏斗（熟→鐵）偏本體系的「深耕忠誠」。兩者不矛盾，品牌不同階段側重不同。

═══════════════════════════════════════════════════════════════════════════
六、團隊文化 DNA（價值三角）
═══════════════════════════════════════════════════════════════════════════

行銷策略的根基是團隊文化：

卓越價值：追求卓越、累積長期價值

智慧行動：有手有腳，更要有眼有腦。智慧佈局、聰明協作、確實執行

正直共好：善良正直、友善溝通、互信互敬互助。以「公司、夥伴、客戶」三贏為基準

═══════════════════════════════════════════════════════════════════════════
七、需求洞察工具
═══════════════════════════════════════════════════════════════════════════

需求 6 問（核心邏輯：動機來自「趨吉避凶」，追求快樂 < 逃避痛苦）

行銷前要同時想清楚「我方」和「對方」的六個問題，挖掘客戶真實需求。

─── 馬斯洛 7 層需求（5層→7層，加入認知、美的需求）───

層級 7 - 自我實現：成就感
└─ 行銷切角：使用產品實現理想生活方式

層級 6 - 美好：美感
└─ 行銷切角：設計質感、感官愉悅

層級 5 - 認知：知識感
└─ 行銷切角：了解產品差異、獲得新知

層級 4 - 自尊：優越感
└─ 行銷切角：聰明選擇，有品味的象徵

層級 3 - 社交：歸屬感
└─ 行銷切角：為家人/朋友選擇，愛的表現

層級 2 - 安全：安心感
└─ 行銷切角：認證、安全成分、專業背書

層級 1 - 生理：舒適感
└─ 行銷切角：滿足基本功能需求

痛點 = 反馬斯洛 = 需求不被滿足。越暗的地方你越亮，聚焦痛點，放大價值。

─── 焦糖布丁理論 ───

表面說想要的（布丁）vs 真正渴望的（焦糖）。洞察真需求，才能提煉出真正的買點。

═══════════════════════════════════════════════════════════════════════════
八、行銷 4 有
═══════════════════════════════════════════════════════════════════════════

每一則行銷內容都要達成這四個目標：

有哏：吸睛、破圈、被記住
└─ 對應工具：有梗有料、六種風

有關：跟 TA 有關，場景共鳴
└─ 對應工具：需求6問、馬斯洛7情

有感：引起情感共鳴
└─ 對應工具：AIDA、PAS、FABE

有想要：排除障礙、建立信任
└─ 對應工具：十大障礙、信任元素

═══════════════════════════════════════════════════════════════════════════
九、廣告三大模型
═══════════════════════════════════════════════════════════════════════════

─── AIDA（1898，行銷漏斗始祖）───

Attention - 抓住注意力
└─ 手法：有梗有料、跟風破圈、秒懂、推翻認知、五感衝擊

Interest - 從「干我屁事」到「跟我有關」
└─ 手法：場景共鳴、痛點亮點、感同身受

Desire - 理性感性都想要
└─ 手法：情緒價值、爽點、信任證據

Action - 我現在就要
└─ 手法：限時稀缺、排除障礙、明確呼籲

─── PAS 痛點公式 ───

Problem - 描述痛點，讓 TA 感同身受：「這就是我ㄚ」

Agitate - 放大不解決的後果＆情緒

Solution - 秒懂價值、降低猶豫、行動呼籲

─── FABE 價值法則 ───

Features - 產品有什麼特徵？

Advantages - 比業界標準有什麼優勢？

Benefits - 帶來什麼好處？

Evidence - 客戶憑什麼相信？

核心公式：價值 > 價格 = 成交。

═══════════════════════════════════════════════════════════════════════════
十、吸睛破圈工具
═══════════════════════════════════════════════════════════════════════════

─── 有梗、有料 ───

要吸睛、抓眼球、被記住，內容要同時做到「有梗」（讓人想停下來看）和「有料」（看完覺得有收穫）。

常見的破圈手法：
• 打破認知
• 製造好奇
• 搭上社會熱點
• 提供不同視角
• 跨界合作
• 五感衝擊
• 製造神秘和稀缺感

─── 六種風 ───

跟風：朋友最強

颱風：四大平台

龍捲風：超級大V

人造風：大數據銷量評分

妖風：競爭對手

熱點風：事件

─── 定位六把刀 ───

商戰進程：產品初創→產能競賽→通路戰→媒體戰→行銷戰→定位戰（有心智佔有，才會賣得久）。

定位金三角：根據核心出發，找到優勢切點、心智佔有、自貼標籤。

═══════════════════════════════════════════════════════════════════════════
十一、排除購買障礙 × 建立信任
═══════════════════════════════════════════════════════════════════════════

─── 十大購買障礙 ───

冷流量：沒看懂、沒法選、沒預算、沒興趣、沒人推

溫流量：不用換、不信你、不專業、不高級、不合適

─── 信任元素 ───

BA實測/產品比較

成功案例/認證

行業標竿/代言人

專家推薦

試用體驗

SEO/AIO 內容

═══════════════════════════════════════════════════════════════════════════
十二、客戶經營（下漏斗）
═══════════════════════════════════════════════════════════════════════════

─── 關鍵 5 問 ───

掌握關鍵五問才能了解客戶、了解自己。方法：拆解→關鍵字→重組→建模。

─── 十個「值了」───

維度 - 七情：越多即越值

維度 - 即時：馬上即享受

維度 - 符合：所見即所得

維度 - 逆轉：低谷變峰值

維度 - 打破：預期被打破

維度 - 交付：問題被解決

維度 - 先知：省心被安排

維度 - 高頻：穩定才有感

維度 - 低頻：剛需才加值

維度 - 雙頻：百搭才超值

─── 4 種互動 ───

差異化：限定限時、分級深耕

WOW：專屬設計、情緒價值

交朋友：驚喜互動、拉近距離

給方便：懂你需要、服務系統化

═══════════════════════════════════════════════════════════════════════════
十三、社群導向成長 × 創作者經濟
═══════════════════════════════════════════════════════════════════════════

2024-2026 年最重要的行銷趨勢轉變：

從注意力經濟 → 連結經濟：品牌成長的引擎從廣告轉向社群。小而深的社群 > 大而淺的粉絲數。

創作者經濟 2.0：創作者從「接業配的網紅」進化為品牌共創者。長期夥伴關係取代單次業配，創作者成為品牌的「文化錨點」。

UGC 真實內容：80% 消費者更偏好真實客戶照片而非精美商業攝影。Z世代主導的「去影響力化」——真實 > 精美。

與本體系的關係：Founder IP 策略 + 鐵粉經營 + 野生代言人 = 社群導向成長的最佳實踐。

═══════════════════════════════════════════════════════════════════════════
十四、品牌宗教學（衛哲）× 黃金圈（Simon Sinek）
═══════════════════════════════════════════════════════════════════════════

做好品牌，要向宗教學習：你有神祇和經文嗎？有教堂嗎？有傳教士嗎？有信徒嗎？有固定儀式嗎？有信物嗎？

溝通永遠從 Why 開始，不要只講 What。

═══════════════════════════════════════════════════════════════════════════
十五、Founder IP 行銷策略
═══════════════════════════════════════════════════════════════════════════

創辦人的個人品牌是品牌行銷的核心引擎：

人設：真誠、接地氣、用個人故事拉近距離

內容方向：創辦人 IP 短影片、生活知識、趣味創意

效果：建立深度信任，讓消費者覺得「這是有溫度的品牌」

與代言人關係：Founder IP 是日常信任基礎，代言人是品牌高度的加乘

═══════════════════════════════════════════════════════════════════════════
十六、品牌行銷 9 大目標
═══════════════════════════════════════════════════════════════════════════

每次出手都應對應一個目標：

1. 曝光
2. 導流
3. 互動
4. 名單蒐集
5. 轉換
6. 客單提升
7. 回購
8. 轉介紹
9. 品牌好感

規劃前先確認「這次打哪個目標」。

═══════════════════════════════════════════════════════════════════════════
十七、定價與促銷邏輯
═══════════════════════════════════════════════════════════════════════════

原則：平時不輕易打折（維護品牌價值），大促時給出有感折扣拉新客。把握年度節點節奏。

═══════════════════════════════════════════════════════════════════════════
十八、使用此方法論的原則
═══════════════════════════════════════════════════════════════════════════

1. 任何行銷決策先過「策略五問」
2. 用 STP 確認目標市場和定位
3. 判斷目標受眾在冷→鐵的哪個階段，選擇對應溝通方式
4. 用「行銷4有」（有哏、有關、有感、有想要）檢查每一則內容
5. 上漏斗用 AIDA/PAS/FABE 做轉換；有梗有料＋六種風做破圈
6. 下漏斗用關鍵5問、十個值了、4種互動深耕關係
7. 用飛輪思維讓鐵粉能量回饋到冷流量獲取
8. 定期檢視 Byron Sharp 雙可得性——心智可得 + 實體可得有沒有做到？
9. 所有文案產出必須通過「去 AI 味 12 條守則」（見下方文案模組）
10. 終極目標：買產品、傳美名、留信物——能招喚、能漲價、能回購

═══════════════════════════════════════════════════════════════════════════
文案撰寫模組
═══════════════════════════════════════════════════════════════════════════

本模組深度整合文案方法論，以及經典文案技法。涵蓋修辭技法、五感寫作法範例、潛意識說服結構。

─── 文案核心哲學 ───

方法 > 才華：靈感是禮物，方法是實務。文案有架構、有邏輯、有系統可循。

精準 > 華麗：不是把文字寫得多好看，而是依照需求寫出適合的文字。

解決問題 > 文字優美：能解決愈多人問題的文字，就愈有價值。

驅動想像 > 羅列資訊：文案不是一串字，是能在讀者腦中產生畫面的內容。

理解 80% → 下筆 20%：多數功夫在「搞懂受眾、產品、場景」，不是在「寫」。

─── 文案人的兩層功夫 ───

體力（底蘊）：閱讀累積、社會體察、生活感受，只有時間能養成

技術（架構）：邏輯、模型、系統化方法，好學好複製

→ 技術讓你寫得快，體力讓你寫得深。

═══════════════════════════════════════════════════════════════════════════
銷售文案六層架構
═══════════════════════════════════════════════════════════════════════════

層次 ① - 提問題：描述目標受眾的痛點
└─ 對應模型：PAS - Problem

層次 ② - 形容有多嚴重：放大痛點的情緒和後果
└─ 對應模型：PAS - Agitate

層次 ③ - 不解決的壞事 / 解決的好事：製造對比和急迫感
└─ 對應模型：反馬斯洛

層次 ④ - 解決問題：帶出產品/方案
└─ 對應模型：PAS - Solution

層次 ⑤ - 形容解決後的感受：情緒價值、畫面感
└─ 對應模型：AIDA - Desire

層次 ⑥ - 為什麼你能解決：信任證據
└─ 對應模型：FABE - Evidence

簡版：利益 → 困擾 → 解決 → 特色 → 證明 → 行動

═══════════════════════════════════════════════════════════════════════════
去 AI 味寫作守則（12 條）
═══════════════════════════════════════════════════════════════════════════

以下準則適用於所有文案、公告、發文、傳訊、社群貼文。目的是讓輸出讀起來像「一個真人寫的」。這些規則優先級很高，每次產出文字內容時都要逐條檢查。

為什麼這很重要：
讀者一旦覺得「這是 AI 寫的」，信任感馬上歸零。寧可粗糙一點、不完美一點，也不要工整到像模板。數據佐證：69% 的讀者能感覺出缺乏人味的文字；人寫的文案比 AI 的互動率高 63%、轉換率高 41%——差別就在「同理心」。

① 不用 emoji 當分類標題
└─ 「✨ 1樓｜餐廳」這種排版方式非常 AI。也避免「🔥爆款」「💡小撇步」等 AI 愛用的開頭模式。如果要列點，用最簡單的方式講就好。

② 段落長短要參差不齊
└─ 真人寫文段落長短差很多，有的一句話就一段，有的寫比較長。不要每段都差不多字數。

③ 少用萬用填充詞
└─ 禁用清單：「整體」「氛圍」「超級」「真心覺得」「非常推薦」「不僅…更…」「無論…都…」「值得一提的是」。換成更具體的描述或口語說法。「整體氛圍很好」→「坐下來就不太想走」。

④ 推薦要有具體細節 + 五感寫作
└─ 不要只說「效果不錯」，講一個具體例子、一個數字、一個畫面。至少用到一種感官描寫（看到、聞到、摸到、聽到、嚐到），讓讀者在腦中「看到畫面」而不是「讀到形容詞」。

⑤ 語氣要全篇統一
└─ 如果本人講話比較隨性，就全篇隨性。不要前面很口語後面突然變成正式用語。

⑥ 結尾不要太完美
└─ 不用每篇都正面收尾。三種收尾範式可用：吐槽式（留一個小吐槽）、懸念式（留一個疑問）、突然結束式（講一句很隨便的話就停了）。完美收尾 = AI 味。

⑦ 帶一個具體數字
└─ 價格、人數、幾分鐘車程、幾道菜。數字要有記憶點，不要是圓整數——「127 位」比「100 多位」更可信。

⑧ 分析或推測要加語氣緩衝
└─ 不要太肯定地下結論。事實要準確，觀點才需要緩衝。加上「可能」「我猜」「應該是」，像朋友聊天一樣。

⑨ 一句話段落製造節奏
└─ 在關鍵處用極短的一句話獨立成段，製造停頓感和力道。長段落之間插入一句短句，讀起來才有呼吸。

⑩ 開頭 3 秒法則
└─ 前兩句決定生死。第一句要讓人停下來，不能平鋪直敘。用提問、反常識、具體數字、或直接說出讀者心聲開頭。

⑪ 禁止 AI 高頻句型
└─ 這些句型一出現就暴露 AI：「在這個…的時代」「讓我們一起…」「不僅…更…還…」「相信你一定會…」「話不多說」「廢話不多說」。直接刪掉或用口語改寫。

⑫ 拿掉品牌名還像一個人在說話
└─ 最終檢驗：把品牌名遮住，讀起來像不像一個有血有肉的人寫的？如果像公關稿或說明書，重寫。

自我檢查清單（產出前必過）：
□ 有沒有用 emoji 當標題或分類？→ 拿掉
□ 每段字數是不是都差不多？→ 故意讓某段只有一句話
□ 有沒有禁用清單裡的詞？→ 換掉
□ 推薦有沒有具體細節？有沒有畫面感？→ 補一個數字或感官描寫
□ 語氣前後一致嗎？→ 結尾不要突然變正式
□ 結尾是不是太正面太完美？→ 加個吐槽或疑問
□ 有沒有至少一個具體數字？→ 補上，用非圓整數
□ 有沒有太肯定的推測？→ 加語氣緩衝
□ 有沒有一句話段落製造節奏？→ 在關鍵處加入
□ 開頭 3 秒能不能抓住人？→ 不能就重寫第一句
□ 有沒有 AI 高頻句型？→ 刪掉或改寫
□ 拿掉品牌名，像不像一個人在說話？→ 不像就重寫

═══════════════════════════════════════════════════════════════════════════
標題 / Hook 工具箱
═══════════════════════════════════════════════════════════════════════════

─── 標題五大技法 ───

技法 - 痛點：說出讀者的困擾
└─ 適用：銷售、問題導向

技法 - 賣點：強調獨特好處
└─ 適用：產品介紹

技法 - 驚點：打破認知、製造意外
└─ 適用：社群吸睛

技法 - 懸點：勾起好奇心
└─ 適用：長文、影片 Hook

技法 - 暖點：情感共鳴、說出心聲
└─ 適用：品牌形象、Founder IP

─── Hook 黃金法則 ───

短、狠、具體。8 字以內。包含數字或「我如何…」類型開頭。說出心聲型最強——寫出多數人經歷過的情境，幫大家說出不敢說的話，讓人「這就是我」。

═══════════════════════════════════════════════════════════════════════════
修辭與節奏工具箱
═══════════════════════════════════════════════════════════════════════════

好文案的「力道」來自節奏。中文博大精深，幾個字就能有力量，關鍵在修辭和節奏的運用：

技法 - 排比：效果是氣勢、一氣呵成
└─ 適用：品牌宣言、價值觀表述

技法 - 對比：效果是突顯差異、製造張力
└─ 適用：使用前/後、競品比較

技法 - 設問：效果是引發思考、拉近距離
└─ 適用：社群開頭、痛點觸發

技法 - 譬喻：效果是讓抽象變具體
└─ 適用：產品說明、技術翻譯

技法 - 重複：效果是強調、洗腦、記憶
└─ 適用：品牌標語、核心訊息

技法 - 留白：效果是讓讀者自己填入想像
└─ 適用：高級感文案、品牌形象

技法 - 轉折：效果是製造意外、打破期待
└─ 適用：Hook、吸睛開頭

技法 - 對偶：效果是整齊對稱、富音樂美
└─ 適用：標語、金句

節奏的核心：長短交錯。三個長句後接一個短句，像音樂有拍子。一句話段落就是「重音」。

═══════════════════════════════════════════════════════════════════════════
五感寫作法
═══════════════════════════════════════════════════════════════════════════

好文案要有「畫面感」。方法是用感官描寫取代抽象形容，讓讀者在腦中「看到畫面」而不是「讀到形容詞」。每段文案至少出現一種感官描寫。

五感對照：

視覺
❌ 效果很好
✅ 三下就把卡了兩年的油漬搓掉了

嗅覺
❌ 洗完很香
✅ 晾在陽台上，路過的鄰居都問你用什麼洗的

觸覺
❌ 質感很好
✅ 摸起來像剛從烘衣機拿出來的毛巾

聽覺
❌ 很安靜
✅ 安靜到你能聽見自己的呼吸

味覺
❌ 很好吃
✅ 咬下去湯汁直接噴出來，燙嘴但捨不得放下

進階：場景粒度
從宏觀到微觀注重細節——不要寫「在家裡」，寫「在客廳沙發上」；不要寫「用了產品」，寫「擠了一泵在手心搓開」。細節越具體，畫面越真。

═══════════════════════════════════════════════════════════════════════════
潛意識說服三層結構
═══════════════════════════════════════════════════════════════════════════

文案說服的底層邏輯：

層次 - 本我（慾望）：快樂、安全、被看見
└─ 文案做法：觸動情感
└─ 範例：「你值得更好的」

層次 - 超我（合理化）：健康、責任、品味
└─ 文案做法：給理由
└─ 範例：「為家人選最好的」

層次 - 自我（行動）：理性藉口
└─ 文案做法：降低門檻
└─ 範例：「現在試用只要 \$99」

好的銷售文案會依序觸動這三層：先讓人「想要」，再給「應該要」的理由，最後提供「可以要」的行動路徑。

═══════════════════════════════════════════════════════════════════════════
文案六大類型 × 對應架構
═══════════════════════════════════════════════════════════════════════════

類型 - 品牌故事
├─ 核心架構：黃金圈（Why→How→What）
└─ 重點：情感、使命、價值觀

類型 - 銷售文案
├─ 核心架構：PAS / 六層架構 / AIDA
└─ 重點：痛點→解決→信任→行動

類型 - 產品文案
├─ 核心架構：FABE + 五感寫作
└─ 重點：特色→優勢→好處→證明

類型 - 社群文案
├─ 核心架構：Hook + 標題五技法
└─ 重點：3 秒抓住、平台語氣適配

類型 - 廣告文案
├─ 核心架構：AIDA + 馬斯洛7情
└─ 重點：注意→興趣→慾望→行動

類型 - 內容文案（SEO / 部落格 / 長文）
├─ 核心架構：洞察 + 故事 + 價值
└─ 重點：提供價值、建立信任

═══════════════════════════════════════════════════════════════════════════
AI 寫文案的最佳定位
═══════════════════════════════════════════════════════════════════════════

AI 在文案工作中的最佳角色不是「寫手」，而是「有品牌記憶的文案助理」——它記得所有產品資訊、品牌調性、方法論框架，但每次產出都需要：

1. 通過「去 AI 味 12 條守則」的逐條檢查
2. 鼓勵使用者加入自己的觀察和細節
3. 產出後自問：「拿掉品牌名，讀起來像不像一個有血有肉的人寫的？」

AI 能做好的：
• 大量產出初稿
• 格式轉換
• 關鍵字優化
• 資料整理

AI 需要人為補足的：
• 洞察：真實消費者的生活 → 靠品牌知識庫 + 客戶回饋
• 同理心：感受過的痛點 → 靠場景範例和情境模板
• 語感：節奏變化和個性 → 靠去 AI 味守則 + 節奏規則
• 文化脈絡：在地語境的微妙差異 → 靠本地化詞彙庫
• 品牌人格：一致的聲音 → 靠品牌調性準則 + 語氣模式
`;

// Helper: Append marketing methodology to system prompts
const withMarketing = (prompt: string) => {
  return prompt + "\n\n═══ 品牌行銷方法論參考 ═══\n請在撰寫文案時參考以下行銷方法論框架，運用其中的模型和技法提升文案品質：\n\n" + MARKETING_METHODOLOGY;
};


// ─── Environment & Context ────────────────────────────────────────────────────

interface Env {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY?: string;
  OPENAI_IMAGE_MODEL?: string;
  DB?: D1Database;
  // ── 採購助手 + 賣家雷達（蹦闆精品 Abby 專區） ───────────────────────
  ANTHROPIC_API_KEY?: string;
  EAGLE_ABBY_PASSWORD?: string;   // 密碼，預設 Abby888
  APIFY_API_TOKEN?: string;       // 賣家雷達用 Apify token
  RADAR_CRON_TOKEN?: string;      // Cron 自動掃描用內部 token
  EAGLE_RADAR_KV?: KVNamespace;  // 賣家雷達獨立 KV（絕不共用其他品牌）
  // ── 採購庫存（Day 3 新增）────────────────────────────────────────────
  EAGLE_D1?: D1Database;          // 採購 / 庫存 D1（獨立 binding，指向 eagle-toolkit-db）
  EAGLE_MODELS_KV?: KVNamespace; // 蹦闆型號資料庫 KV（bbang:model:{brand}:{serial}）
  FAL_KEY?: string;           // fal.ai 去背用
}

interface Context {
  env: Env;
}

// ─── tRPC Setup ───────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  // 🔒 資安：production 不洩漏 stack trace（避免內部路徑/行號被攻擊者拿來找零日漏洞）
  // 2026-04-30 審查發現
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // 砍掉 stack（CF Worker 內部路徑、行號）
        stack: undefined,
      },
      // Zod 錯誤訊息保留、但不附 stack
      message: shape.message,
    };
  },
});

const router = t.router;
const publicProcedure = t.procedure;

// ─── Gemini Clients ───────────────────────────────────────────────────────────

function getGeminiClient(env: Env): GoogleGenerativeAI {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured in Cloudflare Pages environment');
  return new GoogleGenerativeAI(apiKey);
}

function getGenAIClient(env: Env): GoogleGenAI {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured in Cloudflare Pages environment');
  return new GoogleGenAI({ apiKey });
}

// ─── Helper: Base64 utilities for Workers runtime (no Buffer) ──────────────────

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Gemini API Helpers ───────────────────────────────────────────────────────

const CLAUDE_TEXT_MODEL = 'claude-sonnet-4-6';

async function callGeminiText(
  env: Env,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured in Cloudflare Pages environment');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_TEXT_MODEL,
      max_tokens: 1600,
      temperature: 0.75,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error (${res.status}): ${errText}`);
  }

  const data = await res.json() as any;
  const text = data?.content
    ?.map((part: any) => part?.type === 'text' ? part.text : '')
    .join('')
    .trim();

  if (!text) throw new Error('Claude did not return text content');
  return text;
}

async function callGeminiVision(
  env: Env,
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const genAI = getGeminiClient(env);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    },
    { text: prompt },
  ]);
  return result.response.text();
}

// ─── Image Generation with Fallback ───────────────────────────────────────────

async function generateWithImagen(
  env: Env,
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const ai = getGenAIClient(env);

  // First, analyze the product with Gemini Vision
  const visionModel = getGeminiClient(env).getGenerativeModel({
    model: 'gemini-2.5-flash',
  });
  const visionResult = await visionModel.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    },
    {
      text: 'Describe this product in 1-2 sentences for luxury product photography. Include: product type, main color, material, and brand if visible. Be concise and specific. English only.',
    },
  ]);
  const productDesc = visionResult.response.text().trim();

  // Use Imagen 4 for highest quality image generation
  const fullPrompt = `${prompt} Product: ${productDesc}. Ultra-high quality commercial photography, 8K resolution, perfect lighting, no text, no watermark, photorealistic.`;

  // Try Imagen 4 first (best quality), fallback to Imagen 3
  const IMAGEN_MODELS = ['imagen-4.0-generate-001', 'imagen-3.0-generate-001'];
  let response: Awaited<ReturnType<typeof ai.models.generateImages>> | null = null;
  for (const imgModel of IMAGEN_MODELS) {
    try {
      response = await ai.models.generateImages({
        model: imgModel,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          safetyFilterLevel: 'BLOCK_ONLY_HIGH' as never,
        },
      });
      if (response?.generatedImages?.[0]?.image?.imageBytes) break;
    } catch (e) {
      console.warn(`[Imagen ${imgModel} failed]`, e instanceof Error ? e.message : e);
      continue;
    }
  }

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error('Imagen did not return image bytes');

  return imageBytes;
}

async function generateWithGeminiFallback(
  env: Env,
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  // Must use image-capable model — gemini-2.5-flash-image supports image output
  const IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-2.0-flash-exp'];
  const ai = getGenAIClient(env);
  let lastError: unknown;

  for (const modelName of IMAGE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: mimeType as 'image/jpeg' | 'image/png',
                },
              },
              {
                text: `${prompt} Use the product shown in the image. Generate a luxury product photography composite image. Return only the image.`,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
      throw new Error(`Model ${modelName} did not return image data`);
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Image model ${modelName} failed]`, msg);
      if (msg.includes('503') || msg.includes('404') || msg.includes('only supports text') || msg.includes('no longer available')) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ─── fal.ai 去背 → 生成 GPT Image 2 mask ────────────────────────────────────

/** 把 base64 圖片上傳到 fal storage，取得公開 URL */
async function uploadToFalStorage(imageBase64: string, mimeType: string, falKey: string): Promise<string> {
  const binary = atob(imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });

  const form = new FormData();
  form.append('file', blob, 'product.png');

  const res = await fetch('https://storage.fal.ai/upload', {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}` },
    body: form,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`fal storage upload 失敗 (${res.status}): ${errText.slice(0, 200)}`);
  }
  const json = await res.json() as { url: string };
  return json.url;
}

/** 用 fal.ai rembg 去背，回傳去背後 PNG 的 base64（背景=透明，產品=不透明） */
async function removeBackgroundForMask(imageBase64: string, mimeType: string, falKey: string): Promise<string> {
  const imageUrl = await uploadToFalStorage(imageBase64, mimeType, falKey);

  const res = await fetch('https://fal.run/fal-ai/imageutils/rembg', {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`fal.ai 去背失敗 (${res.status}): ${errText.slice(0, 200)}`);
  }
  const json = await res.json() as { image: { url: string } };
  const maskUrl = json.image?.url;
  if (!maskUrl) throw new Error('fal.ai 去背回傳格式異常');

  // 下載去背後的 PNG（這就是 mask）
  const imgRes = await fetch(maskUrl);
  if (!imgRes.ok) throw new Error(`無法下載 mask 圖片 (${imgRes.status})`);
  const arrayBuffer = await imgRes.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary2 = '';
  for (let i = 0; i < uint8.length; i++) binary2 += String.fromCharCode(uint8[i]);
  return btoa(binary2);
}

// ─── GPT Image 2 精修（OpenAI images.edit）─────────────────────────────────
// 單一模式：原商品圖 + 場景 Prompt → 保留商品與所有文字，替換背景
async function refineWithGptImage(
  env: Env,
  prompt: string,
  imageBase64: string,
  mimeType: string,
  maskBase64?: string
): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY 未設定，請至 Cloudflare Pages 環境變數配置');

  const model = env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  const binary = atob(imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });

  const form = new FormData();
  form.append('model', model);
  form.append('image', blob, 'product.png');
  form.append('prompt', prompt);
  form.append('n', '1');
  form.append('size', '1024x1024');
  form.append('quality', 'high');
  if (maskBase64) {
    const maskBin = atob(maskBase64);
    const maskBytes = new Uint8Array(maskBin.length);
    for (let i = 0; i < maskBin.length; i++) maskBytes[i] = maskBin.charCodeAt(i);
    const maskBlob = new Blob([maskBytes], { type: 'image/png' });
    form.append('mask', maskBlob, 'mask.png');
  }

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GPT Image 失敗 (${res.status}): ${errText.slice(0, 500)}`);
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (b64) return b64;

  const url = json.data?.[0]?.url;
  if (url) {
    const imgRes = await fetch(url);
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return btoa(bin);
  }

  throw new Error('GPT Image 未回傳圖片資料');
}

// ─── Radar (潛在賣家雷達) ─────────────────────────────────────────────────────

const RADAR_TOKEN = "eagle2026"; // 共享密碼；生產可改用 env.RADAR_TOKEN
const RADAR_BRANDS = [
  "Hermès", "愛馬仕", "Birkin", "Kelly",
  "LV", "Louis Vuitton", "路易威登",
  "Chanel", "香奈兒",
  "Rolex", "勞力士",
  "Patek Philippe", "百達翡麗", "AP", "Audemars Piguet", "愛彼",
  "Vacheron", "江詩丹頓", "Panerai", "沛納海",
  "Omega", "歐米茄", "Tag Heuer", "Tudor", "帝舵", "Breitling", "IWC",
  "Jaeger", "積家", "Cartier", "卡地亞",
  "Tiffany", "Van Cleef", "梵克雅寶", "Bulgari", "寶格麗",
  "Gucci", "Prada", "Dior",
  "Bottega", "BV", "Celine", "Fendi", "Burberry",
  "Balenciaga", "巴黎世家", "YSL", "Saint Laurent", "Givenchy",
  "Loewe", "Valentino", "Miu Miu", "Goyard", "Coach", "MCM", "Koji",
  "Montblanc", "萬寶龍",
];
const RADAR_INTENT = ["想賣", "脫手", "出清", "二手", "轉讓", "收購", "求售", "售", "賣"];
const RADAR_MAX_KEEP = 120; // 每次掃描至多新增 120 則（強弱合計）

interface RadarScraped {
  source: "dcard" | "ptt" | "threads";
  externalId: string;
  url: string;
  title: string;
  content: string;
  author: string;
}

function hitsBrand(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const b of RADAR_BRANDS) {
    if (lower.includes(b.toLowerCase())) hits.push(b);
  }
  return hits;
}

function hitsIntent(text: string): boolean {
  return RADAR_INTENT.some((kw) => text.includes(kw));
}

function calcPriority(hits: string[], hasIntent: boolean, text: string, createdAt: number): number {
  let score = 0;
  if (hits.length > 0 && hasIntent) score = 60; // 強命中基底
  else if (hits.length > 0) score = 30; // 有品牌無賣意
  else if (hasIntent) score = 20; // 有賣意無品牌
  score += Math.min(20, hits.length * 8);
  if (/\b\d{2,3}\s*(萬|k|千|k\s*ntd)/i.test(text)) score += 10;
  if (/發票|盒裝|原單|原廠|保卡/.test(text)) score += 8;
  const ageHours = (Date.now() - createdAt) / 3600000;
  if (ageHours < 2) score += 10;
  else if (ageHours < 6) score += 5;
  return Math.min(100, score);
}

async function scrapeDcard(): Promise<RadarScraped[]> {
  const cutoff = Date.now() - 14 * 86400 * 1000; // 14 天前
  const out: RadarScraped[] = [];
  let before: number | null = null;
  try {
    for (let page = 0; page < 6; page++) {
      const url = `https://www.dcard.tw/service/api/v2/forums/buysell/posts?popular=false&limit=100${before ? `&before=${before}` : ""}`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) break;
      const posts = (await res.json()) as Array<{ id: number; title: string; excerpt: string; school?: string; createdAt: string }>;
      if (!Array.isArray(posts) || posts.length === 0) break;
      let reachedCutoff = false;
      for (const p of posts) {
        const created = Date.parse(p.createdAt);
        if (Number.isFinite(created) && created < cutoff) {
          reachedCutoff = true;
          break;
        }
        out.push({
          source: "dcard",
          externalId: String(p.id),
          url: `https://www.dcard.tw/f/buysell/p/${p.id}`,
          title: p.title || "",
          content: p.excerpt || "",
          author: p.school || "anonymous",
        });
      }
      if (reachedCutoff) break;
      before = posts[posts.length - 1].id;
    }
  } catch (e) {
    console.error("[radar] dcard scrape failed:", e);
  }
  return out;
}

async function scrapePTTBoard(board: string, depth = 4): Promise<RadarScraped[]> {
  const out: RadarScraped[] = [];
  let nextPath = `/bbs/${board}/index.html`;
  try {
    for (let page = 0; page < depth && nextPath; page++) {
      const res = await fetch(`https://www.ptt.cc${nextPath}`, {
        headers: { "User-Agent": "Mozilla/5.0", cookie: "over18=1" },
      });
      if (!res.ok) break;
      const html = await res.text();
      const re = /<div class="title">[\s\S]*?<a href="(\/bbs\/[^"]+)">([^<]+)<\/a>[\s\S]*?<div class="author">([^<]+)<\/div>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        const path = m[1];
        const title = m[2].trim();
        const author = m[3].trim();
        const idMatch = path.match(/M\.(\d+)\./);
        out.push({
          source: "ptt",
          externalId: `${board}-${idMatch?.[1] ?? path}`,
          url: `https://www.ptt.cc${path}`,
          title,
          content: title,
          author,
        });
      }
      const prevMatch = html.match(/<a class="btn wide" href="([^"]+)">&lsaquo; 上頁<\/a>/);
      nextPath = prevMatch ? prevMatch[1] : "";
    }
  } catch (e) {
    console.error(`[radar] ptt ${board} scrape failed:`, e);
  }
  return out;
}

async function scrapeThreadsTag(tag: string): Promise<RadarScraped[]> {
  try {
    const res = await fetch(`https://www.threads.net/search?q=${encodeURIComponent(tag)}&serp_type=default`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const re = /"post":\{[^}]*"code":"([^"]+)"[^}]*"caption":\{[^}]*"text":"([^"]{20,400})"[^}]*\}[^}]*"user":\{[^}]*"username":"([^"]+)"/g;
    const out: RadarScraped[] = [];
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(html)) !== null && n < 20) {
      const code = m[1];
      const text = m[2].replace(/\\n/g, " ").replace(/\\"/g, '"');
      const username = m[3];
      out.push({
        source: "threads",
        externalId: code,
        url: `https://www.threads.net/@${username}/post/${code}`,
        title: text.slice(0, 80),
        content: text,
        author: username,
      });
      n++;
    }
    return out;
  } catch (e) {
    console.error(`[radar] threads ${tag} scrape failed:`, e);
    return [];
  }
}

async function runRadarScan(env: Env): Promise<{ scraped: number; inserted: number }> {
  if (!env.DB) throw new Error("D1 binding DB 未設定");

  const allRaw: RadarScraped[] = [];
  const [dc, pttLady, pttBuy, pttWatch, th1, th2, th3, th4] = await Promise.all([
    scrapeDcard(),
    scrapePTTBoard("Lady_Talk"),
    scrapePTTBoard("Buy"),
    scrapePTTBoard("watch"),
    scrapeThreadsTag("二手精品"),
    scrapeThreadsTag("脫手"),
    scrapeThreadsTag("愛馬仕"),
    scrapeThreadsTag("勞力士"),
  ]);
  allRaw.push(...dc, ...pttLady, ...pttBuy, ...pttWatch, ...th1, ...th2, ...th3, ...th4);

  // 放寬過濾：品牌 OR 賣意 擇一命中即入庫（強弱分數不同）
  const candidates = allRaw
    .map((r) => {
      const combined = (r.title + " " + r.content).slice(0, 1000);
      const hits = hitsBrand(combined);
      const intent = hitsIntent(combined);
      if (hits.length === 0 && !intent) return null; // 兩者都沒中 → 跳過
      const priority = calcPriority(hits, intent, combined, Date.now());
      return { ...r, hits, priority };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, RADAR_MAX_KEEP);

  let inserted = 0;
  for (const c of candidates) {
    try {
      const res = await env.DB.prepare(
        `INSERT OR IGNORE INTO radar_posts
         (source, external_id, url, title, content, author, brand_tags, priority, scraped_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(c.source, c.externalId, c.url, c.title, c.content, c.author, JSON.stringify(c.hits), c.priority, Date.now())
        .run();
      if (res.meta.changes && res.meta.changes > 0) inserted++;
    } catch (e) {
      console.error("[radar] insert failed:", e);
    }
  }
  return { scraped: allRaw.length, inserted };
}

async function generateRadarReply(env: Env, title: string, content: string, brands: string[]): Promise<string> {
  try {
    const systemPrompt = `你是台灣精品收購品牌「伊果國際」的客服，要在公開貼文底下留言邀請對方私訊報價。

請寫一則 40-60 字的留言：
- 直接、親切，不要官腔
- 提到偵測到的品牌（讓對方知道你有讀他文）
- 強調「高價收購」「歡迎私訊」
- 附 LINE ID：@eagle（可替換）
- 不要用 emoji
- 不要 hashtag
- 不要自我介紹過長
- 結尾帶一句請對方私訊的行動呼籲

直接輸出留言，不要任何前言。`;

    const prompt = `對方貼文如下：

標題：${title}
內容：${content}
偵測品牌：${brands.join("、")}`;

    return await callGeminiText(env, systemPrompt, prompt);
  } catch (e) {
    console.error("[radar] reply gen failed:", e);
    return "";
  }
}

const radarRouter = router({
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      if (input.username === "eagle2026" && input.password === "eagle2026") {
        return { ok: true, token: RADAR_TOKEN };
      }
      throw new Error("帳號或密碼錯誤");
    }),

  scanNow: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (input.token !== RADAR_TOKEN) throw new Error("未授權");
      return await runRadarScan(ctx.env);
    }),

  list: publicProcedure
    .input(
      z.object({
        token: z.string(),
        status: z.enum(["pending", "handled", "skipped", "all"]).default("pending"),
        source: z.enum(["all", "dcard", "ptt", "threads"]).default("all"),
        strength: z.enum(["all", "strong", "weak"]).default("strong"),
        limit: z.number().min(1).max(300).default(120),
      })
    )
    .query(async ({ input, ctx }) => {
      if (input.token !== RADAR_TOKEN) throw new Error("未授權");
      if (!ctx.env.DB) return { posts: [], stats: { total: 0, pending: 0, handled: 0, skipped: 0 } };

      const whereParts: string[] = [];
      const bindings: (string | number)[] = [];
      if (input.status !== "all") {
        whereParts.push("status = ?");
        bindings.push(input.status);
      }
      if (input.source !== "all") {
        whereParts.push("source = ?");
        bindings.push(input.source);
      }
      if (input.strength === "strong") whereParts.push("priority >= 60");
      else if (input.strength === "weak") whereParts.push("priority < 60");
      const whereSQL = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

      const postsRes = await ctx.env.DB.prepare(
        `SELECT * FROM radar_posts ${whereSQL} ORDER BY priority DESC, scraped_at DESC LIMIT ?`
      )
        .bind(...bindings, input.limit)
        .all<{
          id: number; source: string; external_id: string; url: string; title: string; content: string; author: string;
          brand_tags: string; priority: number; ai_reply: string | null; status: string;
          handled_by: string | null; handled_at: number | null; scraped_at: number;
        }>();

      const statsRes = await ctx.env.DB.prepare(
        `SELECT status, COUNT(*) as n FROM radar_posts GROUP BY status`
      ).all<{ status: string; n: number }>();

      const stats = { total: 0, pending: 0, handled: 0, skipped: 0 };
      for (const r of statsRes.results) {
        stats.total += r.n;
        if (r.status === "pending") stats.pending = r.n;
        if (r.status === "handled") stats.handled = r.n;
        if (r.status === "skipped") stats.skipped = r.n;
      }

      const posts = postsRes.results.map((r) => ({
        id: r.id,
        source: r.source,
        url: r.url,
        title: r.title,
        content: r.content,
        author: r.author,
        brandTags: r.brand_tags ? JSON.parse(r.brand_tags) as string[] : [],
        priority: r.priority,
        aiReply: r.ai_reply,
        status: r.status,
        handledBy: r.handled_by,
        handledAt: r.handled_at,
        scrapedAt: r.scraped_at,
      }));

      return { posts, stats };
    }),

  markHandled: publicProcedure
    .input(z.object({ token: z.string(), id: z.number(), handledBy: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (input.token !== RADAR_TOKEN) throw new Error("未授權");
      if (!ctx.env.DB) throw new Error("DB 未設定");
      await ctx.env.DB.prepare(
        `UPDATE radar_posts SET status = 'handled', handled_by = ?, handled_at = ? WHERE id = ?`
      )
        .bind(input.handledBy ?? "unknown", Date.now(), input.id)
        .run();
      return { ok: true };
    }),

  skip: publicProcedure
    .input(z.object({ token: z.string(), id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.token !== RADAR_TOKEN) throw new Error("未授權");
      if (!ctx.env.DB) throw new Error("DB 未設定");
      await ctx.env.DB.prepare(`UPDATE radar_posts SET status = 'skipped' WHERE id = ?`).bind(input.id).run();
      return { ok: true };
    }),

  generateReply: publicProcedure
    .input(z.object({ token: z.string(), id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.token !== RADAR_TOKEN) throw new Error("未授權");
      if (!ctx.env.DB) throw new Error("DB 未設定");
      const row = await ctx.env.DB.prepare(`SELECT * FROM radar_posts WHERE id = ?`).bind(input.id).first<{
        title: string; content: string; brand_tags: string; ai_reply: string | null;
      }>();
      if (!row) throw new Error("貼文不存在");
      if (row.ai_reply) return { reply: row.ai_reply };

      const brands = row.brand_tags ? (JSON.parse(row.brand_tags) as string[]) : [];
      const reply = await generateRadarReply(ctx.env, row.title, row.content, brands);
      if (reply) {
        await ctx.env.DB.prepare(`UPDATE radar_posts SET ai_reply = ? WHERE id = ?`).bind(reply, input.id).run();
      }
      return { reply };
    }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// 蹦闆精品 Abby 專區 — purchaseRouter（精品包 AI 辨識）
// 密碼守門由 _middleware.ts 的 eagle_abby_auth cookie 處理
// ═══════════════════════════════════════════════════════════════════════════════

const PURCHASE_CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const PURCHASE_CLAUDE_MODEL = 'claude-sonnet-4-6';
const PURCHASE_BATCH_CONCURRENCY = 10;
const PURCHASE_MAX_IMAGES = 60;

const PURCHASE_SYSTEM_PROMPT = `
你是蹦闆精品的資深採購辨識專家，專精頂級精品包鑑定。
任務：分析照片，輸出標準化 JSON 採購資訊，並產出對齊蹦闆 Excel 命名習慣的「productName」字串。

## 品牌辨識規則（含中文簡稱、輸出 brand 欄用）

### CHANEL（brand 一律全英文輸出 "CHANEL"）
- 雙 C 交叉標識、菱格紋縫線
- 常見型號：CF / Classic Flap / BOY / 19BAG / 22BAG / WOC / Coco Handle / 流浪包 / 金球（Mini Flap）/ 山型紋（Chevron）
- 尺寸：mini / 20 / 22 / 25 / 26 / 28 / 30 公分
- 特殊用語：N開（縫線數量、譬如 24開、30開）/ 有卡 / 無卡 / 芯片（NFC）/ 金扣 / 銀扣 / 黑金 / 荔枝皮 / 魚子醬

### LV（輸出「LV」、不寫 Louis Vuitton）
- 紋路重要：老花（Monogram）/ 棋盤格（Damier）/ 壓紋（Empreinte / 浮雕）/ 水波紋（Epi）/ 漆皮（Vernis）/ 拼皮 / 拚色
- 序號**必抓**：M / N 開頭 + 5 位數字（例：M45592 / N62227）、找不到才 null
- 常見型號：SPEEDY / NEVERFULL / PASSY / STEAMER / ON THE GO / Capucines / Vavin / Buci / Pont 9 / Camera Box / Cannes / Ipanema / SOFT TRUNK 盒子包 / Keepall / Christopher / On My Side / Discovery / TRIO 三合一 / Multi Pochette / WOC
- 款型：MM / PM / GM / BB / Mini（這些放進 size 欄）

### HERMES（brand 一律全英文輸出 "HERMES"、不寫 Hermès / 愛馬仕）
- 皮革質感極細、縫線工整
- 常見型號：BIRKIN / KELLY / PICOTIN / HERBAG / 依芙琳 / BOLIDE / LINDY / HALZAN / 菜籃子 / Constance / Steve / Garden Party / Halzan / Roulis / Alfred
- **框碼必抓**：刻印在五金、單一英文字母（A=2017/B=2018/C=2018/D=2019/X=2016/Y=2020/Z=2021/...）放進 features，格式「框D」「X刻」
- 年份：對照框碼推算（如「2019年」）放進 features
- 皮革：Togo / Clemence / Epsom 放進 features

### DIOR（英文輸出）
- 老花（Oblique）：D/I/O/R 字母交錯斜紋
- 常見型號：BOOK TOTE / SADDLE 馬鞍包 / 黛妃包（Lady Dior、3格/4格/5格/7格、N格代表縫線格數）/ BOBBY / 30 Montaigne / J'ADIOR / 鑽石款 / 動物園
- 款型：迷你 / 小款 / 中款 / 大款

### GUCCI（英文輸出）
- 提花（GG Supreme / Jumbo / 緹花 / 堤花、實際 Sheets 兩種寫法都有）
- 常見型號：Marmont / Ophidia / Bree Hobo / Interlocking G Mini / 1955 / 圓餅包 / 琴譜包 / 馬夢 / 虎頭相機包 / 酒神包 / 學院包 / 紅藍線條 / 紅綠線條
- 五金：竹節 Bamboo / 雙G LOGO

### YSL（英文輸出）
- 常見型號：NIKI（中款/BABY、有 D 扣 / 無 D 扣）/ LOULOU / SADE / ENVELOPE / CASSANDRE / WOC（魚子醬）
- 款型：BABY / 中款 / 中號 / 22 公分

### BV（中文簡稱「BV」、不寫 Bottega Veneta）
- 編織皮革（Intrecciato）必認得
- 常見：CASSETTE 枕頭包 / JODIE / ARCO 公事包 / 對開長夾 / 對開短夾 / 拉鍊長夾 / 和尚包 / Roma Bag

### GOYARD（英文輸出、滿版印花）
- 常見：SAINT LOUIS 托特 / ANJOU / 滿版馬鞍 / 滿版相機包

### BALENCIAGA（brand 一律全英文輸出 "BALENCIAGA"、不寫巴黎世家）
- 機車包（City / NANO CITY / 子母 / 紙袋）/ 沙漏包（鱷魚紋）/ 紙袋包

### LOEWE（英文輸出）
- PUZZLE 幾何包 / 吊床包（HOMME）/ 拚色

### FENDI（英文輸出）
- FF Zucca Canvas / 滿版托特 / 小水桶 / 後背包

### PRADA（英文輸出）
- Re-Nylon 尼龍 / Saffiano（鋸齒紋皮革）/ 三角標 / 殺手包（Galleria）/ 菜籃 / 對開長夾 / 降落傘後背包

### CELINE（英文輸出）
- CLASSIQUE TRIOMPHE 凱旋門 / 信封包 / 馬鞍包 / 鞦韆包 / 相機包 / 炯包

### BURBERRY（英文輸出）
- 經典格紋 / 尼龍後背包 / 格紋水桶 / Banner 托特 / 荔枝皮貝殼

### CHLOÉ（中文輸出「CHLOE」、原 Sheets 兩種寫法都有）
- Woody Mini / Marcie / 鐵環小包 / PUZZLE

### MIUMIU（英文輸出）
- 皺褶肩背 / 皺褶手提

### BVLGARI（brand 一律全英文輸出 "BVLGARI"、不寫寶格麗）
- 蛇頭包 / Serpenti

### 其他（GIVENCHY / FERRAGAMO / TOD'S 等）
- 認得就直接寫品牌全名（中文優先）+ 看到的特徵

---

## 材質辨識（重要、新增）

每個品牌的材質詞彙——AI 一定要識別並輸出 \`material\` 欄：

- **LV 紋路（材質類）**：老花（Monogram）/ 棋盤格（Damier）/ 壓紋（Empreinte 浮雕）/ 水波紋（Epi）/ 漆皮（Vernis）/ 拼皮（撞色拼接）/ 牛仔（Denim）
- **CHANEL 皮革**：小羊皮（Lambskin）/ 荔枝皮（Caviar 魚子醬）/ 山羊皮 / 蟒蛇皮 / 山型紋（Chevron）
- **HERMES 皮革**：Togo / Clemence / Epsom / Swift / Box / Fjord / Barenia / 帆布（Toile）
- **GUCCI 紋路**：提花（GG Supreme）/ 緹花（Jacquard）/ 壓紋（Embossed）/ 帆布（Canvas）/ 全皮革
- **DIOR 紋路**：老花（Oblique）/ 藤格紋（Cannage）/ 全皮革 / 鑽石款（Macrocannage）/ 油蠟皮
- **PRADA**：尼龍（Re-Nylon）/ Saffiano（鋸齒紋皮革）/ 全皮革
- **BV**：編織皮革（Intrecciato）/ 全皮革
- **GOYARD**：滿版花紋（Goyardine）
- **BURBERRY**：經典格紋 / 尼龍 / 全皮革
- **其他**：看不出材質就填空字串 ""

## 輸出格式（嚴格 JSON、不能有 markdown 或其他文字）

\`\`\`json
{
  "brand": "<品牌**全英文**、見下面清單、不加中文不加括號>",
  "material": "<材質、譬如 '老花' / '小羊皮' / 'Togo' / '編織' / '尼龍' / '提花'、看不清留空 ''>",
  "size": "<大小、譬如 '小款' / '中款' / '26公分' / '30公分' / 'MM' / 'PM' / 'GM' / 'BB' / null>",
  "model": "<型號（產品名稱）、譬如 '19BAG' / 'PASSY新款郵差包' / 'BIRKIN' / 'NIKI' / '黛妃包' / '蛇頭包'。**型號不確定就留空字串 ''**、不要瞎猜。看不到序號或產品標籤、又不認得就留空。>",
  "color": "<顏色、譬如 '黑金' / '黑' / '咖' / '棕'>",
  "serial": "<序號或 null、LV 必填 M/N 開頭、其他品牌通常 null>",
  "features": ["<特色陣列、譬如 '雙C金扣', '混色鏈條', '30開', '無卡', '芯片', '框D', '2000年', '金扣', '雙提把', '拉鍊開口', '男款'>"],
  "confidence": <0.0 到 1.0 之間的信心分數>,
  "productName": "<不含編號的完整商品名稱、AI 自己組、嚴格按下面命名順序、品牌**全英文**開頭>",
  "reasoning": "<一句話說明辨識依據>"
}
\`\`\`

## **品牌全英文清單（brand 欄 + productName 開頭一律用這個）**

主公明示：**所有品牌名稱都用全英文**、不要中文。

| 中文（舊） | **英文（新、必用）** |
|---|---|
| 香奈兒 | **CHANEL** |
| LV | **LV** |
| 愛馬仕 | **HERMES** |
| DIOR | **DIOR** |
| GUCCI | **GUCCI** |
| YSL | **YSL** |
| BV | **BV** |
| GOYARD | **GOYARD** |
| 巴黎世家 | **BALENCIAGA** |
| LOEWE | **LOEWE** |
| FENDI | **FENDI** |
| PRADA | **PRADA** |
| CELINE | **CELINE** |
| BURBERRY | **BURBERRY** |
| CHLOE / CHLOÉ | **CHLOE** |
| MIUMIU | **MIUMIU** |
| 寶格麗 | **BVLGARI** |
| 其他 | **OTHER** |

## productName 命名邏輯（**主公規則 2026-05-01：對齊蹦闆 Excel 真實寫法**）

主公明示：「**它都會寫什麼包什麼包、然後斜線、接著是顏色、編號**」——
材質 / 紋路（老花 / 棋盤格 / 堤花 / 小羊皮 等）**融進型號描述裡**、不要單獨拉出來當第二段。

### Sheets 真實 4 種 pattern

| pattern | 範例 |
|---|---|
| 1. 純品牌+型號（無斜線） | \`GUCCI堤花圓餅包\` / \`DIOR老花馬鞍包\` |
| 2. 品牌+型號 / 顏色 [序號] | \`DIOR 5格黛妃包/黑\` / \`LV老花拼色郵差包/咖 M44876\` |
| 3. 品牌+型號+尺寸 / 顏色 / 特徵 | \`HERMES菜籃子22公分/金棕/B刻\` |
| 4. 品牌+型號 / 顏色 尺寸 特徵 | \`CHANEL 19BAG/黑金 26公分 30開無卡\` / \`HERMES HERBAG 39/黑 框D/2000年\` |

### 各品牌寫法慣例（從 Sheets 提煉）

**LV**（品牌+型號**直連無空格**、紋路緊接 LV 之後）：
- \`LV老花PASSY新款郵差包/咖 M45592\`
- \`LV棋盤格對開長夾/黑 N62227\`
- \`LV老花ON THE GO/MM M45321\`（MM/PM/GM/BB 寫在型號後）
- \`LV NIGO手提包 N40355\`（聯名款空格）

**CHANEL**（品牌+空格+型號）：
- \`CHANEL 19BAG/黑金 26公分 30開無卡\`
- \`CHANEL BOY 25/黑銀 24開\`
- \`CHANEL 金球 Classic Flap Mini 20/奶茶色金扣 芯片\`
- \`CHANEL山型紋WOC/黑金 25開無卡\`（紋路直連）

**HERMES**（品牌+空格+型號、保留中文型號名）：
- \`HERMES HERBAG 39/黑 框D/2000年\`
- \`HERMES菜籃子22公分/金棕/B刻\`
- \`HERMES Birkin 30/灰 X刻2016年 金扣 Togo\`
- \`HERMES Lindy 26/錫器灰 Z刻 2021年 Clemence\`

**DIOR**（品牌+空格+型號）：
- \`DIOR 5格黛妃包/黑\`
- \`DIOR 老花 BOOK TOTE/中款\`
- \`DIOR老花馬鞍包\`（也有直連寫法、看 AI 判斷）

**GUCCI / BV / GOYARD**（品牌+型號**直連**）：
- \`GUCCI堤花圓餅包\`
- \`GUCCI緹花後背包\`
- \`BV編織對開短夾/灰\`
- \`GOYARD滿版托特包/綠\`

**YSL**（品牌+空格）：\`YSL NIKI /中款/黑\`

**其他**（PRADA / CELINE / LOEWE / FENDI / BURBERRY / BALENCIAGA / BVLGARI）品牌全英文、空格規則看具體商品：
- \`PRADA Re-Nylon Backpack 尼龍後背包/深藍\`
- \`CELINE鞦韆包\`
- \`LOEWE PUZZLE 幾何包/沙色\`
- \`FENDI滿版托特包/黑\`
- \`BURBERRY 尼龍後背包中款/紅\`
- \`BALENCIAGA NANO CITY機車包\`
- \`BVLGARI蛇頭包/祖母綠\`

### productName 規則

1. **不加開頭編號**（編號由後端拼進 formattedName）
2. **品牌全英文**（CHANEL / LV / HERMES / DIOR / GUCCI / YSL / BV / GOYARD / BALENCIAGA / LOEWE / FENDI / PRADA / CELINE / BURBERRY / CHLOE / MIUMIU / BVLGARI / OTHER、不寫中文）
3. **材質 / 紋路融進型號描述**——不要單獨「品牌 材質 大小 型號」這種固定順序
   - LV：紋路（老花 / 棋盤格 / 壓紋 / 水波紋）緊接 LV、再接型號名（直連無空格）
   - CHANEL：紋路（小羊皮 / 荔枝皮）通常**省略不寫**或寫在 features
   - GUCCI：紋路（堤花 / 緹花）緊接 GUCCI 後再接型號
4. **斜線 \`/\` 用法**：
   - 第一個 \`/\` 之後是**顏色**（單色或主+輔色、譬如 \`/黑\`、\`/咖\`、\`/黑金\`）
   - 顏色之後若有更多資訊用**空格**接（譬如 \`/黑 框D\`、\`/咖 M45592\`、\`/黑金 26公分 30開無卡\`）
   - 多段特徵之間用 \`/\` 分隔（譬如 \`/金棕/B刻\`、\`/黑 框D/2000年\`）
5. **LV 序號永遠在最後**（M45592 / N62227 等、緊接顏色或空格分隔）
6. **看到什麼寫什麼**——簡潔對齊蹦闆風格、不要硬塞「約」「大概」「左右」
7. **某元素沒有就跳過**（譬如 \`GUCCI堤花圓餅包\` 沒顏色就不寫斜線）
8. **型號不確定**就留空型號描述、譬如 \`LV老花/咖 M45592\`（紋路+顏色+序號）

## 嚴格規則

1. 若照片模糊、光線差、角度奇怪導致無法辨識 → confidence 給 0.5 以下、不要瞎掰
2. 只看得到一部分包包 → 如實描述可見部分、features 留空或說明
3. LV 一定要找序號（標籤 / 熱壓印字）、找到填 serial、找不到才 null
4. HERMES 框碼（單一英文字母刻印）找到放進 features、例：'B刻' / '框D'
5. **型號不確定就留空 ""、不要瞎猜**——主公明示「沒有也沒關係」
6. 輸出純 JSON、絕對不能有 markdown 標記、解釋文字、或前後 prefix
7. 不確定品牌時 brand 填 '其他'、productName 寫看到的描述
8. **productName 必填**——AI 一定要組出符合命名順序的字串
`.trim();

interface PurchaseRecognizeResult {
  imageIndex: number;
  brand: string;
  material: string;          // 主公 2026-04-30 加：材質（譬如 '老花' / '小羊皮' / 'Togo'）
  model: string;             // 型號（不確定就空字串、主公規則：沒有也沒關係）
  color: string;
  size: string | null;
  serial: string | null;
  features: string[];
  confidence: number;
  productName: string;       // 最終 productName（KV 命中時覆蓋 AI 結果）
  aiProductName: string;     // AI 原始辨識結果（kvHit 時保留對比用）
  kvHit: boolean;            // 是否命中 EAGLE_MODELS_KV
  verifiedTimes: number | null;  // KV 中的已驗證次數（kvHit 時填入）
  kvProductName: string | null;  // KV 中的標準品名（kvHit 時填入）
  formattedName: string;     // 含編號的完整字串（{seq}.{productName}）
  costLog: string;
  price: number | null;
  quantity: number;          // 主公 2026-05-01 加：數量（對齊 Sheets D 欄、預設 1、Abby 手改）
  error?: string;
}

/**
 * 拼接 formattedName：
 * - 優先用 AI 生成的 productName（已對齊蹦闆 Excel 命名習慣）
 * - productName 為空時 fallback 到舊式 switch（保險、避免 AI 偶爾漏給）
 */
function buildPurchaseFormattedName(
  seq: number,
  brand: string,
  model: string,
  color: string,
  size: string | null,
  serial: string | null,
  features: string[],
  productName?: string,
): string {
  // AI 直接給的 productName 已仿蹦闆風格、最可靠
  if (productName && productName.trim()) {
    return `${seq}.${productName.trim()}`;
  }

  // ---- Fallback：AI 沒給 productName 時用舊式 switch 拼 ----
  const cleanBrand = brand.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
  const f = features.join('');
  switch (cleanBrand) {
    case 'LV': {
      const serialPart = serial ? ` ${serial}` : '';
      const sizePart = size ? `/${size}` : '';
      return `${seq}.LV${model}${sizePart}/${color}${serialPart}`.trim();
    }
    case 'HERMES':
    case '愛馬仕': {
      const sizePart = size ? ` ${size}` : '';
      const colorPart = color ? `/${color}` : '';
      const featPart = features.length > 0 ? ` ${features.join(' ')}` : '';
      return `${seq}.HERMES ${model}${sizePart}${colorPart}${featPart}`.trim();
    }
    case 'CHANEL':
    case '香奈兒': {
      const sizePart = size ? ` ${size}` : '';
      const featPart = f ? ` ${f}` : '';
      return `${seq}.CHANEL ${model}/${color}${sizePart}${featPart}`.trim();
    }
    case 'DIOR': {
      const featPart = features.length > 0 ? `/${features.join('')}` : '';
      const colorPart = color ? `/${color}` : '';
      return `${seq}.DIOR ${model}${colorPart}${featPart}`.trim();
    }
    case 'GUCCI': {
      const colorPart = color ? `/${color}` : '';
      return `${seq}.GUCCI${model}${colorPart}`.trim();
    }
    case 'YSL': {
      const featPart = features.length > 0 ? `/${features.join('')}` : '';
      const colorPart = color ? `/${color}` : '';
      return `${seq}.YSL ${model}${colorPart}${featPart}`.trim();
    }
    case 'BV': {
      const colorPart = color ? `/${color}` : '';
      return `${seq}.BV${model}${colorPart}`.trim();
    }
    case 'GOYARD': {
      const colorPart = color ? `/${color}` : '';
      return `${seq}.GOYARD${model}${colorPart}`.trim();
    }
    default: {
      const colorPart = color ? `/${color}` : '';
      const sizePart = size ? `/${size}` : '';
      return `${seq}.${cleanBrand}${model}${colorPart}${sizePart}`.trim();
    }
  }
}

async function recognizeOnePurchaseImage(
  anthropicKey: string,
  imageIndex: number,
  imageData: string,
): Promise<PurchaseRecognizeResult> {
  let base64Data = imageData;
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';

  if (imageData.startsWith('data:')) {
    const match = imageData.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (match) {
      const mimeRaw = match[1] as string;
      if (
        mimeRaw === 'image/jpeg' ||
        mimeRaw === 'image/png' ||
        mimeRaw === 'image/gif' ||
        mimeRaw === 'image/webp'
      ) {
        mediaType = mimeRaw;
      }
      base64Data = match[2] as string;
    }
  }

  const estimatedInputTokens = 2000;
  const estimatedOutputTokens = 200;
  const estimatedCostNTD = (
    (estimatedInputTokens * 3 + estimatedOutputTokens * 15) / 1_000_000 * 32
  ).toFixed(2);

  const costLog = `[COST] image[${imageIndex}] ~${estimatedInputTokens}in+${estimatedOutputTokens}out tokens ≈ NT$${estimatedCostNTD}`;

  let rawJson = '';
  try {
    const response = await fetch(PURCHASE_CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: PURCHASE_CLAUDE_MODEL,
        max_tokens: 512,
        system: PURCHASE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: '請辨識這個精品包，輸出 JSON。',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Purchase] Claude 錯誤 image[${imageIndex}]:`, errText);
      return {
        imageIndex,
        brand: '辨識失敗',
        material: '',
        model: '',
        color: '',
        size: null,
        serial: null,
        features: [],
        confidence: 0,
        productName: '辨識失敗',
        aiProductName: '辨識失敗',
        kvHit: false,
        verifiedTimes: null,
        kvProductName: null,
        formattedName: `${imageIndex + 1}.辨識失敗`,
        costLog,
        price: null,
        quantity: 1,
        error: `Claude API 錯誤 (${response.status})`,
      };
    }

    const data = await response.json() as { content?: Array<{ text?: string }> };
    rawJson = data?.content?.[0]?.text || '';

    const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`無法解析 JSON: ${rawJson.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const brand: string = (parsed.brand as string) || '其他';
    const material: string = ((parsed.material as string) || '').trim();
    const model: string = (parsed.model as string) || '';
    const color: string = (parsed.color as string) || '';
    const size: string | null = (parsed.size as string) || null;
    const serial: string | null = (parsed.serial as string) || null;
    const features: string[] = Array.isArray(parsed.features) ? (parsed.features as string[]) : [];
    const confidence: number = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence as number))
      : 0.5;
    const productName: string = ((parsed.productName as string) || '').trim();

    const formattedName = buildPurchaseFormattedName(
      imageIndex + 1,
      brand,
      model,
      color,
      size,
      serial,
      features,
      productName,
    );

    console.log(costLog);
    // 預設帶上 KV 欄位（後續在 batchRecognize 裡會補齊）
    return {
      imageIndex, brand, material, model, color, size, serial, features, confidence,
      productName, aiProductName: productName,
      kvHit: false, verifiedTimes: null, kvProductName: null,
      formattedName, costLog, price: null, quantity: 1,
    };

  } catch (err) {
    console.error(`[Purchase] 解析錯誤 image[${imageIndex}]:`, err, 'rawJson:', rawJson.slice(0, 300));
    return {
      imageIndex,
      brand: '解析錯誤',
      material: '',
      model: '',
      color: '',
      size: null,
      serial: null,
      features: [],
      confidence: 0,
      productName: '解析錯誤',
      aiProductName: '解析錯誤',
      kvHit: false,
      verifiedTimes: null,
      kvProductName: null,
      formattedName: `${imageIndex + 1}.解析錯誤`,
      costLog,
      price: null,
      quantity: 1,
      error: String(err),
    };
  }
}

const purchaseRouter = router({
  /**
   * 批次辨識精品包照片
   * input:  { images: string[] }  — base64 或 data URL，上限 60 張
   * output: { results, totalCostLog, imageCount }
   */
  batchRecognize: publicProcedure
    .input(
      z.object({
        images: z
          .array(z.string().min(1))
          .min(1, '至少上傳 1 張照片')
          .max(PURCHASE_MAX_IMAGES, `單次最多 ${PURCHASE_MAX_IMAGES} 張（成本控制）`),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const anthropicKey = env?.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        throw new Error('ANTHROPIC_API_KEY 未設定，請在 Cloudflare Pages 後台環境變數中配置');
      }
      const modelsKv: KVNamespace | undefined = env?.EAGLE_MODELS_KV;

      const { images } = input;
      console.log(`[Purchase] 開始辨識 ${images.length} 張照片`);

      const allResults: PurchaseRecognizeResult[] = new Array(images.length);

      for (let batchStart = 0; batchStart < images.length; batchStart += PURCHASE_BATCH_CONCURRENCY) {
        const batchEnd = Math.min(batchStart + PURCHASE_BATCH_CONCURRENCY, images.length);
        const batchImages = images.slice(batchStart, batchEnd);

        const batchPromises = batchImages.map((imgData, localIdx) =>
          recognizeOnePurchaseImage(anthropicKey, batchStart + localIdx, imgData),
        );

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((r) => {
          allResults[r.imageIndex] = r;
        });

        console.log(`[Purchase] 批次 ${batchStart + 1}-${batchEnd} 完成`);
      }

      // ─── KV 前置查：對每筆有 serial 的結果查 EAGLE_MODELS_KV ─────────────────
      // 命中時用 KV.productName 覆蓋 AI 輸出，並填入 kvHit / verifiedTimes / kvProductName
      if (modelsKv) {
        await Promise.all(
          allResults.map(async (r, idx) => {
            if (!r.serial || r.brand === '辨識失敗' || r.brand === '解析錯誤') return;
            const brandUpper = r.brand.toUpperCase();
            const kvKey = `bbang:model:${brandUpper}:${r.serial}`;
            try {
              const raw = await modelsKv.get(kvKey);
              if (raw) {
                const kv = JSON.parse(raw) as {
                  productName?: string;
                  verifiedTimes?: number;
                  brand?: string;
                  serial?: string;
                };
                const kvProductName = kv.productName ?? null;
                const verifiedTimes = kv.verifiedTimes ?? null;
                if (kvProductName) {
                  // 用 KV 標準名覆蓋，保留 AI 結果
                  allResults[idx] = {
                    ...r,
                    aiProductName: r.productName,
                    productName: kvProductName,
                    kvHit: true,
                    verifiedTimes,
                    kvProductName,
                    // 重算 formattedName（用新 productName）
                    formattedName: `${r.imageIndex + 1}.${kvProductName}`,
                  };
                  console.log(`[Purchase] KV 命中 ${kvKey} → ${kvProductName} (verifiedTimes=${verifiedTimes})`);
                }
              } else {
                console.log(`[Purchase] KV 未命中 ${kvKey}`);
              }
            } catch (kvErr) {
              console.error(`[Purchase] KV 查詢失敗 ${kvKey}:`, kvErr);
            }
          }),
        );
      }

      const totalCostNTD = allResults.reduce((sum, r) => {
        const match = r.costLog.match(/NT\$([0-9.]+)/);
        return sum + (match?.[1] ? parseFloat(match[1]) : 0);
      }, 0);

      const totalCostLog = `[COST TOTAL] ${images.length} 張 ≈ NT$${totalCostNTD.toFixed(2)}`;
      console.log(totalCostLog);

      return {
        results: allResults,
        totalCostLog,
        imageCount: images.length,
      };
    }),

  // ─── saveBatch：將辨識結果真寫入 D1（採購紀錄）────────────────────────────
  // input:  { arrivalDate, items: [...] }
  // output: { batchId, itemCount, totalAmountNT }
  // 守門：cookie eagle_abby_auth（middleware 已處理）
  saveBatch: publicProcedure
    .input(
      z.object({
        arrivalDate: z.string().min(1, '到貨日期必填'),
        items: z
          .array(
            z.object({
              brand: z.string().min(1),
              serial: z.string().optional().nullable(),
              productName: z.string().min(1),
              color: z.string().optional().default(''),
              priceNT: z.number().int().nonnegative('價格不能為負'),
              quantity: z.number().int().positive().default(1),
              confidence: z.number().min(0).max(1).optional(),
              thumbnailUrl: z.string().optional().nullable(),
              kvHit: z.boolean().optional().default(false),  // KV 命中時觸發 verifiedTimes +1
            }),
          )
          .min(1, '至少要有 1 件商品'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const db: D1Database | undefined = env?.EAGLE_D1 ?? env?.DB;
      if (!db) throw new Error('EAGLE_D1 binding 未設定，請在 CF Dashboard 設定 D1 database');
      const modelsKv: KVNamespace | undefined = env?.EAGLE_MODELS_KV;

      const batchId = crypto.randomUUID();
      const now = new Date().toISOString();
      const totalAmountNT = input.items.reduce((sum, it) => sum + it.priceNT * it.quantity, 0);
      const itemCount = input.items.reduce((sum, it) => sum + it.quantity, 0);

      // 1. 寫 purchase_batch
      await db
        .prepare(
          `INSERT INTO purchase_batch (id, arrivalDate, totalAmountNT, itemCount, createdAt, createdBy)
           VALUES (?, ?, ?, ?, ?, 'Abby')`,
        )
        .bind(batchId, input.arrivalDate, totalAmountNT, itemCount, now)
        .run();

      // 2. 為每個 item 寫 purchase_item + inventory_item
      for (const item of input.items) {
        const itemId = crypto.randomUUID();
        const invId = crypto.randomUUID();

        await db
          .prepare(
            `INSERT INTO purchase_item
               (id, batchId, brand, serial, productName, color, priceNT, quantity, confidence, thumbnailUrl, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            itemId,
            batchId,
            item.brand,
            item.serial ?? null,
            item.productName,
            item.color,
            item.priceNT,
            item.quantity,
            item.confidence ?? null,
            item.thumbnailUrl ?? null,
            now,
          )
          .run();

        // 同時建庫存紀錄 status=in_store
        await db
          .prepare(
            `INSERT INTO inventory_item (id, itemId, status, updatedAt)
             VALUES (?, ?, 'in_store', ?)`,
          )
          .bind(invId, itemId, now)
          .run();

        // 3. KV 命中時 verifiedTimes +1 雙寫（D1 + KV 同步）
        if (item.kvHit && item.serial && modelsKv) {
          const brandUpper = item.brand.toUpperCase();
          const kvKey = `bbang:model:${brandUpper}:${item.serial}`;
          try {
            // D1 +1
            await db
              .prepare(
                `UPDATE bbang_models SET verifiedTimes = verifiedTimes + 1 WHERE brand = ? AND serial = ?`,
              )
              .bind(brandUpper, item.serial)
              .run();

            // KV 雙寫：讀取現有值再更新 verifiedTimes
            const raw = await modelsKv.get(kvKey);
            if (raw) {
              const existing = JSON.parse(raw) as Record<string, unknown>;
              const newTimes = ((existing.verifiedTimes as number) ?? 0) + 1;
              await modelsKv.put(kvKey, JSON.stringify({ ...existing, verifiedTimes: newTimes }));
              console.log(`[saveBatch] KV verifiedTimes +1 → ${newTimes} (${kvKey})`);
            }
          } catch (kvErr) {
            // 非致命錯誤：D1 主寫入已成功，KV 更新失敗只記 log
            console.error(`[saveBatch] verifiedTimes 更新失敗 ${kvKey}:`, kvErr);
          }
        }
      }

      return { batchId, itemCount, totalAmountNT };
    }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// 蹦闆精品 Abby 專區 — eagleRadarRouter（賣家雷達 Threads 掃描）
// KV: EAGLE_RADAR_KV（獨立、絕不共用其他品牌 KV）
// Apify token: APIFY_API_TOKEN
// 月預算上限: NT$3,500
// ═══════════════════════════════════════════════════════════════════════════════

interface EagleRadarPost {
  id: string;
  postUrl: string;
  author: string;
  authorId?: string;
  content: string;
  scrapedAt: string;
  publishedAt?: string;  // [2026-05-04 新增] 原始發文時間（ISO 8601）
  status: 'pending' | 'contacted' | 'matched' | 'rejected';
  source: 'threads' | 'facebook';  // [2026-05-04 擴充] 加 facebook
  keyword: string;
}

interface ApifyThreadsItem {
  id?: string;
  url?: string;
  postUrl?: string;  // [2026-05-04 補] Apify futurizerush 新版回傳欄位
  rank?: number;
  username?: string;
  userId?: string;
  text?: string;
  timestamp?: string | number;  // [2026-05-04 擴充] 可能是 ISO string 或 Unix timestamp number
  createdAt?: string;
}

const EAGLE_RADAR_DEFAULT_KEYWORDS = [
  '想賣 包包',
  '出售 LV',
  '出售 香奈兒',
  '出售 愛馬仕',
  '二手 LV',
  '二手 香奈兒',
  '二手 愛馬仕',
  '二手 名牌包',
] as const;

// [2026-05-04 新增] Facebook 公開搜尋關鍵字（比 Threads 短一點）
const EAGLE_RADAR_FB_KEYWORDS = [
  '出售 LV',
  '出售 香奈兒',
  '出售 愛馬仕',
  '二手 名牌包',
] as const;

// [2026-05-04 異步架構] fire-and-poll：改用 /runs 端點立即取 runId，避免 CF Pages 100s wall-clock timeout
const EAGLE_RADAR_APIFY_RUN_URL =
  'https://api.apify.com/v2/acts/futurizerush~threads-keyword-search/runs';
// [2026-05-04 新增] Facebook 公開貼文搜尋 actor
const EAGLE_RADAR_FB_APIFY_RUN_URL =
  'https://api.apify.com/v2/acts/danek~facebook-search-ppr/runs';
// 舊的同步端點保留作為常數備查（已不使用）
// const EAGLE_RADAR_APIFY_URL =
//   'https://api.apify.com/v2/acts/futurizerush~threads-keyword-search/run-sync-get-dataset-items';
const EAGLE_RADAR_MAX_RESULTS_PER_KW = 10;  // Apify actor maxResults 參數
const EAGLE_RADAR_FB_MAX_RESULTS = 10;       // [2026-05-04] FB actor resultsLimit 參數
const EAGLE_RADAR_30_DAYS_MS = 30 * 24 * 60 * 60 * 1000;  // [2026-05-04] 30 天篩選毫秒數
const EAGLE_RADAR_DEFAULT_BUDGET_NTD = 3500;
const EAGLE_RADAR_POST_TTL = 30 * 24 * 60 * 60;
const EAGLE_RADAR_DEDUP_TTL = 24 * 60 * 60;

function getEagleRadarYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function calcEagleRadarCostNTD(scannedCount: number): number {
  return Math.ceil(scannedCount / 100);
}

async function getEagleRadarCostThisMonthRaw(kv: KVNamespace): Promise<number> {
  const ym = getEagleRadarYearMonth();
  const val = await kv.get(`cost:${ym}`);
  return val ? parseInt(val, 10) : 0;
}

async function getEagleRadarBudget(kv: KVNamespace): Promise<number> {
  const val = await kv.get('budget');
  return val ? parseInt(val, 10) : EAGLE_RADAR_DEFAULT_BUDGET_NTD;
}

async function accumulateEagleRadarCost(kv: KVNamespace, costNTD: number): Promise<number> {
  const ym = getEagleRadarYearMonth();
  const key = `cost:${ym}`;
  const current = await kv.get(key);
  const prev = current ? parseInt(current, 10) : 0;
  const next = prev + costNTD;
  await kv.put(key, String(next));
  return next;
}

function eagleRadarContentFingerprint(content: string): string {
  return content.trim().slice(0, 50).replace(/\s+/g, ' ');
}

// [2026-05-04 異步架構] fire-only：POST /runs 立即取 runId，不等 actor 完成
// [2026-05-04 擴充] 加 platform 參數支援 threads / facebook
async function fireEagleRadarApifyRun(
  apifyToken: string,
  keyword: string,
  platform: 'threads' | 'facebook' = 'threads',
): Promise<string> {
  const runUrl = platform === 'facebook'
    ? EAGLE_RADAR_FB_APIFY_RUN_URL
    : EAGLE_RADAR_APIFY_RUN_URL;
  const url = `${runUrl}?token=${apifyToken}`;

  const body = platform === 'facebook'
    ? { searchQuery: keyword, resultsLimit: EAGLE_RADAR_FB_MAX_RESULTS, searchType: 'posts' }
    : { keywords: [keyword], maxResults: String(EAGLE_RADAR_MAX_RESULTS_PER_KW) };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Apify /runs 啟動錯誤 (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as { data?: { id?: string } };
  const runId = data?.data?.id;
  if (!runId) throw new Error('Apify /runs 未回傳 runId');
  return runId;
}

// [2026-05-04 異步架構] 查詢 run 狀態
interface ApifyRunStatus {
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTING' | 'ABORTED' | 'TIMED-OUT';
  defaultDatasetId?: string;
}

async function getApifyRunStatus(
  apifyToken: string,
  runId: string,
): Promise<ApifyRunStatus> {
  const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`查 run 狀態錯誤 (${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = await res.json() as { data?: { status?: string; defaultDatasetId?: string } };
  return {
    status: (data?.data?.status ?? 'RUNNING') as ApifyRunStatus['status'],
    defaultDatasetId: data?.data?.defaultDatasetId,
  };
}

// [2026-05-04 異步架構] 從 dataset 拉 items（泛化回傳，呼叫端自行轉型）
async function fetchApifyDatasetItems(
  apifyToken: string,
  datasetId: string,
): Promise<(ApifyThreadsItem | ApifyFbItem)[]> {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&clean=true&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`拉 dataset items 錯誤 (${res.status}): ${errText.slice(0, 200)}`);
  }
  const items = await res.json() as (ApifyThreadsItem | ApifyFbItem)[];
  return Array.isArray(items) ? items : [];
}

// KV key for pending Apify run
const EAGLE_RADAR_PENDING_RUN_KEY = 'radar:pending_run';

interface EagleRadarPendingRun {
  runId: string;
  keyword: string;
  startedAt: string;
  platform: 'threads' | 'facebook';  // [2026-05-04 新增] 平台標記
}

// [2026-05-04 新增] Facebook actor 回傳格式
interface ApifyFbItem {
  postId?: string;
  url?: string;
  text?: string;
  time?: string;        // ISO 8601 發文時間
  timestamp?: number;  // Unix timestamp（備用）
  pageName?: string;
  pageId?: string;
  likes?: number;
}

function toEagleRadarPost(item: ApifyThreadsItem, keyword: string): EagleRadarPost | null {
  // [2026-05-04 修] Apify futurizerush 回傳欄位是 postUrl 不是 url、且無 id
  const rawId = item.id || item.url || item.postUrl || null;
  if (!rawId) return null;

  const author = item.username || 'unknown';
  const content = (item.text || '').trim();
  if (!content) return null;

  // [2026-05-04 新增] 30 天篩選
  const publishedAt: string | undefined = item.timestamp
    ? (typeof item.timestamp === 'number'
        ? new Date(item.timestamp * 1000).toISOString()
        : item.timestamp)
    : item.createdAt || undefined;
  if (publishedAt) {
    const age = Date.now() - new Date(publishedAt).getTime();
    if (age > EAGLE_RADAR_30_DAYS_MS) return null;
  }

  const postUrl = item.postUrl || item.url || `https://www.threads.com/p/${rawId}`;
  const scrapedAt = new Date().toISOString();
  const threadsId = rawId
    .replace(/^https?:\/\/.*\/post\//, '')
    .replace(/^https?:\/\/.*\/p\//, '')
    .replace(/[?#].*$/, '')  // 去掉 query string / fragment（防 KV key > 512 bytes）
    .replace(/\/$/, '')
    .slice(0, 100);  // 安全截斷（CF KV key limit 512，'threads:' 前綴 8 bytes）

  return {
    id: `threads:${threadsId}`,
    postUrl,
    author,
    authorId: item.userId || undefined,
    content,
    scrapedAt,
    publishedAt,
    status: 'pending',
    source: 'threads',
    keyword,
  };
}

// [2026-05-04 新增] Facebook actor 轉換函數（含 30 天篩選）
function toEagleRadarFbPost(item: ApifyFbItem, keyword: string): EagleRadarPost | null {
  const rawId = item.postId || item.url || null;
  if (!rawId) return null;
  const content = (item.text || '').trim();
  if (!content) return null;

  // 30 天篩選
  const publishedAt: string | undefined = item.time
    ? item.time
    : (item.timestamp ? new Date(item.timestamp * 1000).toISOString() : undefined);
  if (publishedAt) {
    const age = Date.now() - new Date(publishedAt).getTime();
    if (age > EAGLE_RADAR_30_DAYS_MS) return null;
  }

  const postUrl = item.url || `https://www.facebook.com/${rawId}`;
  const fbId = rawId.replace(/[?#].*$/, '').slice(0, 100);

  return {
    id: `facebook:${fbId}`,
    postUrl,
    author: item.pageName || 'unknown',
    authorId: item.pageId,
    content,
    scrapedAt: new Date().toISOString(),
    publishedAt,
    status: 'pending',
    source: 'facebook',
    keyword,
  };
}

const eagleRadarRouter = router({
  /**
   * scanNow — fire-only 異步掃描 Threads
   * [2026-05-04 重構] 舊版同步等 actor 完成會 CF Pages 524 timeout（2-3 min > 100s limit）
   * 新版：POST /runs → 立即取 runId → 存 KV radar:pending_run → 立即回傳
   * 約 3 分鐘後呼叫 syncResults 才真正入庫
   * input:  { keywords?: string[] }（不指定就用預設 8 組輪流）
   * output: { runId, keyword, status: 'started', message }
   */
  scanNow: publicProcedure
    .input(
      z.object({
        keywords: z.array(z.string().min(1)).optional(),
      }).optional(),
    )
    .mutation(async ({ input, ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const kv: KVNamespace | undefined = env?.EAGLE_RADAR_KV;
      const apifyToken: string | undefined = env?.APIFY_API_TOKEN;

      if (!kv) {
        throw new Error('EAGLE_RADAR_KV 未綁定，請在 CF Dashboard 設定 KV namespace');
      }
      if (!apifyToken) {
        throw new Error('APIFY_API_TOKEN 未設定，請在 CF Dashboard 後台環境變數中配置');
      }

      const [costMonth, budget] = await Promise.all([
        getEagleRadarCostThisMonthRaw(kv),
        getEagleRadarBudget(kv),
      ]);

      if (costMonth >= budget) {
        console.warn(`[EagleRadar] 本月費用 NT$${costMonth} 已超過預算 NT$${budget}，停止掃描`);
        return {
          runId: null,
          keyword: null,
          platform: null as null,
          status: 'budget_exceeded' as const,
          message: `本月費用 NT$${costMonth} 已達預算 NT$${budget}，請調整預算或等下個月`,
        };
      }

      // [2026-05-04 擴充] 決定這次掃的 keyword 和平台（Threads 8kw + FB 4kw 輪流，共 12 個 slot）
      const ALL_SOURCES: Array<{ platform: 'threads' | 'facebook'; keyword: string }> = [
        ...EAGLE_RADAR_DEFAULT_KEYWORDS.map(kw => ({ platform: 'threads' as const, keyword: kw })),
        ...EAGLE_RADAR_FB_KEYWORDS.map(kw => ({ platform: 'facebook' as const, keyword: kw })),
      ];

      let keyword: string;
      let platform: 'threads' | 'facebook';

      if (input?.keywords?.length) {
        // 手動指定時預設 threads（保持向後相容）
        keyword = input.keywords[0];
        platform = 'threads';
      } else {
        const idxRaw = await kv.get('scan:nextSourceIdx');
        const idx = Number.parseInt(idxRaw || '0', 10) % ALL_SOURCES.length;
        ({ platform, keyword } = ALL_SOURCES[idx]);
        await kv.put('scan:nextSourceIdx', String((idx + 1) % ALL_SOURCES.length));
      }

      const platformLabel = platform === 'facebook' ? 'Facebook' : 'Threads';
      console.log(`[EagleRadar] fire-only 啟動 platform=${platform} keyword="${keyword}"`);

      // Fire Apify run，立即回 runId（不等 actor 完成）
      const runId = await fireEagleRadarApifyRun(apifyToken, keyword, platform);

      const pending: EagleRadarPendingRun = {
        runId,
        keyword,
        startedAt: new Date().toISOString(),
        platform,
      };
      await kv.put(EAGLE_RADAR_PENDING_RUN_KEY, JSON.stringify(pending));

      console.log(`[EagleRadar] 已啟動 runId=${runId}，platform=${platform} keyword="${keyword}"，存 pending_run KV`);

      return {
        runId,
        keyword,
        platform,
        status: 'started' as const,
        message: `掃描已啟動（${platformLabel}・關鍵字：${keyword}），約 2-3 分鐘後請點「同步結果」`,
      };
    }),

  /**
   * syncResults — 輪詢 Apify run 狀態，完成後拉 dataset 入庫 KV
   * [2026-05-04 新增] fire-and-poll 架構第二步
   * 呼叫時機：Abby 點「同步結果」按鈕；listPending 也會 best-effort 呼叫一次
   * output: { status, newCount, scanned, startedAt, costThisRun, costMonth }
   */
  syncResults: publicProcedure
    .mutation(async ({ ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const kv: KVNamespace | undefined = env?.EAGLE_RADAR_KV;
      const apifyToken: string | undefined = env?.APIFY_API_TOKEN;

      if (!kv) throw new Error('EAGLE_RADAR_KV 未綁定');
      if (!apifyToken) throw new Error('APIFY_API_TOKEN 未設定');

      // 讀 pending_run
      const pendingRaw = await kv.get(EAGLE_RADAR_PENDING_RUN_KEY);
      if (!pendingRaw) {
        return { status: 'no_pending' as const, newCount: 0, scanned: 0 };
      }

      let pending: EagleRadarPendingRun;
      try {
        pending = JSON.parse(pendingRaw) as EagleRadarPendingRun;
      } catch {
        await kv.delete(EAGLE_RADAR_PENDING_RUN_KEY);
        return { status: 'no_pending' as const, newCount: 0, scanned: 0 };
      }

      // 查 Apify run 狀態
      let runStatus: ApifyRunStatus;
      try {
        runStatus = await getApifyRunStatus(apifyToken, pending.runId);
      } catch (err) {
        console.error(`[EagleRadar] syncResults 查 run 狀態失敗: ${String(err)}`);
        return {
          status: 'check_failed' as const,
          newCount: 0,
          scanned: 0,
          runId: pending.runId,
          startedAt: pending.startedAt,
          error: String(err),
        };
      }

      console.log(`[EagleRadar] syncResults runId=${pending.runId} status=${runStatus.status}`);

      if (runStatus.status === 'RUNNING' || runStatus.status === 'READY') {
        return {
          status: 'still_running' as const,
          newCount: 0,
          scanned: 0,
          runId: pending.runId,
          startedAt: pending.startedAt,
        };
      }

      // 不論成功失敗都清掉 pending，避免卡死
      await kv.delete(EAGLE_RADAR_PENDING_RUN_KEY);

      if (runStatus.status !== 'SUCCEEDED') {
        console.warn(`[EagleRadar] run ${pending.runId} 狀態=${runStatus.status}，非 SUCCEEDED，不入庫`);
        return {
          status: 'run_failed' as const,
          newCount: 0,
          scanned: 0,
          runId: pending.runId,
          runActorStatus: runStatus.status,
        };
      }

      if (!runStatus.defaultDatasetId) {
        return {
          status: 'run_failed' as const,
          newCount: 0,
          scanned: 0,
          runId: pending.runId,
          runActorStatus: 'SUCCEEDED_NO_DATASET',
        };
      }

      // 拉 dataset items
      let items: (ApifyThreadsItem | ApifyFbItem)[];
      try {
        items = await fetchApifyDatasetItems(apifyToken, runStatus.defaultDatasetId);
      } catch (err) {
        console.error(`[EagleRadar] syncResults 拉 dataset 失敗: ${String(err)}`);
        return {
          status: 'dataset_fetch_failed' as const,
          newCount: 0,
          scanned: 0,
          runId: pending.runId,
          error: String(err),
        };
      }

      const pendingPlatform = pending.platform ?? 'threads';  // 向後相容舊 pending 無 platform 欄位
      console.log(`[EagleRadar] syncResults platform=${pendingPlatform} keyword="${pending.keyword}" → ${items.length} 筆`);

      // 入庫（dedup + ttl + 30 天篩選已在 toEagleRadar*Post 處理）
      let newCount = 0;
      for (const item of items) {
        // [2026-05-04] 根據 platform 選轉換函數
        const post = pendingPlatform === 'facebook'
          ? toEagleRadarFbPost(item as ApifyFbItem, pending.keyword)
          : toEagleRadarPost(item as ApifyThreadsItem, pending.keyword);
        if (!post) continue;

        const existingRaw = await kv.get(post.id);
        if (existingRaw) {
          // 更新但保留 status
          const existing = JSON.parse(existingRaw) as EagleRadarPost;
          const updated: EagleRadarPost = { ...post, status: existing.status };
          await kv.put(post.id, JSON.stringify(updated), {
            expirationTtl: EAGLE_RADAR_POST_TTL,
          });
          continue;
        }

        const dedupKey = `dedup:${post.author}:${eagleRadarContentFingerprint(post.content)}`;
        const isDup = await kv.get(dedupKey);
        if (isDup) {
          console.log(`[EagleRadar] 去重命中 author=${post.author}`);
          continue;
        }

        await kv.put(post.id, JSON.stringify(post), {
          expirationTtl: EAGLE_RADAR_POST_TTL,
        });
        await kv.put(dedupKey, '1', { expirationTtl: EAGLE_RADAR_DEDUP_TTL });
        newCount++;
      }

      const costThisRun = calcEagleRadarCostNTD(items.length);
      const newCostMonth = await accumulateEagleRadarCost(kv, costThisRun);
      await kv.put('scan:lastRun', new Date().toISOString());

      console.log(`[EagleRadar] syncResults 完成：scanned=${items.length}, new=${newCount}, cost=NT$${costThisRun}, 月累計=NT$${newCostMonth}`);

      return {
        status: 'synced' as const,
        scanned: items.length,
        newCount,
        costThisRun,
        costMonth: newCostMonth,
        keyword: pending.keyword,
      };
    }),

  /**
   * listPending — 列出雷達清單
   * [2026-05-04 改] 進入時 best-effort 觸發 syncResults，讓 Abby 重整頁面自動同步
   * input:  { status?: 'pending'|'contacted'|'matched'|'rejected'|'all' }
   * output: EagleRadarPost[]（按 scrapedAt 倒序，限 50 筆）
   */
  listPending: publicProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'contacted', 'matched', 'rejected', 'all']).default('pending'),
      }).optional(),
    )
    .query(async ({ input, ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const kv: KVNamespace | undefined = env?.EAGLE_RADAR_KV;

      if (!kv) {
        throw new Error('EAGLE_RADAR_KV 未綁定');
      }

      // best-effort auto-sync：若有 pending_run，嘗試同步一次（不影響 list 結果）
      const apifyToken: string | undefined = env?.APIFY_API_TOKEN;
      if (apifyToken) {
        try {
          const pendingRaw = await kv.get(EAGLE_RADAR_PENDING_RUN_KEY);
          if (pendingRaw) {
            const pending = JSON.parse(pendingRaw) as EagleRadarPendingRun;
            const runStatus = await getApifyRunStatus(apifyToken, pending.runId);
            if (runStatus.status === 'SUCCEEDED' && runStatus.defaultDatasetId) {
              await kv.delete(EAGLE_RADAR_PENDING_RUN_KEY);
              const items = await fetchApifyDatasetItems(apifyToken, runStatus.defaultDatasetId);
              const autoPlatform = pending.platform ?? 'threads';
              for (const item of items) {
                // [2026-05-04] 根據 platform 選轉換函數
                const post = autoPlatform === 'facebook'
                  ? toEagleRadarFbPost(item as ApifyFbItem, pending.keyword)
                  : toEagleRadarPost(item as ApifyThreadsItem, pending.keyword);
                if (!post) continue;
                const existingRaw = await kv.get(post.id);
                if (existingRaw) {
                  const existing = JSON.parse(existingRaw) as EagleRadarPost;
                  await kv.put(post.id, JSON.stringify({ ...post, status: existing.status }), { expirationTtl: EAGLE_RADAR_POST_TTL });
                  continue;
                }
                const dedupKey = `dedup:${post.author}:${eagleRadarContentFingerprint(post.content)}`;
                if (await kv.get(dedupKey)) continue;
                await kv.put(post.id, JSON.stringify(post), { expirationTtl: EAGLE_RADAR_POST_TTL });
                await kv.put(dedupKey, '1', { expirationTtl: EAGLE_RADAR_DEDUP_TTL });
              }
              const costThisRun = calcEagleRadarCostNTD(items.length);
              await accumulateEagleRadarCost(kv, costThisRun);
              await kv.put('scan:lastRun', new Date().toISOString());
              console.log(`[EagleRadar] listPending auto-sync 完成 ${items.length} 筆`);
            } else if (runStatus.status !== 'RUNNING' && runStatus.status !== 'READY') {
              // 終態但非 SUCCEEDED，清掉 pending 避免卡死
              await kv.delete(EAGLE_RADAR_PENDING_RUN_KEY);
            }
          }
        } catch (autoSyncErr) {
          // best-effort，失敗不影響 list
          console.warn(`[EagleRadar] listPending auto-sync 失敗（吞掉）: ${String(autoSyncErr)}`);
        }
      }

      const targetStatus = input?.status ?? 'pending';
      // [2026-05-04 擴充] 同時列出 threads: 和 facebook: 前綴
      const [threadsListResult, fbListResult] = await Promise.all([
        kv.list({ prefix: 'threads:', limit: 250 }),
        kv.list({ prefix: 'facebook:', limit: 250 }),
      ]);
      const allKeys = [...threadsListResult.keys, ...fbListResult.keys];
      const posts: EagleRadarPost[] = [];

      for (const key of allKeys) {
        const raw = await kv.get(key.name);
        if (!raw) continue;
        try {
          const post = JSON.parse(raw) as EagleRadarPost;
          if (targetStatus === 'all' || post.status === targetStatus) {
            posts.push(post);
          }
        } catch {
          // 壞資料跳過
        }
      }

      posts.sort((a, b) => b.scrapedAt.localeCompare(a.scrapedAt));
      return posts.slice(0, 50);
    }),

  /**
   * updateStatus — 更新單筆狀態
   */
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.enum(['pending', 'contacted', 'matched', 'rejected']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const kv: KVNamespace | undefined = env?.EAGLE_RADAR_KV;

      if (!kv) {
        throw new Error('EAGLE_RADAR_KV 未綁定');
      }

      const raw = await kv.get(input.id);
      if (!raw) {
        throw new Error(`找不到 post id=${input.id}`);
      }

      const post = JSON.parse(raw) as EagleRadarPost;
      const updated: EagleRadarPost = { ...post, status: input.status };

      await kv.put(input.id, JSON.stringify(updated), {
        expirationTtl: EAGLE_RADAR_POST_TTL,
      });

      return { ok: true, id: input.id, status: input.status };
    }),

  /**
   * getCostThisMonth — 本月費用 + 預算狀態
   */
  getCostThisMonth: publicProcedure
    .query(async ({ ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const kv: KVNamespace | undefined = env?.EAGLE_RADAR_KV;

      if (!kv) {
        throw new Error('EAGLE_RADAR_KV 未綁定');
      }

      const [costMonth, budget, lastRun] = await Promise.all([
        getEagleRadarCostThisMonthRaw(kv),
        getEagleRadarBudget(kv),
        kv.get('scan:lastRun'),
      ]);

      const percentUsed = budget > 0 ? Math.round((costMonth / budget) * 100) : 0;

      return {
        costMonth,
        budget,
        percentUsed,
        lastRun: lastRun || null,
      };
    }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// 蹦闆精品 Abby 專區 — inventoryRouter（庫存管理）
// 守門：cookie eagle_abby_auth（middleware 已處理）
// ═══════════════════════════════════════════════════════════════════════════════

const inventoryRouter = router({
  /**
   * list — 列出庫存（JOIN purchase_item + inventory_item）
   * input:  { status?, brand?, limit?, offset? }
   * output: { items, total }
   */
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(['in_store', 'sold', 'consigned', 'pending_clear', 'all']).default('in_store'),
        brand: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().nonnegative().default(0),
      }).optional(),
    )
    .query(async ({ input, ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const db: D1Database | undefined = env?.EAGLE_D1 ?? env?.DB;
      if (!db) throw new Error('EAGLE_D1 binding 未設定');

      const status = input?.status ?? 'in_store';
      const brand = input?.brand;
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;

      const whereParts: string[] = [];
      const bindings: (string | number)[] = [];

      if (status !== 'all') {
        whereParts.push('inv.status = ?');
        bindings.push(status);
      }
      if (brand) {
        whereParts.push('pi.brand = ?');
        bindings.push(brand);
      }

      const whereSQL = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

      const countRes = await db
        .prepare(
          `SELECT COUNT(*) as n
           FROM inventory_item inv
           JOIN purchase_item pi ON pi.id = inv.itemId
           ${whereSQL}`,
        )
        .bind(...bindings)
        .first<{ n: number }>();

      const total = countRes?.n ?? 0;

      const rows = await db
        .prepare(
          `SELECT
             inv.id        AS inventoryId,
             inv.status,
             inv.soldAt,
             inv.soldPriceNT,
             inv.location,
             inv.notes,
             inv.updatedAt,
             pi.id         AS itemId,
             pi.batchId,
             pi.brand,
             pi.serial,
             pi.productName,
             pi.color,
             pi.priceNT,
             pi.quantity,
             pi.confidence,
             pi.thumbnailUrl,
             pi.createdAt
           FROM inventory_item inv
           JOIN purchase_item pi ON pi.id = inv.itemId
           ${whereSQL}
           ORDER BY pi.createdAt DESC
           LIMIT ? OFFSET ?`,
        )
        .bind(...bindings, limit, offset)
        .all<{
          inventoryId: string;
          status: string;
          soldAt: string | null;
          soldPriceNT: number | null;
          location: string | null;
          notes: string | null;
          updatedAt: string;
          itemId: string;
          batchId: string;
          brand: string;
          serial: string | null;
          productName: string;
          color: string;
          priceNT: number;
          quantity: number;
          confidence: number | null;
          thumbnailUrl: string | null;
          createdAt: string;
        }>();

      return { items: rows.results, total };
    }),

  /**
   * updateStatus — 更新庫存狀態（賣出 / 寄賣 / 待清倉 等）
   */
  updateStatus: publicProcedure
    .input(
      z.object({
        inventoryId: z.string().min(1),
        status: z.enum(['in_store', 'sold', 'consigned', 'pending_clear']),
        soldPriceNT: z.number().int().nonnegative().optional().nullable(),
        soldAt: z.string().optional().nullable(),
        location: z.string().max(200).optional().nullable(),
        notes: z.string().max(1000).optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const db: D1Database | undefined = env?.EAGLE_D1 ?? env?.DB;
      if (!db) throw new Error('EAGLE_D1 binding 未設定');

      const now = new Date().toISOString();
      await db
        .prepare(
          `UPDATE inventory_item
           SET status = ?, soldPriceNT = ?, soldAt = ?, location = ?, notes = ?, updatedAt = ?
           WHERE id = ?`,
        )
        .bind(
          input.status,
          input.soldPriceNT ?? null,
          input.soldAt ?? null,
          input.location ?? null,
          input.notes ?? null,
          now,
          input.inventoryId,
        )
        .run();

      return { ok: true };
    }),

  /**
   * addToModelDb — 新增 / 更新蹦闆型號資料庫（D1 + KV 雙寫）
   * KV key: bbang:model:{brand}:{serial}
   */
  addToModelDb: publicProcedure
    .input(
      z.object({
        brand: z.string().min(1),
        serial: z.string().min(1),
        productName: z.string().min(1),
        photoUrl: z.string().optional().nullable(),
        notes: z.string().max(500).optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const db: D1Database | undefined = env?.EAGLE_D1 ?? env?.DB;
      const kv: KVNamespace | undefined = env?.EAGLE_MODELS_KV;
      if (!db) throw new Error('EAGLE_D1 binding 未設定');

      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const brandUpper = input.brand.toUpperCase();

      // D1 upsert（UNIQUE constraint on brand+serial）
      const result = await db
        .prepare(
          `INSERT INTO bbang_models (id, brand, serial, productName, photoUrl, addedBy, addedAt, verifiedTimes, notes)
           VALUES (?, ?, ?, ?, ?, 'Abby', ?, 1, ?)
           ON CONFLICT(brand, serial) DO UPDATE SET
             verifiedTimes = verifiedTimes + 1,
             productName = excluded.productName,
             photoUrl = COALESCE(excluded.photoUrl, photoUrl),
             notes = COALESCE(excluded.notes, notes)`,
        )
        .bind(id, brandUpper, input.serial, input.productName, input.photoUrl ?? null, now, input.notes ?? null)
        .run();

      const isNew = (result.meta.changes ?? 0) > 0 && !result.meta.last_row_id;

      // KV 雙寫（快速查找用，含 verifiedTimes 供 recognize 前置查使用）
      if (kv) {
        const kvKey = `bbang:model:${brandUpper}:${input.serial}`;
        // 讀 D1 取最新 verifiedTimes
        let verifiedTimes = 1;
        try {
          const row = await db
            .prepare(`SELECT verifiedTimes FROM bbang_models WHERE brand = ? AND serial = ? LIMIT 1`)
            .bind(brandUpper, input.serial)
            .first<{ verifiedTimes: number }>();
          if (row) verifiedTimes = row.verifiedTimes ?? 1;
        } catch { /* 讀取失敗不影響主流程，保留預設 1 */ }

        const kvValue = JSON.stringify({
          productName: input.productName,
          brand: brandUpper,
          serial: input.serial,
          photoUrl: input.photoUrl ?? null,
          addedBy: 'Abby',
          addedAt: now,
          notes: input.notes ?? null,
          verifiedTimes,
        });
        await kv.put(kvKey, kvValue);
      }

      return { ok: true, isNew };
    }),

  /**
   * getStats — 庫存統計（給 Day 3.4 dashboard 用）
   */
  getStats: publicProcedure
    .query(async ({ ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const db: D1Database | undefined = env?.EAGLE_D1 ?? env?.DB;
      if (!db) throw new Error('EAGLE_D1 binding 未設定');

      // 各狀態數量
      const statusRows = await db
        .prepare(
          `SELECT inv.status, COUNT(*) as n, SUM(pi.priceNT * pi.quantity) as totalNT
           FROM inventory_item inv
           JOIN purchase_item pi ON pi.id = inv.itemId
           GROUP BY inv.status`,
        )
        .all<{ status: string; n: number; totalNT: number }>();

      const byStatus: Record<string, { count: number; totalNT: number }> = {
        in_store: { count: 0, totalNT: 0 },
        sold: { count: 0, totalNT: 0 },
        consigned: { count: 0, totalNT: 0 },
        pending_clear: { count: 0, totalNT: 0 },
      };
      let totalItems = 0;
      let totalValueNT = 0;
      for (const r of statusRows.results) {
        byStatus[r.status] = { count: r.n, totalNT: r.totalNT ?? 0 };
        totalItems += r.n;
        totalValueNT += r.totalNT ?? 0;
      }

      // 各品牌分布
      const brandRows = await db
        .prepare(
          `SELECT pi.brand, COUNT(*) as count, SUM(pi.priceNT * pi.quantity) as totalValueNT
           FROM purchase_item pi
           JOIN inventory_item inv ON inv.itemId = pi.id
           WHERE inv.status != 'sold'
           GROUP BY pi.brand
           ORDER BY count DESC`,
        )
        .all<{ brand: string; count: number; totalValueNT: number }>();

      // 平均周轉天數（已售商品）
      const turnoverRow = await db
        .prepare(
          `SELECT AVG(
             CAST(julianday(inv.soldAt) - julianday(pi.createdAt) AS REAL)
           ) as avgDays
           FROM inventory_item inv
           JOIN purchase_item pi ON pi.id = inv.itemId
           WHERE inv.status = 'sold' AND inv.soldAt IS NOT NULL`,
        )
        .first<{ avgDays: number | null }>();

      // 月趨勢（近 6 個月）
      const monthlyRows = await db
        .prepare(
          `SELECT
             substr(pb.createdAt, 1, 7) as month,
             COUNT(DISTINCT pb.id) as batches,
             SUM(pb.itemCount) as items,
             SUM(pb.totalAmountNT) as totalNT
           FROM purchase_batch pb
           GROUP BY month
           ORDER BY month DESC
           LIMIT 6`,
        )
        .all<{ month: string; batches: number; items: number; totalNT: number }>();

      return {
        totalItems,
        totalValueNT,
        byStatus,
        byBrand: brandRows.results,
        avgTurnoverDays: turnoverRow?.avgDays ?? null,
        monthlyTrend: monthlyRows.results.reverse(),
      };
    }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// migrateRouter — 建立 Day 3 所需 D1 tables（一次性呼叫即可）
// 守門：X-Migrate-Token header 需等於 EAGLE_ABBY_PASSWORD
// ═══════════════════════════════════════════════════════════════════════════════

const migrateRouter = router({
  run: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const env = (ctx as unknown as { env: Env }).env;
      const expectedPw = env?.EAGLE_ABBY_PASSWORD ?? 'Abby888';
      if (input.token !== expectedPw) throw new Error('未授權');

      const db: D1Database | undefined = env?.EAGLE_D1 ?? env?.DB;
      if (!db) throw new Error('EAGLE_D1 binding 未設定');

      const sqls = [
        `CREATE TABLE IF NOT EXISTS purchase_batch (
          id TEXT PRIMARY KEY,
          arrivalDate TEXT NOT NULL,
          totalAmountNT INTEGER NOT NULL,
          itemCount INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          createdBy TEXT DEFAULT 'Abby'
        )`,
        `CREATE TABLE IF NOT EXISTS purchase_item (
          id TEXT PRIMARY KEY,
          batchId TEXT NOT NULL,
          brand TEXT NOT NULL,
          serial TEXT,
          productName TEXT,
          color TEXT,
          priceNT INTEGER NOT NULL,
          quantity INTEGER DEFAULT 1,
          confidence REAL,
          thumbnailUrl TEXT,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (batchId) REFERENCES purchase_batch(id)
        )`,
        `CREATE TABLE IF NOT EXISTS inventory_item (
          id TEXT PRIMARY KEY,
          itemId TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'in_store',
          soldAt TEXT,
          soldPriceNT INTEGER,
          location TEXT,
          notes TEXT,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (itemId) REFERENCES purchase_item(id)
        )`,
        `CREATE TABLE IF NOT EXISTS bbang_models (
          id TEXT PRIMARY KEY,
          brand TEXT NOT NULL,
          serial TEXT NOT NULL,
          productName TEXT NOT NULL,
          photoUrl TEXT,
          addedBy TEXT DEFAULT 'Abby',
          addedAt TEXT NOT NULL,
          verifiedTimes INTEGER DEFAULT 1,
          notes TEXT,
          UNIQUE(brand, serial)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_purchase_item_batch ON purchase_item(batchId)`,
        `CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_item(status)`,
        `CREATE INDEX IF NOT EXISTS idx_bbang_brand_serial ON bbang_models(brand, serial)`,
      ];

      const results: string[] = [];
      for (const sql of sqls) {
        try {
          await db.prepare(sql).run();
          results.push('OK: ' + sql.slice(0, 60).replace(/\s+/g, ' '));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // already exists = acceptable
          if (msg.includes('already exists') || msg.includes('duplicate')) {
            results.push('SKIP(exists): ' + sql.slice(0, 60).replace(/\s+/g, ' '));
          } else {
            throw new Error(`Migration failed at: ${sql.slice(0, 80)}\nError: ${msg}`);
          }
        }
      }

      return { ok: true, results };
    }),
});

// ─── tRPC Routes ──────────────────────────────────────────────────────────────

const appRouter = router({
  // ─── Text Copywriting ────────────────────────────────────────────────────────
  copywriter: router({
    generate: publicProcedure
      .input(
        z.object({
          style: z.enum(['seeding', 'live', 'minimal', 'ai']),
          length: z.enum(['short', 'long']),
          brand: z.string().max(100),
          productType: z.string().max(50),
          tags: z.array(z.string()).max(20),
          customNote: z.string().max(300).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const styleMap: Record<string, string> = {
          seeding: `種草帶貨風格。架構用 PAS（痛點→放大→解方）：\n1. 開頭用一個具體生活場景切入痛點或渴望（例：「每次出國逛精品店，看到價差都心痛」）\n2. 放大這個情緒——不解決會怎樣、解決了生活會有什麼改變\n3. 帶出商品作為解方，用五感描寫讓人「看到畫面」\n語氣：像閨蜜在跟你分享戰利品，口語、有溫度、偶爾自嘲`,
          live: `直播導購風格。架構用 AIDA（注意→興趣→慾望→行動）：\n1. 開頭要像在直播間喊話，短句、節奏快、有緊迫感\n2. 馬上丟出一個讓人停下來的數字或事實（價差、限量數、搶購速度）\n3. 用觸覺/視覺描寫讓觀眾「摸到」商品質感\n4. 結尾明確行動呼籲，製造稀缺感\n語氣：口播節奏、像面對面在賣場跟你講話`,
          minimal: `精品極簡風格。架構用 FABE（特色→優勢→好處→證據）：\n1. 用最少的字說最多的事，每個字都有任務\n2. 留白感——不說滿，讓讀者自己填入想像\n3. 像精品品牌官方 IG 的調性，冷靜但有力\n4. 一句話段落製造節奏，長短交錯\n語氣：克制、優雅、像品牌官方發言人`,
          ai: `綜合最優化風格。融合種草的情境感、直播的節奏感、極簡的質感：\n1. 開頭用 Hook 3秒法則：8字以內的短句抓住注意力\n2. 中段用 PAS 或 AIDA 架構推進\n3. 收尾不要太完美——用吐槽式、懸念式或突然結束式\n4. 全文至少一處五感描寫、一個具體數字\n語氣：最自然流暢，像一個有品味的朋友在聊天`,
        };

        const lengthMap: Record<string, string> = {
          short: '短文案（50-100字，精煉有力，適合 IG 限動或貼文標題）。短不代表弱——每句話都要有力道，像子彈不像散文。',
          long: '長文案（200-400字）。用六層架構：①提問題→②形容有多嚴重→③不解決的壞事/解決的好事→④解決問題→⑤形容解決後的感受→⑥為什麼你能解決。段落長短要參差不齊，有的一句話就一段。',
        };

        const tagLabels = input.tags.join('、');

        const systemPrompt = `你是「伊果國外精品代購」的首席文案——這個品牌 Facebook 39 萬粉絲、代購超過十年、四大洲親自採買。你寫的每一篇文案都要讓人停下拇指。

## 核心能力

你精通三大文案模型：
- AIDA：注意→興趣→慾望→行動
- PAS：痛點→放大→解方
- FABE：特色→優勢→好處→證據

## 情緒引擎（馬斯洛 7 情——選擇最適合商品的 1-2 個切角）

| 層級 | 情緒 | 切角範例 |
|------|------|---------|
| 自我實現 | 成就感 | 擁有它代表你走到了這一步 |
| 美好 | 美感愉悅 | 光是看著它放在桌上就覺得值了 |
| 認知 | 知識感 | 懂得欣賞這個細節的人不多 |
| 自尊 | 優越感 | 聰明的選擇，有品味的象徵 |
| 社交 | 歸屬感 | 送禮、犒賞自己、被看見 |
| 安全 | 安心感 | 正品保證、十年代購信譽 |
| 生理 | 舒適感 | 觸感、使用體驗的直覺滿足 |

## 五感寫作法（每篇至少出現一種）

- 視覺：不寫「很美」，寫「午後陽光打在皮面上，那個光澤會讓你多看兩眼」
- 觸覺：不寫「質感好」，寫「指尖滑過荔枝紋皮革，那種顆粒感會上癮」
- 嗅覺：「打開盒子的瞬間，皮革混著木質調的香氣撲過來」
- 聽覺：「金屬扣環 click 一聲扣上，那個聲音就是精品的聲音」

## Hook / 開頭 3 秒法則

前兩句決定生死。開頭策略（五選一）：
- 痛點型：說出讀者的困擾
- 賣點型：一句話秒懂獨特好處
- 驚點型：打破認知、製造意外
- 懸點型：勾起好奇心
- 暖點型：說出心聲、情感共鳴

## 去 AI 味守則（嚴格遵守）

1. 不用 emoji 當分類標題
2. 段落長短參差不齊——有的一句話就一段，有的寫長一點
3. 禁用：「整體」「氛圍」「超級」「真心覺得」「非常推薦」「不僅…更…」「無論…都…」「值得一提的是」
4. 推薦要帶具體細節——一個價差數字、一個觸感描寫、一個場景
5. 語氣全篇統一，結尾不要突然變正式
6. 結尾不要太正面太完美——可以用吐槽、懸念、或突然結束
7. 帶至少一個具體數字（用非圓整數更可信：「省了 8,700」比「省了快一萬」好）
8. 分析或推測加語氣緩衝：「可能」「我猜」「應該是」
9. 禁止句型：「在這個…的時代」「讓我們一起…」「相信你一定會…」「話不多說」「廢話不多說」
10. 最終檢驗：拿掉品牌名，讀起來要像一個有血有肉的人在說話

## 格式要求

- 繁體中文，符合台灣 FB/IG 閱讀習慣
- 適當換行，段落有呼吸感
- emoji 克制使用（最多 3 個，選精品感符號）
- Hashtag 另起一行放最後，8-12 個，中英混合
- 文案中自然帶出「伊果國外精品代購」（不要硬塞在最後一句）

## 行銷 4 有自檢

產出前確認：
- 有哏：能不能讓人想停下來看？
- 有關：跟目標讀者的生活有關嗎？
- 有感：能引起情感共鳴嗎？
- 有想要：看完會不會想買？`;

        const userPrompt = `請為以下商品撰寫一篇${lengthMap[input.length]}：

品牌/商品名稱：${input.brand || '（精品）'}
商品類型：${input.productType || '精品'}
商品特性：${tagLabels || '（未指定）'}
${input.customNote ? `補充說明：${input.customNote}` : ''}

文案風格：${styleMap[input.style]}

直接輸出文案，不要任何前言、說明、或「以下是文案」之類的開場。`;

        const content = await callGeminiText(ctx.env, withMarketing(systemPrompt), userPrompt);
        return { content };
      }),

    rewrite: publicProcedure
      .input(
        z.object({
          originalText: z.string().max(2000),
          style: z.enum(['seeding', 'live', 'minimal', 'ai']),
          instruction: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const styleMap: Record<string, string> = {
          seeding:
            '種草帶貨風格：用 PAS 架構（痛點→放大→解方），加入生活場景和五感描寫，語氣像閨蜜分享戰利品',
          live: '直播導購風格：用 AIDA 架構（注意→興趣→慾望→行動），短句快節奏、有數字有緊迫感、像面對面在講話',
          minimal: '精品極簡風格：用 FABE 架構（特色→優勢→好處→證據），字字珠璣、留白感、冷靜但有力',
          ai: '最優化版本：融合三種風格的優點，Hook 開頭、架構清晰、五感描寫、具體數字、結尾不落俗套',
        };

        const systemPrompt = `你是「伊果國外精品代購」的文案改寫專家。改寫時保留原文核心資訊，但大幅提升品質。

改寫原則：
1. 開頭換掉——用 Hook 3秒法則重寫第一句（痛點/賣點/驚點/懸點/暖點五選一）
2. 加入至少一處五感描寫（視覺畫面、觸覺質感、嗅覺記憶、聽覺細節）
3. 補一個具體數字（價差、限量數、年份——用非圓整數）
4. 段落長短參差不齊，用一句話段落製造節奏
5. 結尾不要太完美——吐槽式、懸念式、或突然結束式
6. 去 AI 味：禁用「整體」「氛圍」「不僅…更…」「在這個…的時代」「讓我們一起…」「話不多說」
7. 情緒切角：從馬斯洛 7 情中選最適合的（自尊/美好/社交/安全感）
8. 最終檢驗：拿掉品牌名，讀起來像不像一個真人寫的？

使用繁體中文，符合台灣 FB/IG 閱讀習慣。`;

        const userPrompt = `請將以下文案改寫為${styleMap[input.style]}：
${input.instruction ? `\n特別調整要求：${input.instruction}\n` : ''}
原文：
${input.originalText}

直接輸出改寫後的完整文案，不要任何前言或說明。`;

        const content = await callGeminiText(ctx.env, withMarketing(systemPrompt), userPrompt);
        return { content };
      }),
  }),

  // ─── Image Processing (GPT Image 2 單一模式) ─────────────────────────────
  imageProcessor: router({
    refine: publicProcedure
      .input(
        z.object({
          imageBase64: z.string().max(10_000_000),
          mimeType: z.string().default('image/jpeg'),
          preset: z
            .enum([
              'marble-white',
              'marble-black',
              'velvet-black',
              'velvet-deep-blue',
              'gold-bokeh',
              'champagne-silk',
              'dark-wood',
              'mirror-reflection',
              'rose-petal',
              'crystal-light',
            ])
            .optional(),
          customPrompt: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const presets: Record<string, string> = {
          'marble-white':
            'Place the product on a pristine white Carrara marble surface with subtle gold veining. Soft studio lighting, clean minimalist composition, luxury product photography.',
          'marble-black':
            'Place the product on dramatic black marble with gold veining. Moody side lighting, deep shadows, high-end editorial luxury style.',
          'velvet-black':
            'Place the product on rich black velvet fabric. Dramatic side lighting, jewelry photography style, deep luxurious shadows.',
          'velvet-deep-blue':
            'Place the product on deep navy blue velvet background. Soft dramatic lighting, high fashion editorial style.',
          'gold-bokeh':
            'Place the product against a warm golden bokeh background. Champagne gold light halo, dreamy opulent atmosphere.',
          'champagne-silk':
            'Place the product on flowing champagne silk fabric with soft folds. Warm golden hour lighting, elegant and soft luxury.',
          'dark-wood':
            'Place the product on a dark walnut wood texture surface. Warm accent lighting, refined luxury lifestyle photography.',
          'mirror-reflection':
            'Place the product on a smooth mirror acrylic surface with perfect reflection. High-end commercial product photography.',
          'rose-petal':
            'Place the product surrounded by scattered rose petals on a dark background. Romantic opulent atmosphere, soft warm light.',
          'crystal-light':
            'Place the product with crystal prism light effects and rainbow light refraction. Jewelry photography style, magical luxury feel.',
        };

        const sceneInstruction = input.customPrompt?.trim()
          ? input.customPrompt.trim()
          : presets[input.preset ?? 'marble-white'];

        const prompt = [
          sceneInstruction,
          "CRITICAL: Keep the product itself completely identical to the input image — do NOT alter the product's shape, colors, materials, labels, packaging, or any text/logos on it.",
          'Preserve every character of Chinese, English, or other text on the product packaging with pixel-perfect accuracy.',
          'Only change the background scene and lighting around the product.',
          'Ultra-high quality commercial product photography, sharp focus on the product, photorealistic.',
        ].join(' ');

        // 嘗試用 fal.ai 去背生成 mask（鎖住產品本體，只換背景）
        let maskBase64: string | undefined;
        if (ctx.env.FAL_KEY) {
          try {
            maskBase64 = await removeBackgroundForMask(input.imageBase64, input.mimeType, ctx.env.FAL_KEY);
          } catch (e) {
            // 去背失敗不中斷，fallback 到無 mask 模式
            console.error('[ImageEditor] fal.ai 去背失敗，改用無 mask 模式:', e);
          }
        }

        const imageBase64 = await refineWithGptImage(
          ctx.env,
          prompt,
          input.imageBase64,
          input.mimeType,
          maskBase64
        );

        return {
          imageBase64,
          preset: input.preset,
          message: maskBase64
            ? '精修完成，已鎖定產品本體（去背 mask 模式）'
            : 'GPT Image 2 精修完成，商品文字 100% 保留',
          usedMask: !!maskBase64,
        };
      }),
  }),

  // ─── Feedback (Cloudflare D1) ────────────────────────────────────────────────
  feedback: router({
    submit: publicProcedure
      .input(
        z.object({
          nickname: z.string().min(1).max(50),
          category: z.enum(['feature', 'ui', 'bug', 'other']),
          content: z.string().min(5).max(2000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.env.DB) throw new Error('D1 database binding (DB) 未設定');
        await ctx.env.DB.prepare(
          'INSERT INTO feedbacks (nickname, category, content, status, created_at) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(input.nickname, input.category, input.content, 'pending', Date.now())
          .run();
        return { success: true };
      }),

    list: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.env.DB) return [];
      const { results } = await ctx.env.DB.prepare(
        'SELECT id, nickname, category, content, status, admin_reply AS adminReply, created_at AS createdAt FROM feedbacks ORDER BY created_at DESC LIMIT 100'
      ).all<{
        id: number;
        nickname: string;
        category: string;
        content: string;
        status: string;
        adminReply: string | null;
        createdAt: number;
      }>();
      return results.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
    }),

    delete: publicProcedure
      .input(z.object({ id: z.number(), nickname: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.env.DB) throw new Error('D1 database binding (DB) 未設定');
        const existing = await ctx.env.DB.prepare(
          'SELECT nickname FROM feedbacks WHERE id = ?'
        )
          .bind(input.id)
          .first<{ nickname: string }>();
        if (!existing || existing.nickname !== input.nickname) {
          throw new Error('無法刪除此建議');
        }
        await ctx.env.DB.prepare('DELETE FROM feedbacks WHERE id = ?').bind(input.id).run();
        return { success: true };
      }),

    // ── AI Output Rating (FeedbackBar) ────────────────────────────────────
    status: publicProcedure.query(({ ctx }) => ({
      configured: !!ctx.env.DB,
    })),

    rateOutput: publicProcedure
      .input(z.object({
        tool: z.string(),
        toolContext: z.string().optional(),
        outputText: z.string(),
        rating: z.enum(['up', 'down', 'gold']),
        userName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = ctx.env.DB as any;
        if (!db) return { success: false, stored: false };
        const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        await db.prepare(
          `INSERT INTO feedback (id, output_id, rating, tool, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
        ).bind(id, `adhoc_${id}`, input.rating, input.tool).run();
        if (input.rating === 'gold') {
          const gid = `g_${id}`;
          await db.prepare(
            `INSERT INTO gold_library (id, content, tool, created_at) VALUES (?, ?, ?, datetime('now'))`
          ).bind(gid, input.outputText, input.tool).run();
        }
        return { success: true, stored: true };
      }),
  }),

  radar: radarRouter,

  // ══════════════════════════════════════════════════════════════════════════
  // 採購助手（蹦闆精品 Abby 專區）
  // ─ 受 middleware 密碼守門（eagle_abby_auth cookie）
  // ─ 辨識精品包照片、批次 Claude Sonnet vision
  // ══════════════════════════════════════════════════════════════════════════
  purchase: purchaseRouter,

  // ══════════════════════════════════════════════════════════════════════════
  // 賣家雷達（蹦闆精品 Abby 專區）
  // ─ 受 middleware 密碼守門（eagle_abby_auth cookie）
  // ─ Apify Threads 關鍵字掃描、KV 入庫、預算守門
  // ══════════════════════════════════════════════════════════════════════════
  eagleRadar: eagleRadarRouter,

  // ══════════════════════════════════════════════════════════════════════════
  // 庫存管理（蹦闆精品 Abby 專區）
  // ─ D1 EAGLE_D1 + KV EAGLE_MODELS_KV
  // ─ 受 middleware 密碼守門（eagle_abby_auth cookie）
  // ══════════════════════════════════════════════════════════════════════════
  inventory: inventoryRouter,

  // ── 建表 migration（一次性執行）────────────────────────────────────────
  migrate: migrateRouter,
});

export type AppRouter = typeof appRouter;

// ─── Cloudflare Pages Function Handler ───────────────────────────────────────

export const onRequest: PagesFunction<Env> = async (context) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: context.request,
    router: appRouter,
    createContext: () => ({
      env: context.env as unknown as Env,
    }),
  });
};
