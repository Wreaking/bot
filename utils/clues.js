// Comprehensive treasure hunt clues database with 100+ riddles
const clues = {
    easy: [
        { text: "I am tall when I am young, and short when I am old. What am I?", answer: "candle", hint: "I give you light", reward: 100 },
        { text: "What has keys, but no locks; space, but no room; and you can enter, but not go in?", answer: "keyboard", hint: "You use me to type", reward: 100 },
        { text: "The more you take, the more you leave behind. What am I?", answer: "footsteps", hint: "Think about walking", reward: 100 },
        { text: "What gets wet while drying?", answer: "towel", hint: "Used after a shower", reward: 100 },
        { text: "What has hands but cannot clap?", answer: "clock", hint: "I tell time", reward: 100 },
        { text: "What goes up but never comes down?", answer: "age", hint: "Happens every year", reward: 100 },
        { text: "What can you catch but not throw?", answer: "cold", hint: "Makes you sneeze", reward: 100 },
        { text: "What has a face but no eyes?", answer: "clock", hint: "Shows numbers", reward: 100 },
        { text: "What has legs but doesn't walk?", answer: "table", hint: "You eat on me", reward: 100 },
        { text: "What has teeth but cannot bite?", answer: "comb", hint: "Used for hair", reward: 100 },
        { text: "What can you break without touching?", answer: "promise", hint: "Keep your word", reward: 100 },
        { text: "What gets bigger the more you take away?", answer: "hole", hint: "Dig deeper", reward: 100 },
        { text: "What has one eye but cannot see?", answer: "needle", hint: "Used for sewing", reward: 100 },
        { text: "What runs but never walks?", answer: "water", hint: "Flows in rivers", reward: 100 },
        { text: "What comes down but never goes up?", answer: "rain", hint: "Falls from clouds", reward: 100 },
        { text: "What has a neck but no head?", answer: "bottle", hint: "Holds liquids", reward: 100 },
        { text: "What goes around the world but stays in a corner?", answer: "stamp", hint: "On mail", reward: 100 },
        { text: "What has words but never speaks?", answer: "book", hint: "You read me", reward: 100 },
        { text: "What has four wheels and flies?", answer: "garbage truck", hint: "Picks up trash", reward: 100 },
        { text: "What is always in front of you but can't be seen?", answer: "future", hint: "What's coming next", reward: 100 },
        { text: "What goes up when rain comes down?", answer: "umbrella", hint: "Keeps you dry", reward: 100 },
        { text: "What has cities but no houses?", answer: "map", hint: "Shows locations", reward: 100 },
        { text: "What can fill a room but takes up no space?", answer: "light", hint: "Opposite of dark", reward: 100 },
        { text: "What is full of holes but still holds water?", answer: "sponge", hint: "Used for cleaning", reward: 100 },
        { text: "What begins with T, ends with T, and has T in it?", answer: "teapot", hint: "Used for brewing", reward: 100 },
        { text: "What comes once in a minute, twice in a moment, but never in a thousand years?", answer: "m", hint: "It's a letter", reward: 100 },
        { text: "What has a thumb and four fingers but is not alive?", answer: "glove", hint: "Keeps hands warm", reward: 100 },
        { text: "What gets sharper the more you use it?", answer: "brain", hint: "Think with me", reward: 100 },
        { text: "What has a bed but never sleeps?", answer: "river", hint: "Water flows here", reward: 100 },
        { text: "What has bark but no bite?", answer: "tree", hint: "Grows in forests", reward: 100 }
    ],
    medium: [
        { text: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", answer: "map", hint: "I help you navigate", reward: 250 },
        { text: "What can travel around the world while staying in a corner?", answer: "stamp", hint: "I help letters reach their destination", reward: 250 },
        { text: "What has a head and a tail but no body?", answer: "coin", hint: "I jingle in your pocket", reward: 250 },
        { text: "I am not a season, but I can be fallen into. I am not a container, but I can be deep. What am I?", answer: "trouble", hint: "You don't want to be in me", reward: 250 },
        { text: "What can you hold in your right hand but not in your left?", answer: "left hand", hint: "Body part", reward: 250 },
        { text: "What gets wetter the more it dries?", answer: "towel", hint: "Absorbs water", reward: 250 },
        { text: "What invention lets you look right through a wall?", answer: "window", hint: "Made of glass", reward: 250 },
        { text: "What disappears as soon as you say its name?", answer: "silence", hint: "The absence of sound", reward: 250 },
        { text: "What is so fragile that saying its name breaks it?", answer: "silence", hint: "Complete quiet", reward: 250 },
        { text: "The more of this there is, the less you see. What is it?", answer: "darkness", hint: "Opposite of light", reward: 250 },
        { text: "What has many needles but doesn't sew?", answer: "pine tree", hint: "Evergreen plant", reward: 250 },
        { text: "What has a golden head and a golden tail but no golden body?", answer: "penny", hint: "Worth one cent", reward: 250 },
        { text: "What can you keep after giving it to someone?", answer: "word", hint: "Your promise", reward: 250 },
        { text: "What belongs to you but others use it more than you?", answer: "name", hint: "What you're called", reward: 250 },
        { text: "What has 88 keys but can't open a door?", answer: "piano", hint: "Musical instrument", reward: 250 },
        { text: "What is always coming but never arrives?", answer: "tomorrow", hint: "The next day", reward: 250 },
        { text: "What can be cracked, made, told, and played?", answer: "joke", hint: "Makes people laugh", reward: 250 },
        { text: "What has a heart that doesn't beat?", answer: "artichoke", hint: "A vegetable", reward: 250 },
        { text: "What can be stolen, mistaken, or planned?", answer: "identity", hint: "Who you are", reward: 250 },
        { text: "What gets bigger when more is taken away from it?", answer: "hole", hint: "Dig it deeper", reward: 250 },
        { text: "What has a foot but no leg?", answer: "snail", hint: "Slow moving creature", reward: 250 },
        { text: "What can you serve but never eat?", answer: "tennis ball", hint: "Sports equipment", reward: 250 },
        { text: "What has a ring but no finger?", answer: "telephone", hint: "Makes a sound", reward: 250 },
        { text: "What has branches but no fruit, trunk, or leaves?", answer: "bank", hint: "Where you save money", reward: 250 },
        { text: "What can go up a chimney down but can't go down a chimney up?", answer: "umbrella", hint: "Rain protection", reward: 250 }
    ],
    hard: [
        { text: "We hurt without moving. We poison without touching. We bear truth and lies. We are not judged by size. What are we?", answer: "words", hint: "You use us to communicate", reward: 500 },
        { text: "I turn once, what is out will not get in. I turn again, what is in will not get out. What am I?", answer: "key", hint: "I am metal and provide security", reward: 500 },
        { text: "The person who makes it, sells it. The person who buys it never uses it. The person who uses it doesn't know they are. What is it?", answer: "coffin", hint: "Think about final resting places", reward: 500 },
        { text: "I have a golden crown but I'm not a king. I help guide travelers but I have no wings. What am I?", answer: "lighthouse", hint: "I shine bright by the sea", reward: 500 },
        { text: "I am the beginning of eternity, the end of time and space, the beginning of every end, and the end of every place. What am I?", answer: "e", hint: "I'm a letter", reward: 500 },
        { text: "What comes first in most dictionaries but last in life?", answer: "death", hint: "Final destination", reward: 500 },
        { text: "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?", answer: "echo", hint: "Sound reflection", reward: 500 },
        { text: "What walks on four legs in morning, two legs in afternoon, and three legs in evening?", answer: "human", hint: "Life stages", reward: 500 },
        { text: "I am always hungry and will die if not fed, but whatever I touch will soon turn red. What am I?", answer: "fire", hint: "Hot and dangerous", reward: 500 },
        { text: "First I am dried, then I am wet. The longer I swim, the more taste you get. What am I?", answer: "tea", hint: "Hot beverage", reward: 500 },
        { text: "I have seas without water, coasts without sand, towns without people, mountains without land. What am I?", answer: "map", hint: "Shows geography", reward: 500 },
        { text: "What has four fingers and a thumb but is not living?", answer: "glove", hint: "Hand protection", reward: 500 },
        { text: "I am taken from a mine and shut up in a wooden case, from which I am never released, yet I am used by almost everyone. What am I?", answer: "pencil", hint: "Writing tool", reward: 500 },
        { text: "What is seen in the middle of March and April that can't be seen at the beginning or end of either month?", answer: "r", hint: "It's a letter", reward: 500 },
        { text: "What is it that no one wants to have but no one wants to lose?", answer: "lawsuit", hint: "Legal trouble", reward: 500 },
        { text: "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?", answer: "fire", hint: "Burns bright", reward: 500 },
        { text: "What goes through cities and fields, but never moves?", answer: "road", hint: "Cars drive on me", reward: 500 },
        { text: "I am the only thing that always tells the truth. I show off everything that I see. I come in all shapes and sizes. What am I?", answer: "mirror", hint: "Reflects image", reward: 500 },
        { text: "What can bring back the dead, make you cry, make you laugh, make you young; is born in an instant yet lasts a lifetime?", answer: "memory", hint: "From the past", reward: 500 },
        { text: "I have keys but no doors. I have space but no rooms. You can enter but you can't go outside. What am I?", answer: "keyboard", hint: "Computer input", reward: 500 }
    ],
    expert: [
        { text: "In marble walls as white as milk, lined with skin as soft as silk, within a fountain crystal clear, a golden apple will appear. No doors are there to this stronghold, yet thieves break in and steal the gold.", answer: "egg", hint: "Chickens lay these", reward: 1000 },
        { text: "This thing all things devours: Birds, beasts, trees, flowers; Gnaws iron, bites steel; Grinds hard stones to meal; Slays king, ruins town, And beats high mountain down.", answer: "time", hint: "Ticks away constantly", reward: 1000 },
        { text: "Voiceless it cries, wingless flutters, toothless bites, mouthless mutters.", answer: "wind", hint: "Invisible force of nature", reward: 1000 },
        { text: "This creature has one voice and yet becomes four-footed and two-footed and three-footed.", answer: "human", hint: "Changes throughout life", reward: 1000 },
        { text: "I am the black child of a white father, a wingless bird, flying even to the clouds of heaven. I give birth to tears of mourning in pupils that meet me, even though there is no cause for grief.", answer: "smoke", hint: "Rises from fire", reward: 1000 },
        { text: "Two bodies have I though both joined in one. The more still I stand, the quicker I run.", answer: "hourglass", hint: "Measures time with sand", reward: 1000 },
        { text: "What can run but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?", answer: "river", hint: "Water flows through me", reward: 1000 },
        { text: "I am not a crown, but I make kings bow. I am not a scale, but I make things weigh. I am not a clock, but I make time fly.", answer: "gravity", hint: "Pulls things down", reward: 1000 },
        { text: "Born in war, raised in peace, never failing to increase. My father's the rain and my mother's the earth, I'm precious to all from the day of my birth.", answer: "harvest", hint: "Crops from farming", reward: 1000 },
        { text: "I am the shadow of a candle flame, dancing on the wall. I am the whisper of a secret name, that echoes through the hall.", answer: "memory", hint: "Recollection of past", reward: 1000 }
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
