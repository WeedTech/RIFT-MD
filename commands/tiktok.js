const axios = require("axios");

module.exports = async (sock, m, args) => {
    const chatId = m.key.remoteJid;
    const url = (args[0] || "").trim();

    if (!/tiktok\.com/i.test(url)) {
        return await sock.sendMessage(chatId, {
            text: `❌ *Usage:* \`.tiktok <link>\`\n💡 *Example:* \`.tiktok https://vm.tiktok.com/xxxx\``
        }, { quoted: m });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "⏳", key: m.key } });

        const { data } = await axios.get("https://www.tikwm.com/api/", {
            params: { url, hd: 1 },
            timeout: 30000,
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        if (!data || data.code !== 0 || !data.data) {
            throw new Error("Video not found or link is private.");
        }

        const v = data.data;
        const caption =
            `╭━━━〔 🎵 *TIKTOK* 〕━━━⬣\n` +
            `┃ 👤 *Author:* ${v.author?.nickname || "Unknown"}\n` +
            `┃ ❤️ *Likes:* ${v.digg_count ?? 0}\n` +
            `┃ 📝 ${(v.title || "").slice(0, 120)}\n` +
            `╰━━━━━━━━━━━━━━━━━━━━⬣`;

        // Slideshow (photos)
        if (Array.isArray(v.images) && v.images.length) {
            for (const img of v.images.slice(0, 10)) {
                await sock.sendMessage(chatId, { image: { url: img } }, { quoted: m });
            }
            await sock.sendMessage(chatId, { text: caption }, { quoted: m });
        } else {
            const videoUrl = v.hdplay || v.play;
            if (!videoUrl) throw new Error("No video URL returned.");
            await sock.sendMessage(chatId, {
                video: { url: videoUrl },
                caption,
                mimetype: "video/mp4"
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: m.key } });
    } catch (err) {
        console.error("TikTok Error:", err.message);
        await sock.sendMessage(chatId, { react: { text: "❌", key: m.key } });
        await sock.sendMessage(chatId, {
            text: `❌ *TikTok download failed:* ${err.message}`
        }, { quoted: m });
    }
};
