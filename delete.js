// Reply to a message with .delete (works in private chats and groups)
module.exports = async (sock, m) => {
    const chatId = m.key.remoteJid;
    const ctx = m.message?.extendedTextMessage?.contextInfo;

    if (!ctx || !ctx.stanzaId) {
        return await sock.sendMessage(chatId, {
            text: "❓ *Reply to the message you want me to delete.*"
        }, { quoted: m });
    }

    try {
        const botNum = (sock.user?.id || "").split(":")[0].split("@")[0];
        const author = ctx.participant || "";
        const fromBot = !!botNum && author.includes(botNum);

        const targetKey = {
            remoteJid: chatId,
            fromMe: fromBot,
            id: ctx.stanzaId
        };
        if (chatId.endsWith("@g.us")) targetKey.participant = author;

        await sock.sendMessage(chatId, { delete: targetKey });
        await sock.sendMessage(chatId, { delete: m.key }).catch(() => {});
    } catch (err) {
        console.error("Delete Error:", err);
        await sock.sendMessage(chatId, {
            text: `╭━━━〔 *DELETE ERROR* 〕━━━⬣\n┃ ⚠️ Failed to delete the message.\n┃ In groups, I must be *admin*\n┃ to delete other people's messages.\n╰━━━━━━━━━━━━━━━━━━━━⬣`
        }, { quoted: m });
    }
};
