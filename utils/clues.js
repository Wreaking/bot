// Collection of treasure hunt clues with varying difficulty
const clues = {
    easy: [
        {
            text: "I am tall when I am young, and short when I am old. What am I?",
            answer: "candle",
            hint: "I give you light",
            reward: 100
        },
        {
            text: "What has keys, but no locks; space, but no room; and you can enter, but not go in?",
            answer: "keyboard",
            hint: "You use me to type",
            reward: 100
        },
        {
            text: "The more you take, the more you leave behind. What am I?",
            answer: "footsteps",
            hint: "Think about walking",
            reward: 100
        }
    ],
    medium: [
        {
            text: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. I have roads, but no cars. What am I?",
            answer: "map",
            hint: "I help you navigate",
            reward: 200
        },
        {
            text: "What can travel around the world while staying in a corner?",
            answer: "stamp",
            hint: "I help letters reach their destination",
            reward: 200
        },
        {
            text: "What has a head and a tail but no body?",
            answer: "coin",
            hint: "I jingle in your pocket",
            reward: 200
        }
    ],
    hard: [
        {
            text: "We hurt without moving. We poison without touching. We bear the truth and the lies. We are not to be judged by our size. What are we?",
            answer: "words",
            hint: "You use us to communicate",
            reward: 300
        },
        {
            text: "I turn once, what is out will not get in. I turn again, what is in will not get out. What am I?",
            answer: "key",
            hint: "I am metal and provide security",
            reward: 300
        },
        {
            text: "The person who makes it, sells it. The person who buys it never uses it. The person who uses it doesn't know they are. What is it?",
            answer: "coffin",
            hint: "Think about final resting places",
            reward: 300
        }
    ]
};

function getRandomClue(difficulty = 'medium') {
    const difficultyClues = clues[difficulty] || clues.medium;
    return difficultyClues[Math.floor(Math.random() * difficultyClues.length)];
}

function generateHunt(difficulty = 'medium', numClues = 3) {
    const hunt = [];
    const availableClues = [...clues[difficulty]];

    for (let i = 0; i < numClues && availableClues.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableClues.length);
        hunt.push(availableClues.splice(randomIndex, 1)[0]);
    }

    return hunt;
}

function getDifficultyMultiplier(difficulty) {
    const multipliers = {
        easy: 1,
        medium: 1.5,
        hard: 2
    };
    return multipliers[difficulty] || 1;
}

module.exports = {
    clues,
    getRandomClue,
    generateHunt,
    getDifficultyMultiplier
};
