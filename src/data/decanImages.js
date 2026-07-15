// ═══════════════════════════════════════════════════════════════════════
// THE 36 DECAN IMAGES — Picatrix II.11 & Agrippa II.37, verified
// ═══════════════════════════════════════════════════════════════════════
// Sources read in full (July 2026):
//   Picatrix, Book II ch. 11 — Attrell & Porreca translation of Pingree's
//     Latin edition (Penn State UP, 2019), archive.org; Arabic variants
//     from the Atallah/Kiesel Ghayat al-Hakim translation
//   Agrippa, Three Books of Occult Philosophy II.37 (J.F. trans., 1651),
//     esotericarchives.com — Agrippa credits Teucer the Babylonian via
//     Porphyry, "after whom the Arabians also wrote"
//   Golden Dawn Book T (Mathers, 1888) — the 36 pip-card decan titles
// The face rulers follow the descending Chaldean cycle entered at
// Aries I = Mars (Picatrix II.11 §2), so Pisces III and Aries I are both
// Mars — the famous seam. Indexed 0–35 from 0° Aries.

export const DECAN_DOCTRINE = {
  operational: "“In the signs' faces is the greatest secret and a great profit… When you craft any of the images with the faces mentioned above, do it with the material suited to the planet that rules in that face… If perchance the Sun were in the ascendant in the hour of that planet, or it had another desirable combination with him, then its effect would be more stable and stronger.” — Picatrix II.11 §39",
  dignity: "“The power of a term is stronger than the power of a face, and the power of a face is stronger than the power of a house.” — Picatrix II.11",
  provenance: "The decans are the oldest layer of the tradition: Egyptian star-clock bands on coffin lids by the 21st century BC, thirty-six asterisms of ten days each. They pass through the Hermetica and the Testament of Solomon ('we are the thirty-six elements, the world-rulers of this darkness'), into India as the drekkana, and back through Arabic astrology into the Picatrix — which itself credits its images to 'the sages of India.'",
};

