const { normalizePhone, hashPhone } = require("../../../common/utils/phone.util");

const AU_CITIES = {
    "Sydney": { lng: 151.2093, lat: -33.8688, state: "NSW" },
    "Melbourne": { lng: 144.9631, lat: -37.8136, state: "VIC" },
    "Brisbane": { lng: 153.0251, lat: -27.4698, state: "QLD" },
    "Perth": { lng: 115.8605, lat: -31.9505, state: "WA" },
    "Adelaide": { lng: 138.6007, lat: -34.9285, state: "SA" },
    "Gold Coast": { lng: 153.4000, lat: -28.0167, state: "QLD" },
    "Canberra": { lng: 149.1300, lat: -35.2809, state: "ACT" },
};

const INTERESTS_POOL = [
    "travel", "cooking", "hiking", "yoga", "gaming", "movies", "photography", "music", "art", "dancing",
    "sports", "gardening", "pets", "painting", "fitness", "reading", "board-games", "technology", "fashion",
    "motorcycling", "science", "history", "nature", "adventure", "foodie", "writing", "poetry", "astronomy",
    "sustainable-living", "film-production", "meditation", "comedy", "volunteering", "diy-projects",
    "art-history", "philosophy", "snowboarding", "wine-tasting", "collectibles", "sailing", "karaoke",
    "surfing", "scuba-diving", "skydiving", "pottery", "wildlife-conservation", "ghost-hunting", "geocaching",
    "stand-up-comedy", "motor-racing", "paranormal-investigation"
];

const LANGUAGES_POOL = ["en", "hi", "bn", "ru", "es", "zh", "ar", "ja"];
const RELIGION_POOL = ["buddhism", "christianity", "hinduism", "islam", "sikhism", "secular"];
const ZODIAC_POOL = ["leo", "cancer", "gemini", "aries", "taurus", "virgo", "pisces", "scorpio", "sagittarius", "libra", "capricorn", "aquarius"];
const PETS_POOL = ["cat", "bird", "dog", "none", "fish", "rabbit", "hamster", "reptile", "exotic", "other"];
const MUSIC_POOL = [
    "pop", "hip-hop", "rock", "electronic", "classical", "jazz", "rnb", "country", "indie", "reggae",
    "blues", "metal", "latin", "k-pop", "punk", "alternative", "folk", "funk", "world", "edm", "rap",
    "soul", "opera", "disco", "ambient", "ska", "gospel", "house", "trance", "techno", "salsa", "flamenco",
    "swing", "acoustic", "synth-pop", "choir", "grunge", "chiptune", "downtempo", "psychedelic", "progressive",
    "experimental", "industrial", "world-fusion", "trip-hop", "j-pop", "new-age"
];
const MOVIES_POOL = [
    "comedy", "horror", "action", "drama", "romance", "sci-fi", "thriller", "animated", "spy", "documentary",
    "musical", "fantasy", "anime", "historical", "war", "mystery", "paranormal", "western", "bollywood",
    "biographical", "courtroom", "space-opera", "epic", "cyberpunk", "urban-fantasy", "martial-arts", "k-drama",
    "silent", "noir", "disaster", "dystopian", "time-travel", "found-footage", "satire", "buddy-cop",
    "fantasy-adventure", "cult-classics", "mockumentary", "slice-of-life", "foreign", "nollywood"
];
const BOOKS_POOL = [
    "fiction", "non-fiction", "mystery", "fantasy", "self-help", "sci-fi", "comics", "science",
    "historical-fiction", "biography", "poetry", "essays", "young-adult", "classic-lit", "crime",
    "philosophy", "humor", "religious", "anthologies", "art-photo", "graphic-novels", "travelogues",
    "true-crime", "autobiography", "memoir", "cookbooks", "alternate-history", "short-stories", "childrens"
];
const TRAVEL_POOL = [
    "beach", "city-breaks", "adventure", "road-trip", "safari", "cultural", "glamping", "nature",
    "relaxing", "road-trips", "food", "backpacking", "cruise", "staycations", "snow-sports", "wine-tours",
    "art-galleries", "historical-sites", "eco-tourism", "music-festivals", "culinary-tours", "yoga-retreats",
    "group-tours", "remote", "island-hopping", "train-journeys", "volunteering", "solo", "spa", "desert", "mountain"
];
const SMOKING_POOL = ["non-smoker", "smoker", "occasional", "quitter", "vape"];
const DRINKING_POOL = ["social", "non-drinker", "occasional", "wine-enthusiast", "craft-beer", "cocktail-connoisseur"];
const EDUCATION_POOL = ["high-school", "bachelors", "masters", "phd", "trade-school", "other"];
const FAMILY_PLANS_POOL = ["want-kids", "dont-want-kids", "not-sure-yet"];
const WORKOUT_POOL = ["everyday", "often", "sometimes", "never"];
const DIETARY_POOL = ["vegetarian", "vegan", "omnivore", "pescatarian", "halal", "gluten-free", "dairy-free", "plant-based", "keto", "raw-food", "kosher", "other"];
const SLEEPING_POOL = ["early-bird", "night-owl", "regular", "insomniac"];
const PERSONALITY_POOL = ["intj", "intp", "entj", "entp", "infj", "infp", "enfj", "enfp", "istj", "isfj", "estj", "esfj", "istp", "isfp", "estp", "esfp"];
const COMMUNICATION_POOL = ["chatty-cathy", "listener", "joker", "deep-thinker", "sarcastic", "easygoing", "straight-shooter", "storyteller"];
const LOVE_STYLE_POOL = ["hopeless-romantic", "adventure-seeker", "best-friend", "independent", "caregiver", "spontaneous", "classic-lover", "analytical"];
const SOCIAL_MEDIA_POOL = ["active-all", "active-some", "minimal", "influencer"];
const RELATIONSHIP_GOALS = ["dating", "friendship", "casual", "serious", "open", "networking", "exploration"];

