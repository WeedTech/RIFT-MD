const axios = require("axios");
const yts = require("yt-search");
const settings = require("../settings");

const axiosConfig = {
    timeout: 60000,
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*"
    }
};

async function request(url) {
    return await axios.get(url, axiosConfig);
}

// ===============================
// ELITE PRO TECH
// ===============================
async function eliteProTech(url) {
    const api =
        `https://eliteprotech-apis.zone.id/ytdown?url=` +
        encodeURIComponent(url) +
        `&format=mp3`;

    const response = await request(api);
    const data = response.data || {};

    if (data.success && data.downloadURL) {
        return { url: data.downloadURL, title: data.title || "" };
    }

    throw new Error("EliteProTech failed");
}

// ===============================
// YUPRA
// ===============================
async function yupra(url) {
    const api =
        `https://api.yupra.my.id/api/downloader/ytmp3?url=` +
        encodeURIComponent(url);

    const response = await request(api);
    const data = response.data || {};

    if (data.success && data.data && data.data.download_url) {
        return {
            url: data.data.download_url,
            title: data.data.title || "",
            thumbnail: data.data.thumbnail || ""
        };
    }

    throw new Error("Yupra failed");
}

// ===============================
// OKATSU
// ===============================
async function okatsu(url) {
    const api =
        `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=` +
        encodeURIComponent(url);

    const response = await request(api);
    const result = response.data?.result || {};

    if (result.mp3) {
        return { url: result.mp3, title: result.title || "" };
    }

    throw new Error("Okatsu failed");
}

// ===============================
// APIs FROM WEED-X-MINIBOT
// ===============================

// KNIGHT
async function knight(url) {
    const { data } = await axios.get("https://knightbotapi.stream/api/download", {
        ...axiosConfig,
        params: { apikey: "knight", type: "mp3", url },
        timeout: 120000
    });

    const r = data?.result ?? data?.data ?? data;
    const link =
        (typeof r === "string" ? r : null) ||
        r?.downloadUrl || r?.download_url || r?.download || r?.url || r?.link || r?.audio ||
        data?.downloadUrl || data?.download || data?.url;

    if (typeof link === "string" && link.startsWith("http")) {
        return { url: link, title: r?.title || data?.title || "" };
    }

    throw new Error("Knight failed");
}

// ELITE (ytmp3 endpoint)
async function eliteYtmp3(url) {
    const { data } = await axios.get("https://eliteprotech-apis.zone.id/download/ytmp3", {
        ...axiosConfig,
        params: { url },
        timeout: 120000
    });

    const d = data?.status && data.download;

    if (d?.downloadUrl) {
        return { url: d.downloadUrl, title: d.title || "" };
    }

    throw new Error("Elite ytmp3 failed");
}

// PRINCE
async function princeYtmp3(url) {
    const { data } = await axios.get(
        `https://api.princetechn.com/api/download/ytmp3?apikey=prince&url=${encodeURIComponent(url)}`,
        axiosConfig
    );

    const r = data?.success && data.result;

    if (r?.downloadUrl) {
        return { url: r.downloadUrl, title: r.title || "" };
    }

    throw new Error("Prince ytmp3 failed");
}

// ===============================
// MAIN COMMAND
// ===============================
module.exports = async (sock, m, args) => {
    const chatId = m.key.remoteJid;

    try {
        const query = args.join(" ").trim();

        if (!query) {
            return await sock.sendMessage(
                chatId,
                {
                    text:
                        `❌ *Please provide a song name or YouTube link!*\n\n` +
                        `💡 Example: \`${settings.prefix}play Bob Marley Is This Love\``
                },
                { quoted: m }
            );
        }

        await sock.sendMessage(chatId, {
            react: { text: "⏳", key: m.key }
        });

        let youtubeUrl;
        let searchTitle = "";
        let thumbnail = "";
        let duration = "N/A";

        if (/^https?:\/\//i.test(query)) {
            youtubeUrl = query;
        } else {
            const search = await yts(query);

            if (!search.videos || search.videos.length === 0) {
                await sock.sendMessage(chatId, {
                    react: { text: "❌", key: m.key }
                });

                return await sock.sendMessage(
                    chatId,
                    {
                        text: "❌ *No songs found for your query!*"
                    },
                    { quoted: m }
                );
            }

            const video = search.videos[0];
            youtubeUrl = video.url || "";
            searchTitle = typeof video.title === "string" ? video.title : (video.title?.toString() || "");
            thumbnail = typeof video.thumbnail === "string" ? video.thumbnail : "";
            duration = video.timestamp || "N/A";
        }

        const servers = [
            { name: "Knight", function: knight },
            { name: "Elite ytmp3", function: eliteYtmp3 },
            { name: "Prince", function: princeYtmp3 },
            { name: "EliteProTech", function: eliteProTech },
            { name: "Yupra", function: yupra },
            { name: "Okatsu", function: okatsu }
        ];

        let audioData = null;

        for (const server of servers) {
            try {
                console.log(`Trying ${server.name}...`);
                const result = await server.function(youtubeUrl);

                if (result && result.url) {
                    audioData = result;
                    console.log(`${server.name} SUCCESS`);
                    break;
                }
            } catch (error) {
                console.log(`${server.name} FAILED:`, error.message);
            }
        }

        if (!audioData) {
            throw new Error("All audio download servers failed");
        }

        const title = audioData.title || searchTitle || "RIFT-MD Audio";
        const thumb = audioData.thumbnail || thumbnail || "";

        const cleanTitle =
            title
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 100) || "RIFT-MD-Audio";

        await sock.sendMessage(
            chatId,
            {
                audio: { url: audioData.url },
                mimetype: "audio/mpeg",
                fileName: `${cleanTitle}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: "RIFT-MD MUSIC",
                        thumbnailUrl: thumb,
                        sourceUrl: youtubeUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            },
            { quoted: m }
        );

        await sock.sendMessage(chatId, {
            react: { text: "✅", key: m.key }
        });

    } catch (error) {
        console.error("PLAY COMMAND ERROR:", error);

        await sock.sendMessage(chatId, {
            react: { text: "❌", key: m.key }
        });

        await sock.sendMessage(
            chatId,
            {
                text:
                    "❌ *Audio download failed!*\n\n" +
                    "⚠️ All audio servers are currently unavailable or timed out."
            },
            { quoted: m }
        );
    }
};
