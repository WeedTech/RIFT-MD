const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const settings = require("../settings");

console.log("[groupstatus loaded] posts the status in the current group only");

async function downloadMedia(message, type) {
    let stream = await downloadContentFromMessage(message, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

module.exports = async (sock, m, args) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    
    // Check if the user executing the command is the Owner
    const isOwner = sender.includes(settings.ownerNumber.replace(/[^0-9]/g, '')) || m.key.fromMe;
    if (!isOwner) return sock.sendMessage(from, { text: "❌ This command is for the bot owner only." }, { quoted: m });

    const quotedMessage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const textFromArgs = args ? args.join(' ') : '';
    const textFromQuote = quotedMessage?.conversation || 
                          quotedMessage?.extendedTextMessage?.text || 
                          quotedMessage?.imageMessage?.caption || 
                          quotedMessage?.videoMessage?.caption || '';
    
    let teks = textFromArgs || textFromQuote;
    let media = null;
    let type = null;

    if (quotedMessage) {
        if (quotedMessage.imageMessage) {
            type = "image";
            media = await downloadMedia(quotedMessage.imageMessage, "image");
        } else if (quotedMessage.videoMessage) {
            type = "video";
            media = await downloadMedia(quotedMessage.videoMessage, "video");
        } else if (quotedMessage.audioMessage) {
            type = "audio";
            media = await downloadMedia(quotedMessage.audioMessage, "audio");
        }
    }

    if (!media && !teks) {
        return sock.sendMessage(from, { text: "❌ Please provide a message or reply to a media.\nExample: .groupstatus Hello everyone!\n\n✅ groupstatus — posts in THIS group only." }, { quoted: m });
    }

    // Only works inside a group: the status is posted in THIS group only
    if (!from.endsWith('@g.us')) {
        return sock.sendMessage(from, { text: "❌ Use this command inside the group where you want to post the status." }, { quoted: m });
    }

    try {
        const groupMetadata = await sock.groupMetadata(from);
        const peserta = groupMetadata.participants.map(v => v.id);

        if (!media) {
            await sock.sendMessage(from, {
                text: teks,
                contextInfo: { mentionedJid: peserta, isGroupStatus: true }
            }, { backgroundColor: "#7c3aed", statusJidList: peserta });
        } else if (type === "image") {
            await sock.sendMessage(from, {
                image: media,
                caption: teks,
                contextInfo: { mentionedJid: peserta, isGroupStatus: true }
            }, { statusJidList: peserta });
        } else if (type === "video") {
            await sock.sendMessage(from, {
                video: media,
                caption: teks,
                contextInfo: { mentionedJid: peserta, isGroupStatus: true }
            }, { statusJidList: peserta });
        } else if (type === "audio") {
            await sock.sendMessage(from, {
                audio: media,
                mimetype: "audio/mp4",
                ptt: false,
                contextInfo: { mentionedJid: peserta, isGroupStatus: true }
            }, { statusJidList: peserta });
        }

        await sock.sendMessage(from, { text: "✅ Status posted in this group!" }, { quoted: m });

    } catch (e) {
        console.error(e);
        await sock.sendMessage(from, { text: "❌ An error occurred." }, { quoted: m });
    }
};
