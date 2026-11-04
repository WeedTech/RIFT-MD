// Reply to a sticker:  .take Pack|Author   or   .take Author
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const crypto = require("crypto");
const settings = require("../settings");

function buildExif(pack, author) {
    const json = {
        "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
        "sticker-pack-name": pack,
        "sticker-pack-publisher": author,
        emojis: [""]
    };
    const head = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    const body = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([head, body]);
    exif.writeUIntLE(body.length, 14, 4);
    return exif;
}

function chunk(fourcc, data) {
    const h = Buffer.alloc(8);
    h.write(fourcc, 0, 4, "ascii");
    h.writeUInt32LE(data.length, 4);
    const pad = data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0);
    return Buffer.concat([h, data, pad]);
}

function addExif(webp, pack, author) {
    if (webp.toString("ascii", 0, 4) !== "RIFF" || webp.toString("ascii", 8, 12) !== "WEBP") {
        throw new Error("Not a valid WebP sticker.");
    }

    // Parse chunks
    const chunks = [];
    let off = 12;
    while (off + 8 <= webp.length) {
        const id = webp.toString("ascii", off, off + 4);
        const size = webp.readUInt32LE(off + 4);
        chunks.push({ id, data: webp.subarray(off + 8, off + 8 + size) });
        off += 8 + size + (size % 2);
    }

    const rest = chunks.filter((c) => c.id !== "EXIF");
    let vp8x = rest.find((c) => c.id === "VP8X");
    let flags, w, h;

    if (vp8x) {
        flags = vp8x.data[0];
        w = vp8x.data.readUIntLE(4, 3);
        h = vp8x.data.readUIntLE(7, 3);
    } else {
        const img = rest.find((c) => c.id === "VP8 " || c.id === "VP8L");
        if (!img) throw new Error("Unsupported WebP format.");
        // VP8X stores (width - 1) and (height - 1)
        if (img.id === "VP8 ") {
            w = (img.data.readUInt16LE(6) & 0x3fff) - 1;
            h = (img.data.readUInt16LE(8) & 0x3fff) - 1;
        } else {
            const bits = img.data.readUInt32LE(1); // already width-1 / height-1
            w = bits & 0x3fff;
            h = (bits >> 14) & 0x3fff;
        }
        flags = img.id === "VP8L" ? 0x10 : 0x00; // alpha hint for lossless
    }

    flags |= 0x08; // EXIF present
    const vp8xData = Buffer.alloc(10);
    vp8xData[0] = flags;
    vp8xData.writeUIntLE(w, 4, 3);
    vp8xData.writeUIntLE(h, 7, 3);

    const parts = [chunk("VP8X", vp8xData)];
    for (const c of rest) if (c.id !== "VP8X") parts.push(chunk(c.id, c.data));
    parts.push(chunk("EXIF", buildExif(pack, author)));

    const payload = Buffer.concat(parts);
    const header = Buffer.alloc(12);
    header.write("RIFF", 0, 4, "ascii");
    header.writeUInt32LE(payload.length + 4, 4);
    header.write("WEBP", 8, 4, "ascii");
    return Buffer.concat([header, payload]);
}

module.exports = async (sock, m, args) => {
    const chatId = m.key.remoteJid;
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted?.stickerMessage) {
        return await sock.sendMessage(chatId, {
            text: `❌ *Reply to a sticker!*\n\n💡 \`.take Pack|Author\`\n💡 \`.take MyName\``
        }, { quoted: m });
    }

    try {
        const raw = args.join(" ").trim();
        let pack, author;
        if (raw.includes("|")) {
            [pack, author] = raw.split("|").map((s) => s.trim());
        } else if (raw) {
            pack = raw;
            author = settings.author || "RIFT-MD";
        } else {
            pack = m.pushName || "RIFT-MD";
            author = settings.author || "RIFT-MD";
        }

        const stream = await downloadContentFromMessage(quoted.stickerMessage, "sticker");
        const chunks = [];
        for await (const c of stream) chunks.push(c);
        const webp = Buffer.concat(chunks);

        const result = addExif(webp, pack || "RIFT-MD", author || "RIFT-MD");
        await sock.sendMessage(chatId, { sticker: result }, { quoted: m });
    } catch (err) {
        console.error("Take Error:", err);
        await sock.sendMessage(chatId, {
            text: `❌ *Failed to rename sticker:* ${err.message}`
        }, { quoted: m });
    }
};

module.exports.addExif = addExif;
