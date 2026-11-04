// Owner only: the bot leaves the current group
const settings = require("../settings");

module.exports = async (sock, m) => {
    const chatId = m.key.remoteJid;
    const sender = m.key.participant || chatId;

    const owners = [settings.ownerNumber, ...(settings.sudoNumbers || [])]
        .map((n) => String(n).replace(/[^0-9]/g, ""));
    const isOwner = m.key.fromMe || owners.some((n) => sender.includes(n));

    if (!isOwner) {
        return await sock.sendMessage(chatId, {
            text: "❌ *Access Denied:* Only the Bot Owner can use this command."
        }, { quoted: m });
    }

    if (!chatId.endsWith("@g.us")) {
        return await sock.sendMessage(chatId, {
            text: "❌ This command works only inside a group."
        }, { quoted: m });
    }

    try {
        await sock.sendMessage(chatId, { text: "👋 *Goodbye everyone!* Leaving the group..." }, { quoted: m });
        await new Promise((r) => setTimeout(r, 1500));
        await sock.groupLeave(chatId);
    } catch (err) {
        console.error("Leave Error:", err);
        await sock.sendMessage(chatId, { text: "⚠️ *Error:* I could not leave the group." }, { quoted: m });
    }
};