// Per decan: p = Picatrix image & operation (compact, after Attrell/Porreca),
// a = Agrippa II.37 image & operation, t = Book T title, v = variant note.
export const DECAN_IMAGES = [
  // ARIES
  { p: "A black man, restless, of large body, red eyes, an axe in his hand, girt in white cloth — the face of strength, nobility, and worth without modesty.",
    a: "A black man in a white garment, of great body and reddish eyes, like one angry — boldness, fortitude, loftiness, and shamelessness.",
    t: "2 of Wands — Lord of Dominion" },
  { p: "A woman dressed in green, missing a leg — the face of splendor, excellence, value, and rule.",
    a: "A woman in a red garment over a white one spreading to her feet — nobleness, height of kingdom, greatness of dominion.",
    t: "3 of Wands — Lord of Established Strength" },
  { p: "An unsettled man in red, a golden bracelet in his hands, desiring to do good yet incapable — the face of subtlety, subtle crafts, novelties, and instruments.",
    a: "A pale man with reddish hair in a red garment, a golden bracelet in one hand, a wooden staff held forth, restless as one in wrath — wit, meekness, joy, and beauty.",
    t: "4 of Wands — Lord of Perfected Work" },
  // TAURUS
  { p: "A woman with curly hair and a single son, in clothes like fire — the face for plowing and working the land, geometry, sowing, and crafting.",
    a: "A naked man — archer, harvester, husbandman — going forth to sow, plough, build, and divide the earth by the rules of geometry.",
    t: "5 of Pentacles — Lord of Material Trouble",
    v: "Agrippa's image diverges sharply from the Picatrix here." },
  { p: "A man like a camel, hooves for fingers, covered in torn linen, who wishes to work the earth and sow — the face of nobility, political power, and rewarding the people.",
    a: "A naked man holding a key — power, nobility, and dominion over people.",
    t: "6 of Pentacles — Lord of Material Success" },
  { p: "A red-colored man with large white teeth, a body like an elephant with long legs; with him a horse, a dog, and a calf — the face of wickedness, poverty, misery, and fear.",
    a: "A man with a serpent and a dart in his hand — necessity and profit, misery and slavery.",
    t: "7 of Pentacles — Lord of Success Unfulfilled" },
  // GEMINI
  { p: "A beautiful woman, mistress of stitching, with two calves and two horses — the face for scribal work, computation and number, giving and receiving, and science.",
    a: "A man with a rod in his hand, as if serving another — wisdom and the knowledge of numbers and arts in which there is no profit.",
    t: "8 of Swords — Lord of Shortened Force" },
  { p: "A man whose face is an eagle's, in lead chainmail and iron helmet with a silken crown, bearing bow and arrows — the face of oppression, evils, and subtleties.",
    a: "A man with a pipe, and another bowed down digging the earth — infamous agility, jesters and jugglers, labours and painful searchings.",
    t: "9 of Swords — Lord of Despair and Cruelty",
    v: "The Arabic reads a griffin's face for the eagle's." },
  { p: "A man in chainmail with bow, arrows, and quiver — the face of daring, honesty, the division of labor, and encouragement.",
    a: "A man seeking arms, and a fool holding a bird and a pipe — forgetfulness, wrath, boldness, jests, and unprofitable words.",
    t: "10 of Swords — Lord of Ruin" },
  // CANCER
  { p: "A man with crooked fingers and bent head, body like a horse, white feet, fig leaves covering him — the face of instruction, knowledge, love, subtlety, and craft.",
    a: "A young virgin in fine clothes, a crown on her head — acuteness of the senses, subtlety of wit, and the love of men.",
    t: "2 of Cups — Lord of Love" },
  { p: "A woman with a beautiful face crowned in green myrtle, a water-lily stem in her hand, singing songs of love and joy — the face of games, riches, rejoicing, and abundance.",
    a: "A man in comely apparel, or a man and woman sitting at table and playing — riches, mirth, gladness, and the love of women.",
    t: "3 of Cups — Lord of Abundance" },
  { p: "A figure with a serpent in his hand and golden chains before him — the face of running, riding, and acquiring profit in war and dispute.",
    a: "A hunter with lance and horn, bringing out dogs to hunt — the pursuit of those who flee, possessing things by arms and brawling.",
    t: "4 of Cups — Lord of Blended Pleasure",
    v: "The Latin garbled the Arabic's man (with a turtle's foot and golden jewelry) into a turtle." },
  // LEO
  { p: "A man in dirty clothes, with the figure of a horse-master looking north, and figures of a bear and a dog — the face of strength, largesse, and victory.",
    a: "A man riding on a lion — boldness, violence, cruelty, wickedness, lust, and labours to be sustained.",
    t: "5 of Wands — Lord of Strife" },
  { p: "A man crowned in white myrtle, a bow in his hand — the face of beauty, of riding, of the rise of rude men, of war and unsheathed swords.",
    a: "An image with hands lifted up, and a crowned man with a drawn sword and a buckler — hidden contentions, unknown victories, quarrels and battles.",
    t: "6 of Wands — Lord of Victory" },
  { p: "An old man, black and unwashed, fruit and meats in his mouth, a bronze pitcher in his hand — the face of love, delight, feast platters, and health.",
    a: "A young man with a whip, and a man very sad and of ill aspect — love and society, and the loss of one's right for avoiding strife.",
    t: "7 of Wands — Lord of Valour" },
  // VIRGO
  { p: "A virgin girl in old soft linen, a pomegranate in her hand — the face for sowing, plowing, germinating trees, collecting grapes, and the good life.",
    a: "The figure of a good maid, and a man casting seeds — getting of wealth, ordering of diet, plowing, sowing, and peopling.",
    t: "8 of Pentacles — Lord of Prudence" },
  { p: "A man of handsome complexion dressed in hide, steel armor over it — the face of petitions, desires, loot, tribute, and denying fair things.",
    a: "A black man clothed with a skin, and a man with a bush of hair holding a bag — gain, scraping together of wealth, covetousness.",
    t: "9 of Pentacles — Lord of Material Gain" },
  { p: "A white man of large body in white linen, with him a woman holding black oil — the face of weakness, old age, sickness, and laziness.",
    a: "A white woman, deaf; or an old man leaning on a staff — weakness, infirmity, loss of members, destruction of trees.",
    t: "10 of Pentacles — Lord of Wealth" },
  // LIBRA
  { p: "A man with a lance in his right hand, a bird hanging by its feet in his left — the face of justice, truth, good judgments, and perfect justice for the weak.",
    a: "An angry man with a pipe, and a man reading in a book — justifying and helping the miserable and weak against the powerful and wicked.",
    t: "2 of Swords — Lord of Peace Restored" },
  { p: "A black man with his bride, a joyful path ahead — the face of quietude, rejoicing, abundance, and the good life.",
    a: "Two men furious and wrathful, and a man in a comely garment sitting in a chair — indignation against evil, and a quiet and secure life amid plenty.",
    t: "3 of Swords — Lord of Sorrow" },
  { p: "A man riding upon an ass, a wolf before him — the face of evil works, adultery, songs, rejoicing, and flavors.",
    a: "A violent man holding a bow, before him a naked man, and another holding bread and a cup of wine — wicked lusts, singing, sports, and gluttony.",
    t: "4 of Swords — Lord of Rest from Strife" },
  // SCORPIO
  { p: "A man with a lance in his right hand and a man's head in his left — the face of power, sadness, ill will, and enmity.",
    a: "A woman of good face and habit, and two men striking her — comeliness and beauty; strifes, treacheries, deceits, and perditions.",
    t: "5 of Cups — Lord of Loss in Pleasure",
    v: "The Arabic gives two arrows, and reads honor, cunning, and triumph." },
  { p: "A man riding a camel, a scorpion in his hand — the face of knowledge, modesty, power, and of one speaking ill of another.",
    a: "A naked man and woman, and a man sitting on the earth with two dogs biting one another before him — impudence, deceit, and strife among men.",
    t: "6 of Cups — Lord of Pleasure" },
  { p: "A horse and a hare — the face of evil works and flavors.",
    a: "A man bowed on his knees, and a woman striking him with a staff — drunkenness, fornication, wrath, violence, and strife.",
    t: "7 of Cups — Lord of Illusionary Success",
    v: "The Arabic gives a horse and a snake." },
  // SAGITTARIUS
  { p: "Three bodies of men — one yellow, one white, one red — the face of heat, manumission, bearing fruit in field and garden, sustaining and separating.",
    a: "A man armed in mail, holding a naked sword — boldness, malice, and liberty.",
    t: "8 of Wands — Lord of Swiftness" },
  { p: "A man leading two cows, a monkey and a bear before him — the face of fear, lamentation, sorrow, pain, misery, and restlessness.",
    a: "A woman weeping, covered with clothes — sadness and fear of one's own body.",
    t: "9 of Wands — Lord of Great Strength" },
  { p: "A man with a hat on his head, killing another man — the face of swiftness in ill will, evil effects, enmity, dispersion, and poor conduct.",
    a: "A man like gold in color, or an idle man playing with a staff — willfulness, obstinacy in evil things, contentions, and horrible matters.",
    t: "10 of Wands — Lord of Oppression" },
  // CAPRICORN
  { p: "A man with a reed in his right hand and a hoopoe in his left — the face of joyfulness and rejoicing, and of dissolving businesses; laziness and weak process.",
    a: "The form of a woman, and a man carrying full bags — going forth and rejoicing, gaining and losing with weakness and baseness.",
    t: "2 of Pentacles — Lord of Harmonious Change" },
  { p: "A man with a monkey before him — the face for seeking impossibilities, things no one has prevailed in achieving.",
    a: "Two women, and a man looking toward a bird flying in the air — requiring what cannot be done, searching after what cannot be known.",
    t: "3 of Pentacles — Lord of Material Works" },
  { p: "A man holding a book he opens and closes, the tail of a fish before him — the face of riches, the accumulation of money, and businesses inclined to a good end.",
    a: "A woman chaste in body and wise in her work, and a banker gathering his money on the table — governing in prudence, covetousness of money, avarice.",
    t: "4 of Pentacles — Lord of Earthly Power" },
  // AQUARIUS
  { p: "A man with a mutilated head, holding a peacock — the face of misery, poverty, and hard unrewarded work.",
    a: "A prudent man, and a woman spinning — thought and labour for gain, poverty and baseness.",
    t: "5 of Swords — Lord of Defeat" },
  { p: "A man like a king, permitting himself much and abhorring what he sees — the face of beauty and position, the achievement of desires, fulfillment and weakness.",
    a: "A man with a long beard — understanding, meekness, modesty, liberty, and good manners.",
    t: "6 of Swords — Lord of Earned Success" },
  { p: "A man with a mutilated head, an old woman with him — the face of abundance, the fulfillment of the will, and affronts.",
    a: "A black and angry man — insolence and impudence.",
    t: "7 of Swords — Lord of Unstable Effort",
    v: "The Arabic inverts the operation: ugliness, bad reputation, scandal." },
  // PISCES
  { p: "A man with two bodies, as if greeting with his hands — the face of peace and humility, of long journeys, misery, the search for riches, and the taking of pity.",
    a: "A man carrying burdens on his shoulder, well clothed — journeys, change of place, carefulness of getting wealth.",
    t: "8 of Cups — Lord of Abandoned Success" },
  { p: "A man with a second inverted head, his feet raised on high, a platter in his hand — the face of great value, strong will, worthiness, and contemplation of splendid matters.",
    a: "A woman of good countenance, well adorned — to desire and set oneself about high and great matters.",
    t: "9 of Cups — Lord of Material Happiness" },
  { p: "A gloomy man of evil thoughts, deceits and betrayals before him; a woman with an ass and a bird — the face of yearning, or of seeking quietude and rest.",
    a: "A naked man or a youth, and near him a beautiful maid crowned with flowers — rest, idleness, delight, and the embraces of women.",
    t: "10 of Cups — Lord of Perfected Success" },
];
