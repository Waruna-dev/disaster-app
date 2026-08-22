/**
 * Lightweight, fully-offline "auto translate" helper for announcement text.
 *
 * The sandbox this project is built/tested in has no outbound network access
 * to paid translation APIs (Google Cloud Translate, Microsoft Translator,
 * etc.), so this module ships a small disaster/emergency-vocabulary
 * dictionary and does a word-by-word best-effort substitution into Sinhala
 * and Tamil. It is intentionally simple:
 *
 *   - Known emergency words/phrases are translated.
 *   - Anything not in the dictionary is left in English.
 *   - The admin UI always shows the Sinhala/Tamil fields as editable text
 *     areas, so staff can correct/rewrite the machine draft before publishing.
 *
 * To upgrade to a real translation provider later, replace the body of
 * `translateText()` with a call to your provider of choice (e.g. Google
 * Cloud Translation API) and keep the same function signature — nothing
 * else in the app needs to change.
 */

const DICTIONARY = {
  si: {
    flood: "ගංවතුර",
    floods: "ගංවතුර",
    flooding: "ගංවතුර",
    landslide: "නායයෑම",
    "heavy rain": "අධික වර්ෂාව",
    rain: "වර්ෂාව",
    warning: "අනතුරු ඇඟවීම",
    alert: "අනතුරු ඇඟවීම",
    danger: "අන්තරාය",
    evacuate: "ඉවත් වන්න",
    evacuation: "ඉවත්කිරීම",
    safe: "ආරක්ෂිත",
    safety: "ආරක්ෂාව",
    shelter: "රැකවරණ මධ්‍යස්ථානය",
    residents: "පදිංචිකරුවන්",
    area: "ප්‍රදේශය",
    road: "මාර්ගය",
    closed: "වසා ඇත",
    please: "කරුණාකර",
    immediately: "වහාම",
    river: "ගඟ",
    water: "ජලය",
    level: "මට්ටම",
    rising: "ඉහළ යමින්",
    volunteers: "ස්වේච්ඡා සේවකයින්",
    emergency: "හදිසි අවස්ථාව",
    contact: "සම්බන්ධ වන්න",
    helpline: "සහන මධ්‍යස්ථානය",
    disaster: "ආපදාව",
    high: "ඉහළ",
    medium: "මධ්‍යම",
    low: "අඩු",
    advised: "උපදෙස් දෙනු ලැබේ",
    move: "ගමන් කරන්න",
    ground: "බිම",
    higher: "ඉහළ",
  },
  ta: {
    flood: "வெள்ளம்",
    floods: "வெள்ளங்கள்",
    flooding: "வெள்ளம்",
    landslide: "நிலச்சரிவு",
    "heavy rain": "கனமழை",
    rain: "மழை",
    warning: "எச்சரிக்கை",
    alert: "எச்சரிக்கை",
    danger: "ஆபத்து",
    evacuate: "வெளியேறவும்",
    evacuation: "வெளியேற்றம்",
    safe: "பாதுகாப்பான",
    safety: "பாதுகாப்பு",
    shelter: "தங்குமிடம்",
    residents: "குடியிருப்பாளர்கள்",
    area: "பகுதி",
    road: "சாலை",
    closed: "மூடப்பட்டுள்ளது",
    please: "தயவுசெய்து",
    immediately: "உடனடியாக",
    river: "ஆறு",
    water: "தண்ணீர்",
    level: "நிலை",
    rising: "உயர்ந்து வருகிறது",
    volunteers: "தன்னார்வலர்கள்",
    emergency: "அவசரநிலை",
    contact: "தொடர்பு கொள்ளவும்",
    helpline: "உதவி மையம்",
    disaster: "பேரிடர்",
    high: "அதிக",
    medium: "நடுத்தர",
    low: "குறைந்த",
    advised: "அறிவுறுத்தப்படுகிறது",
    move: "நகரவும்",
    ground: "தரை",
    higher: "உயரமான",
  },
};

/**
 * Best-effort offline translation. Replaces known phrases/words (longest
 * phrases first so "heavy rain" beats "rain"), preserving punctuation and
 * capitalisation of untranslated words.
 */
function translateText(text, lang) {
  if (!text || !text.trim()) return "";
  const dict = DICTIONARY[lang];
  if (!dict) return text;

  let result = text;
  const phrases = Object.keys(dict).sort((a, b) => b.length - a.length);
  phrases.forEach((phrase) => {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    result = result.replace(re, dict[phrase]);
  });
  return result;
}

function translateAnnouncement(messageEn) {
  return {
    si: translateText(messageEn, "si"),
    ta: translateText(messageEn, "ta"),
  };
}

module.exports = { translateText, translateAnnouncement };
