const settings = require("../settings");
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
            "image"
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
            "hidetag"
        ],

        "SETTINGS": [
            "antilink",
            "setprefix",
            "help",
            "mode",
            "autoreact",
            "autoread",
            "autotyping"
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

        await sock.sendMessage(
            chatId,
            {
                text: "⚡ Loading menu..."
            },
            {
                quoted: m
            }
        );

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
                    m.sender || m.key.participant
                ],

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

        await sock.sendMessage(
            chatId,
            {
                image: {
                    url: "https://files.catbox.moe/vv674d.jpg"
                },

                caption: menu,

                ...channelInfo
            },
            {
                quoted: m
            }
        );

    } catch (e) {
        console.error("Menu Error:", e);
    }
};
