const { QuickDB } = require('quick.db');
const db = new QuickDB();

// User data functions
async function getUser(userId) {
    const users = await db.get('users') || {};
    return users[userId];
}

async function setUser(userId, userData) {
    const users = await db.get('users') || {};
    users[userId] = userData;
    return await db.set('users', users);
}

// Hunt data functions
async function getHunt(userId) {
    const hunts = await db.get('hunts') || {};
    return hunts[userId];
}

async function setHunt(userId, huntData) {
    const hunts = await db.get('hunts') || {};
    hunts[userId] = huntData;
    return await db.set('hunts', hunts);
}

async function deleteHunt(userId) {
    const hunts = await db.get('hunts') || {};
    delete hunts[userId];
    return await db.set('hunts', hunts);
}

// Clue data functions
async function getClues(userId) {
    const clues = await db.get('clues') || {};
    return clues[userId];
}

async function setClues(userId, cluesData) {
    const clues = await db.get('clues') || {};
    clues[userId] = cluesData;
    return await db.set('clues', clues);
}

async function deleteClues(userId) {
    const clues = await db.get('clues') || {};
    delete clues[userId];
    return await db.set('clues', clues);
}

module.exports = {
    getUser,
    setUser,
    getHunt,
    setHunt,
    deleteHunt,
    getClues,
    setClues,
    deleteClues
};
