const settings = require("../settings");
const axios = require("axios");

// ─────────────────────────────────────
// MENU IMAGE CACHE
// ─────────────────────────────────────

const imageUrls = [
    "https://url.bmbxmd.workers.dev/XUHD6.jpg"
];

let cachedImage = null;
let imagePromise = null;

function getMenuImage() {
    if (cachedImage) return Promise.resolve(cachedImage);

    if (!imagePromise) {
        imagePromise = (async () => {
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
                    console.error("Menu image download failed:", u, e.message);
                }
            }
            return null;
        })().finally(() => { imagePromise = null; });
    }

    return imagePromise;
}

// Start downloading as soon as the bot starts
getMenuImage();
const fs = require("fs");
const path = require("path");

module.exports = async (sock, m, args) => {
    const pushName =
        m.pushName ||
        m.senderPn ||
        (m.sender ? m.sender.split("@")[0] : "User");

    const chatId = m.key.remoteJid;
    const prefix = settings.prefix || ".";

    function runtime(seconds) {
        seconds = Number(seconds);

        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        return `${d > 0 ? d + "d " : ""}${h > 0 ? h + "h " : ""}${m > 0 ? m + "m " : ""}${s}s`;
    }

    const uptime = runtime(process.uptime());

    // ─────────────────────────────────────
    // LOAD COMMANDS
    // ─────────────────────────────────────

    let commandList = [];

    try {
        const commandsDir = path.join(__dirname, "../commands");

        if (fs.existsSync(commandsDir)) {
            commandList = fs
                .readdirSync(commandsDir)
                .filter(file => file.endsWith(".js"))
                .map(file => file.replace(".js", "").toLowerCase());
        }
    } catch (e) {
        console.error("Error reading commands folder:", e);
    }

    const totalCommands = commandList.length;

    // ─────────────────────────────────────
    // COMMAND CATEGORIES
    // ─────────────────────────────────────

    const categories = {
        "BOT INFO": [
            "alive",
            "ping",
            "menu",
            "owner",
            "runtime",
            "gstatut",
            "jidnewsletter",
            "fb",
            "repo"
        ],

        "TOOLS": [
            "play",
            "igdl",
            "twitter",
            "clear",
            "tourl",
            "video",
            "vv",
            "img",
            "tiktok",
            "fancy",
            "take"
        ],

        "GROUP": [
            "kick",
            "kickall",
            "add",
            "promote",
            "demote",
            "delete",
            "tagall",
            "open",
            "close",
            "link",
            "hidetag",
            "acceptall",
            "rejectall",
            "leave"
        ],

        "SETTINGS": [
            "antilink",
            "setprefix",
            "help",
            "mode",
            "autoreact",
            "autoread",
            "autotyping",
            "antigroupmention"
        ]
    };

    // ─────────────────────────────────────
    // OTHER COMMANDS
    // ─────────────────────────────────────

    const categorizedCommands = new Set(
        Object.values(categories).flat()
    );

    const otherCommands = commandList.filter(
        cmd => !categorizedCommands.has(cmd)
    );

    if (otherCommands.length > 0) {
        categories["OTHER"] = otherCommands;
    }

    // ─────────────────────────────────────
    // BUILD CATEGORY MENU
    // ─────────────────────────────────────

    let menuCategoriesText = "";

    for (const [catName, cmds] of Object.entries(categories)) {

        const activeCmdsInCat = cmds.filter(
            cmd => commandList.includes(cmd)
        );

        if (activeCmdsInCat.length === 0) continue;

        const formattedCmds = activeCmdsInCat
            .map(cmd => `┃ ├─ ⚡ ${prefix}${cmd}`)
            .join("\n");

        menuCategoriesText += `
╭──〔 ${catName} 〕
${formattedCmds}
╰──────────────────────
`;
    }

    // ─────────────────────────────────────
    // SEND MENU
    // ─────────────────────────────────────

    try {

        const menu = `
╭━━〔 TERMINAL ACCESS 〕━━╮
┃
┃ 🤖 RIFT-MD
┃ ├─ USER    : ${pushName}
┃ ├─ OWNER   : WEED TECH
┃ ├─ COMMAND : ${totalCommands}
┃ ├─ UPTIME  : ${uptime}
┃ ├─ PREFIX  : ${prefix}
┃ ├─ MODE    : PUBLIC
┃ └─ VERSION : 2.0.0
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

${menuCategoriesText}

> system.powered_by = "WEED TECH"
`.trim();

        // ─────────────────────────────────
        // NEWSLETTER CONTEXT
        // ─────────────────────────────────

        const channelInfo = {
            contextInfo: {
                mentionedJid: [
                    m.key.participant || m.key.remoteJid
                ].filter(Boolean),

                forwardingScore: 999,

                isForwarded: true,

                forwardedNewsletterMessageInfo: {
                    newsletterJid:
                        "120363407561123100@newsletter",

                    newsletterName:
                        "RIFT-MD OFFICIAL",

                    serverMessageId: -1
                }
            }
        };

        // ─────────────────────────────────
        // SEND IMAGE + MENU
        // ─────────────────────────────────

        // Picture is downloaded once (at startup) and cached, so the menu is instant
        const imageBuffer = await getMenuImage();

        let sentWithImage = false;

        if (imageBuffer) {
            try {
                await sock.sendMessage(
                    chatId,
                    {
                        image: imageBuffer,
                        caption: menu,
                        ...channelInfo
                    },
                    {
                        quoted: m
                    }
                );
                sentWithImage = true;
            } catch (imgErr) {
                console.error("Menu image send failed:", imgErr.message);
            }
        }

        // Fallback: text only
        if (!sentWithImage) {
            await sock.sendMessage(
                chatId,
                { text: menu },
                { quoted: m }
            );
        }

    } catch (e) {
        console.error("Menu Error:", e);
    }
};
