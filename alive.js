const axios = require("axios");

// Picture link (downloaded once, then cached)
const imageUrls = [
    "https://url.bmbxmd.workers.dev/XUHD6.jpg"
];

// Voice note link (put "" to disable the voice note)
const AUDIO_URL = "https://files.catbox.moe/pframr.mp3";

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
            console.error("Alive image download failed:", u, e.message);
        }
    }
    return null;
}

module.exports = async (sock, m) => {
    try {
        const { remoteJid } = m.key;

        const aliveTemplate = `╭━━━〔 *RIFT-MD* 〕━━━⬣\n┃ 🛰️ *Status:* \`Online & Stable\`\n┃ ⚙️ *Version:* \`2.0.0\`\n┃ 💎 *Platform:* \`Pterodactyl / Cloud\`\n╰━━━━━━━━━━━━━━━━━━━━⬣\n\n> *Rift Md is fully operational and ready to serve.* 💜`.trim();

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363407561123100@newsletter",
                newsletterName: "RIFT-MD OFFICIAL",
                serverMessageId: 100
            }
        };

        // 1) Image + text (falls back to text only if the picture fails)
        const image = await getImage();
        let sent = false;

        if (image) {
            try {
                await sock.sendMessage(remoteJid, {
                    image,
                    caption: aliveTemplate,
                    contextInfo
                }, { quoted: m });
                sent = true;
            } catch (e) {
                console.error("Alive image send failed:", e.message);
            }
        }

        if (!sent) {
            await sock.sendMessage(remoteJid, {
                text: aliveTemplate,
                contextInfo
            }, { quoted: m });
        }

        // 2) Voice note (never blocks the command if the link is down)
        if (AUDIO_URL) {
            try {
                await sock.sendMessage(remoteJid, {
                    audio: { url: AUDIO_URL },
                    mimetype: "audio/mp4",
                    ptt: true
                }, { quoted: m });
            } catch (e) {
                console.error("Alive voice note failed:", e.message);
            }
        }

    } catch (error) {
        console.error("Error in alive command:", error);
    }
};
