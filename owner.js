const settings = require("../settings");

module.exports = async (sock, m) => {
    const chatId = m.key.remoteJid;
    const number = String(settings.ownerNumber).replace(/[^0-9]/g, "");
    const name = settings.ownerName || "Owner";
    const botName = settings.botName || "RIFT-MD";

    const vcard =
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        `FN:${name}\n` +
        `ORG:${botName} Owner;\n` +
        `TEL;type=CELL;type=VOICE;waid=${number}:+${number}\n` +
        "END:VCARD";

    try {
        await sock.sendMessage(chatId, { react: { text: "👑", key: m.key } });

        await sock.sendMessage(chatId, {
            contacts: { displayName: name, contacts: [{ vcard }] }
        }, { quoted: m });

        await sock.sendMessage(chatId, {
            text:
                `╭━━━〔 *${botName} OWNER* 〕━━━⬣\n` +
                `┃ 👤 *Name:* ${name}\n` +
                `┃ 📱 *WhatsApp:* wa.me/${number}\n` +
                `┃ 🤖 *Bot:* ${botName}\n` +
                `╰━━━━━━━━━━━━━━━━━━━━⬣`
        }, { quoted: m });

        await sock.sendMessage(chatId, { react: { text: "✅", key: m.key } });
    } catch (err) {
        console.error("Owner Error:", err);
        await sock.sendMessage(chatId, { text: "❌ *Error:* Could not show the owner contact." }, { quoted: m });
    }
};
