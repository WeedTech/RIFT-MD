// .img <search> [count 1-5]
const axios = require("axios");

module.exports = async (sock, m, args) => {
    const chatId = m.key.remoteJid;

    let count = 3;
    if (args.length > 1 && /^\d+$/.test(args[args.length - 1])) {
        count = Math.min(Math.max(parseInt(args.pop(), 10), 1), 5);
    }
    const query = args.join(" ").trim();

    if (!query) {
        return await sock.sendMessage(chatId, {
            text: `❌ *Usage:* \`.img <search> [1-5]\`\n💡 *Example:* \`.img sunset beach 3\``
        }, { quoted: m });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "🔎", key: m.key } });

        const { data: html } = await axios.get("https://www.bing.com/images/search", {
            params: { q: query, first: 1, safeSearch: "Moderate" },
            timeout: 20000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        const urls = [];
        const re = /murl&quot;:&quot;(https?:[^&]+?)&quot;/g;
        let match;
        while ((match = re.exec(html)) !== null) {
            const u = match[1];
            if (/\.(jpe?g|png|webp)(\?|$)/i.test(u) && !urls.includes(u)) urls.push(u);
            if (urls.length >= 15) break;
        }

        if (!urls.length) throw new Error("No images found.");

        let sent = 0;
        for (const u of urls) {
            if (sent >= count) break;
            try {
                const res = await axios.get(u, {
                    responseType: "arraybuffer",
                    timeout: 12000,
                    maxContentLength: 8 * 1024 * 1024,
                    headers: { "User-Agent": "Mozilla/5.0" }
                });
                await sock.sendMessage(chatId, {
                    image: Buffer.from(res.data),
                    caption: sent === 0 ? `🖼️ *${query}*` : ""
                }, { quoted: m });
                sent++;
            } catch {
                // try the next link
            }
        }

        if (!sent) throw new Error("Could not download any image.");
        await sock.sendMessage(chatId, { react: { text: "✅", key: m.key } });
    } catch (err) {
        console.error("Img Error:", err.message);
        await sock.sendMessage(chatId, { react: { text: "❌", key: m.key } });
        await sock.sendMessage(chatId, {
            text: `❌ *Image search failed:* ${err.message}`
        }, { quoted: m });
    }
};
