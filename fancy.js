// .fancy            -> list of styles
// .fancy 3 hello    -> style number 3
// .fancy hello      -> all styles (or reply to a text message)

const U = (cp) => String.fromCodePoint(cp);

function build(upper, lower, digit, ex = {}) {
    return (text) => [...text].map((ch) => {
        if (ex[ch]) return ex[ch];
        const c = ch.charCodeAt(0);
        if (c >= 65 && c <= 90 && upper !== null) return U(upper + c - 65);
        if (c >= 97 && c <= 122 && lower !== null) return U(lower + c - 97);
        if (c >= 48 && c <= 57 && digit !== null) return U(digit + c - 48);
        return ch;
    }).join("");
}

const smallCapsMap = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ",
    k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ",
    u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ"
};

const styles = [
    ["Bold", build(0x1D400, 0x1D41A, 0x1D7CE)],
    ["Italic", build(0x1D434, 0x1D44E, null, { h: "ℎ" })],
    ["Bold Italic", build(0x1D468, 0x1D482, null)],
    ["Script", build(0x1D49C, 0x1D4B6, null, { B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ", e: "ℯ", g: "ℊ", o: "ℴ" })],
    ["Bold Script", build(0x1D4D0, 0x1D4EA, null)],
    ["Fraktur", build(0x1D504, 0x1D51E, null, { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" })],
    ["Bold Fraktur", build(0x1D56C, 0x1D586, null)],
    ["Double Struck", build(0x1D538, 0x1D552, 0x1D7D8, { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" })],
    ["Sans", build(0x1D5A0, 0x1D5BA, 0x1D7E2)],
    ["Sans Bold", build(0x1D5D4, 0x1D5EE, 0x1D7EC)],
    ["Sans Italic", build(0x1D608, 0x1D622, null)],
    ["Sans Bold Italic", build(0x1D63C, 0x1D656, null)],
    ["Monospace", build(0x1D670, 0x1D68A, 0x1D7F6)],
    ["Fullwidth", build(0xFF21, 0xFF41, 0xFF10)],
    ["Circled", build(0x24B6, 0x24D0, null, { 0: "⓪", 1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤", 6: "⑥", 7: "⑦", 8: "⑧", 9: "⑨" })],
    ["Black Squares", build(0x1F170, 0x1F170, null)],
    ["Small Caps", (t) => [...t].map((c) => smallCapsMap[c.toLowerCase()] || c).join("")]
];

module.exports = async (sock, m, args) => {
    const chatId = m.key.remoteJid;
    const ctx = m.message?.extendedTextMessage?.contextInfo;
    const quotedText =
        ctx?.quotedMessage?.conversation ||
        ctx?.quotedMessage?.extendedTextMessage?.text || "";

    let list = [...args];
    let styleNum = null;
    if (list.length && /^\d+$/.test(list[0])) styleNum = parseInt(list.shift(), 10);

    const text = list.join(" ").trim() || quotedText.trim();

    if (!text) {
        const demo = styles.map(([name, fn], i) => `${i + 1}. ${fn("Hello")}  _${name}_`).join("\n");
        return await sock.sendMessage(chatId, {
            text: `╭━━━〔 ✨ *FANCY TEXT* 〕━━━⬣\n┃ 📌 \`.fancy <text>\` → all styles\n┃ 📌 \`.fancy <number> <text>\` → one style\n╰━━━━━━━━━━━━━━━━━━━━⬣\n\n${demo}`
        }, { quoted: m });
    }

    if (styleNum !== null) {
        if (styleNum < 1 || styleNum > styles.length) {
            return await sock.sendMessage(chatId, {
                text: `❌ Choose a style between 1 and ${styles.length}.`
            }, { quoted: m });
        }
        return await sock.sendMessage(chatId, { text: styles[styleNum - 1][1](text) }, { quoted: m });
    }

    const out = styles.map(([name, fn], i) => `*${i + 1}.* ${fn(text)}`).join("\n\n");
    await sock.sendMessage(chatId, { text: `✨ *FANCY TEXT*\n\n${out}` }, { quoted: m });
};
