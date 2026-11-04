const axios = require("axios");

// Picture link (downloaded once, then cached)
const imageUrls = [
    "https://url.bmbxmd.workers.dev/XUHD6.jpg"
];

let cachedImage = null;

async function getImage() {
    if (cachedImage) return cachedImage;

    for (const u of imageUrls) {
        try {
            const res = await axios.get(u, {
                responseType: "arraybuffer",
                timeout: 15000,
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            cachedImage = Buffer.from(res.data);
            return cachedImage;
        } catch (e) {
            console.error("Repo image download failed:", u, e.message);
        }
    }
    return null;
}

module.exports = async (sock, m, args) => {
    const chatId = m.key.remoteJid;

    const repoText = `╭━━━〔 🤖 *RIFT-MD REPOSITORY* 〕━━━⬣\n┃ 🤖 *Bot Name:* RIFT-MD\n┃ 👑 *Owner:* WeedDev\n┃ 📦 *GitHub:* https://github.com/WeedTech/RIFT-MD\n╰━━━━━━━━━━━━━━━━━━━━⬣`;

    const channelInfo = {
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363407561123100@newsletter',
                newsletterName: 'RIFT-MD',
                serverMessageId: -1
            }
        }
    };

    const image = await getImage();

    if (image) {
        try {
            return await sock.sendMessage(chatId, {
                image,
                caption: repoText,
                ...channelInfo
            }, { quoted: m });
        } catch (e) {
            console.error("Repo image send failed:", e.message);
        }
    }

    // Fallback: text only (never fails because of the picture)
    await sock.sendMessage(chatId, { text: repoText, ...channelInfo }, { quoted: m });
};