const BIOS_POOL = [
    "Just a local looking for someone to grab a flat white with.",
    "Love a good weekend hike and a cold one at the pub afterwards.",
    "Beach lover, sun seeker, and occasionally a decent cook.",
    "Looking for a partner in crime for road trips across the coast.",
    "Enjoying the simple things in life. Life is too short to be serious.",
    "New in town, show me your favorite hidden gems!",
    "Usually found either at the beach or thinking about the beach.",
    "Down to earth, easy going, and always up for an adventure."
];

// High-quality photos from Unsplash
const PHOTO_QUALITY_PARAMS = "?q=80&w=1080&auto=format&fit=crop";

const PORTRAIT_MEN = [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
    "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7",
    "https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6",
];

const PORTRAIT_WOMEN = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
    "https://images.unsplash.com/photo-1488426862026-3ee3487514bc",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
    "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7",
];

const LIFESTYLE_PHOTOS = [
    "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57", // Bondi Beach, Sydney
    "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be", // Sydney Opera House
    "https://images.unsplash.com/photo-1502680390469-be75c86b636f", // Surfing in AU
    "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200", // Great Ocean Road, VIC
    "https://images.unsplash.com/photo-1493246507139-91e8bef99c17", // Melbourne City Vibes
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e", // General Beach
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e", // Australian Bush/Forest
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085", // Australian Coffee Culture
    "https://images.unsplash.com/photo-1517649763962-0c623066013b", // Fitness/Outdoors
    "https://images.unsplash.com/photo-1454165833222-38d03541a19f", // Brunch culture
    "https://images.unsplash.com/photo-1526631134603-87979669019b", // Perth/Western Coast
    "https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8", // Australian Road Trip
];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getRandomItems = (arr, count) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const getRandomAttributes = () => ({
    zodiac: getRandom(ZODIAC_POOL),
    religion: getRandom(RELIGION_POOL),
    pets: getRandom(PETS_POOL),
    drinking: getRandom(DRINKING_POOL),
    smoking: getRandom(SMOKING_POOL),
    workout: getRandom(WORKOUT_POOL),
    education: getRandom(EDUCATION_POOL),
    familyPlans: getRandom(FAMILY_PLANS_POOL),
    dietary: getRandom(DIETARY_POOL),
    sleeping: getRandom(SLEEPING_POOL),
    personalityType: getRandom(PERSONALITY_POOL),
    communicationStyle: getRandom(COMMUNICATION_POOL),
    loveStyle: getRandom(LOVE_STYLE_POOL),
    socialMedia: getRandom(SOCIAL_MEDIA_POOL),
    languages: getRandomItems(LANGUAGES_POOL, 2),
    interests: getRandomItems(INTERESTS_POOL, 5),
    music: getRandomItems(MUSIC_POOL, 5),
    movies: getRandomItems(MOVIES_POOL, 5),
    books: getRandomItems(BOOKS_POOL, 5),
    travel: getRandomItems(TRAVEL_POOL, 5)
});

const generateRandomPhone = () => {
    const digits = Math.floor(Math.random() * 900000000) + 100000000;
    return normalizePhone(`+614${digits}`);
};

const generateRandomEmail = (name) => {
    const randomStr = Math.random().toString(36).substring(2, 7);
    return `${name.toLowerCase()}.${randomStr}@example.com`;
};

const getPortrait = (gender) => {
    let pool = [...PORTRAIT_MEN, ...PORTRAIT_WOMEN];
    if (gender === "Men" || gender === "Trans Man") pool = PORTRAIT_MEN;
    if (gender === "Women" || gender === "Trans Women") pool = PORTRAIT_WOMEN;

    const base = getRandom(pool);
    return `${base}${PHOTO_QUALITY_PARAMS}`;
};

const getLifestyle = () => {
    return `${getRandom(LIFESTYLE_PHOTOS)}${PHOTO_QUALITY_PARAMS}`;
};

module.exports = {
    AU_CITIES,
    INTERESTS_POOL,
    BIOS_POOL,
    RELATIONSHIP_GOALS,
    getRandom,
    getRandomItems,
    getRandomAttributes,
    generateRandomPhone,
    generateRandomEmail,
    getPortrait,
    getLifestyle,
    hashPhone
};