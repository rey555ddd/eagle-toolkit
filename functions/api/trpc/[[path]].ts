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
}

interface Context {
  env: Env;
}

// ─── tRPC Setup ───────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  transformer: superjson,
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

const TEXT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash-lite'];

async function callGeminiText(
  env: Env,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const genAI = getGeminiClient(env);
  let lastError: unknown;
  for (const modelName of TEXT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
      const result = await model.generateContent(userPrompt);
      return result.response.text();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('503') || msg.includes('404') || msg.includes('overloaded') || msg.includes('high demand') || msg.includes('no longer available')) {
        console.log(`Model ${modelName} overloaded, trying fallback...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
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

原文：
${input.originalText}

直接輸出改寫後的完整文案，不要任何前言或說明。`;

        const content = await callGeminiText(ctx.env, withMarketing(systemPrompt), userPrompt);
        return { content };
      }),
  }),

  // ─── Image Processing ────────────────────────────────────────────────────────
  imageProcessor: router({
    removeBackground: publicProcedure
      .input(
        z.object({
          imageBase64: z.string().max(10_000_000),
          mimeType: z.string().default('image/jpeg'),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const analysisPrompt = `Describe this product in 1-2 sentences for luxury product photography. Include: product type, main color, material, and brand if visible. English only.`;
        const productDescription = await callGeminiVision(
          ctx.env,
          analysisPrompt,
          input.imageBase64,
          input.mimeType
        );
        return {
          productDescription: productDescription.trim(),
          message: '圖片分析完成，請選擇背景進行合成',
        };
      }),

    applyLuxuryBackground: publicProcedure
      .input(
        z.object({
          imageBase64: z.string().max(10_000_000),
          mimeType: z.string().default('image/jpeg'),
          backgroundStyle: z.enum([
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
          ]),
          colorLock: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const bgPrompts: Record<string, string> = {
          'marble-white':
            'luxury product photography on white Carrara marble surface with subtle gold veining, soft studio lighting, clean minimalist composition,',
          'marble-black':
            'luxury product photography on dramatic black marble with gold veining, moody side lighting, deep shadows, high-end editorial style,',
          'velvet-black':
            'luxury product photography on rich black velvet fabric, dramatic side lighting, jewelry photography style, deep shadows,',
          'velvet-deep-blue':
            'luxury product photography on deep navy blue velvet background, soft dramatic lighting, high fashion editorial,',
          'gold-bokeh':
            'luxury product photography with warm golden bokeh background, champagne gold light halo, dreamy opulent atmosphere,',
          'champagne-silk':
            'luxury product photography on flowing champagne silk fabric with soft folds, warm golden hour lighting, elegant and soft,',
          'dark-wood':
            'luxury product photography on dark walnut wood texture surface, warm accent lighting, refined lifestyle photography,',
          'mirror-reflection':
            'luxury product photography on smooth mirror/acrylic surface with perfect reflection, high-end commercial product photography,',
          'rose-petal':
            'luxury product photography surrounded by scattered rose petals on dark background, romantic opulent atmosphere, soft warm light,',
          'crystal-light':
            'luxury product photography with crystal prism light effects, rainbow light refraction, jewelry photography style, magical luxury,',
        };

        const basePrompt = bgPrompts[input.backgroundStyle];
        const colorLockInstruction = input.colorLock
          ? ' CRITICAL IMAGE EDITING INSTRUCTION: Keep the product EXACTLY as shown in the original photo. Preserve the EXACT same colors, patterns, details, shape, and textures. Do NOT alter, tint, recolor, or regenerate the product in any way. ONLY replace the background. The product must remain pixel-perfect identical to the input image.'
          : '';
        const prompt = basePrompt + colorLockInstruction;

        let resultBase64: string;
        let usedFallback = false;

        if (input.colorLock) {
          // Color Lock ON: MUST use Gemini which receives the actual image.
          // Imagen only generates from text prompt and cannot preserve original colors.
          try {
            resultBase64 = await generateWithGeminiFallback(
              ctx.env,
              prompt,
              input.imageBase64,
              input.mimeType
            );
            usedFallback = true;
          } catch (fallbackError) {
            console.error('[Gemini Color Lock generation failed]', fallbackError);
            throw new Error(
              `Color Lock generation failed. Please try again. Error: ${
                fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
              }`
            );
          }
        } else {
          try {
            // Primary method: Imagen (best quality for non-color-lock)
            resultBase64 = await generateWithImagen(
              ctx.env,
              prompt,
              input.imageBase64,
              input.mimeType
            );
          } catch (imagenError) {
            console.warn('[Imagen failed, trying Gemini fallback]', imagenError);
            try {
              resultBase64 = await generateWithGeminiFallback(
                ctx.env,
                prompt,
                input.imageBase64,
                input.mimeType
              );
              usedFallback = true;
            } catch (fallbackError) {
              console.error('[Gemini fallback also failed]', fallbackError);
              throw new Error(
                `AI image generation failed. Please try again later. Error: ${
                  fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                }`
              );
            }
          }
        }

        // Return base64 directly (no S3 storage on Cloudflare Pages)
        return {
          imageBase64: resultBase64,
          backgroundStyle: input.backgroundStyle,
          usedFallback,
          message: usedFallback
            ? 'AI image generated (using fallback method)'
            : 'Imagen 3 AI image generated',
        };
      }),
  }),

  // ─── Feedback (Database-dependent - Mock responses) ──────────────────────────
  feedback: router({
    submit: publicProcedure
      .input(
        z.object({
          nickname: z.string().min(1).max(50),
          category: z.enum(['feature', 'ui', 'bug', 'other']),
          content: z.string().min(5).max(2000),
        })
      )
      .mutation(async () => {
        throw new Error(
          'Feedback feature requires database connection. Not available on Cloudflare Pages.'
        );
      }),

    list: publicProcedure.query(async () => {
      // Return empty list (database not available on CF Pages)
      return [];
    }),

    delete: publicProcedure
      .input(z.object({ id: z.number(), nickname: z.string() }))
      .mutation(async () => {
        throw new Error(
          'Feedback deletion requires database connection. Not available on Cloudflare Pages.'
        );
      }),
  }),
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
