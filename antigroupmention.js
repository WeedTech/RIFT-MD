// .antigroupmention on | kick | off   (owner or group admins)
// Needs the small block from antigroupmention_index_patch.txt inside index.js
const fs = require("fs");
const path = require("path");
const settings = require("../settings");

const dbPath = path.join(__dirname, "..", "database.json");

function readDb() {
    try { return JSON.parse(fs.readFileSync(dbPath, "utf8")); } catch { return {}; }
}

module.exports = async (sock, m, args) => {
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

        const db = readDb();
        if (typeof db.antigroupmention !== "object" || Array.isArray(db.antigroupmention) || !db.antigroupmention) {
            db.antigroupmention = {};
        }

        const opt = (args[0] || "").toLowerCase();

        if (opt === "on" || opt === "kick") {
            db.antigroupmention[chatId] = opt === "kick" ? "kick" : "delete";
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            return await sock.sendMessage(chatId, {
                text: opt === "kick"
                    ? "🛡️ *AntiGroupMention:* ON ✅\n➡️ Mention messages are deleted and the sender is *removed*."
                    : "🛡️ *AntiGroupMention:* ON ✅\n➡️ Mention messages are *deleted* with a warning."
            }, { quoted: m });
        }

        if (opt === "off") {
            delete db.antigroupmention[chatId];
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            return await sock.sendMessage(chatId, { text: "🛡️ *AntiGroupMention:* OFF ❌" }, { quoted: m });
        }

        const status = db.antigroupmention[chatId] || "off";
        await sock.sendMessage(chatId, {
            text: `❌ *Usage:* \`.antigroupmention on | kick | off\`\n📊 *Current:* ${status}`
        }, { quoted: m });
    } catch (err) {
        console.error("AntiGroupMention Error:", err);
        await sock.sendMessage(chatId, { text: "⚠️ *Error while updating the setting.*" }, { quoted: m });
    }
};
