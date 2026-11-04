// Reject every pending join request of the group
const settings = require("../settings");

module.exports = async (sock, m) => {
    const chatId = m.key.remoteJid;
    const sender = m.key.participant || chatId;

    if (!chatId.endsWith("@g.us")) {
        return await sock.sendMessage(chatId, { text: "❌ This command works only in groups." }, { quoted: m });
    }

    try {
        const meta = await sock.groupMetadata(chatId);
        const admins = meta.participants.filter((p) => p.admin).map((p) => p.id);
        const owners = [settings.ownerNumber, ...(settings.sudoNumbers || [])]
            .map((n) => String(n).replace(/[^0-9]/g, ""));
        const isOwner = m.key.fromMe || owners.some((n) => sender.includes(n));

        if (!isOwner && !admins.includes(sender)) {
            return await sock.sendMessage(chatId, {
                text: "🚫 *Access Denied:* Only admins or the owner can use this command."
            }, { quoted: m });
        }

        const pending = await sock.groupRequestParticipantsList(chatId);
        if (!pending || !pending.length) {
            return await sock.sendMessage(chatId, { text: "ℹ️ No pending join requests." }, { quoted: m });
        }

        const jids = pending.map((p) => p.jid || p.id || p.phone_number).filter(Boolean);
        await sock.groupRequestParticipantsUpdate(chatId, jids, "reject");

        await sock.sendMessage(chatId, {
            text: `❌ *${jids.length}* join request(s) rejected.`
        }, { quoted: m });
    } catch (err) {
        console.error("RejectAll Error:", err);
        await sock.sendMessage(chatId, {
            text: "⚠️ *Error:* Make sure I am a group admin."
        }, { quoted: m });
    }
};
