const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_TAKHRIJ =
  "CONSTITUTION AL-MIZAN — PROTOCOLE DE DABT SUPREME. " +
  "Tu n'es pas un assistant, tu es une machine de Takhrij reglee sur la methodologie des Salaf as-Salih. " +

  "SECTION I : SOURCES ET AUTORITES (L'ANCRE) " +
  "1. LANGUE : Ibn Manzur (Lisan al-Arab) et Al-Fayruzabadi (Al-Qamus al-Muhit). Tout sens moderne est une innovation. " +
  "2. GHARIB : Ibn al-Athir (An-Nihayah). C'est ta seule source pour le lexique prophetique. " +
  "3. RIJAL : Al-Dhahabi (Mizan al-I'tidal) PRIORITE ABSOLUE, complete par Ibn Hajar (Taqrib). " +
  "4. TAKHRIJ : Cheikh Al-Albani (Silsilah Sahihah/Da'ifah, Irwa al-Ghalil). Tu dois citer le numero exact. " +

  "SECTION II : LE LEXIQUE DE FER DES SIFAT (AQIDA) " +
  "Interdiction du Ta'wil (interpretation), du Ta'til (negation) et du Tashbih (anthropomorphisme). " +
  "Istawa = S'est etabli | Nuzul = Descente | Yad / Yadan = Main / Deux Mains | Wajh = Visage | " +
  "Ayn / Aynan = Oeil / Deux Yeux | Qadam = Pied | Saq = Tibia | Isba' = Doigt | " +
  "Dahik = Rire | Ghadab = Colere | Mahabbah = Amour | Ridha = Agrement | Kalam = Parole | " +
  "Al-Uluww = L'Elevation absolue | Al-Fawqiyyah = La Superiorite de position. " +

  "SECTION III : LE LEXIQUE DE FER DU JARH WA TA'DIL (RIJAL) " +
  "Tu ne sors JAMAIS de ces termes : " +
  "Amir al-Mu'minin fil Hadith (Sommet) | Imam | Hafiz | Thiqah Thiqah (Tres fiable) | Thiqah (Fiable) | " +
  "Saduq (Veridique) | Saduq Yahim (Veridique mais fait des erreurs) | Maqbul (Acceptable si suivi) | " +
  "Layyin (Faible leger) | Da'if (Faible) | Da'if Jiddan (Tres faible) | Munkar al-Hadith (Rejete) | " +
  "Matruk (Abandonne) | Kadhdhab (Menteur) | Waddah (Forgeur). " +

  "SECTION IV : PROTOCOLE DE REPONSE (TAKHRIJ STEP-BY-STEP) " +
  "Etape 1 : Analyse du Matn — recherche de Shudhudh (anomalie) et Illa (defaut cache). " +
  "Etape 2 : Analyse de l'Isnad — verification de l'Ittisal (continuite sans rupture). " +
  "Etape 3 : Verification de la 'Adala (integrite morale) et du Dabt (precision memorielle) de chaque rawi. " +
  "Etape 4 : Rapport du verdict des imams anciens, puis de Cheikh Al-Albani avec numero exact. " +

  "SECTION V : RICHESSE DU SHARH (COMMENTAIRE) " +
  "Pour chaque champ, ne te contente pas du mot-cle. Developpe l'argumentation technique. " +
  "Si un terme du Matn est complexe, cite la racine arabe et l'explication d'Ibn al-Athir (An-Nihayah). " +
  "L'utilisateur doit comprendre la mecanique du verdict, pas seulement lire le resultat final. " +
  "Niveau attendu pour chaque champ : " +
  "french_text = traduction mot-a-mot stricte + entre crochets la racine arabe et le sens selon Lisan al-Arab pour tout terme complexe. " +
  "grade_explique = verdict + nom du savant + titre du livre + numero exact + explication du pourquoi (quel rawi, quelle defaillance precise). " +
  "jarh_tadil = pour chaque rawi nomme : rang selon Al-Dhahabi + terme exact du Lexique de Fer Rijal + raison technique (Ikhtilat, Tadlis, Jahalah, etc.). " +
  "sanad_conditions = pour chaque condition (Ittisal / 'Adala / Dabt / Shudhudh / 'Illa) : statut + justification en une phrase precise. " +
  "avis_savants = minimum 2 imams anciens + Al-Albani avec numero exact de hadith. " +

  "INTERDICTIONS ABSOLUES : " +
  "- NE JAMAIS utiliser Larousse, Robert, ou des termes comme 'symbole', 'metaphore' ou 'spirituel' pour les Sifat. " +
  "- NE JAMAIS faire de courtoisie. " +
  "- NE JAMAIS resumer le contexte. " +

  "STRUCTURE JSON STRICTE : " +
  'Reponds UNIQUEMENT avec un tableau JSON valide : [{"i":0,"french_text":"[Traduction technique mot-a-mot]","grade_explique":"[Verdict + Savant + Ref exacte]","jarh_tadil":"[Analyse detaillee des narrateurs selon Al-Dhahabi]","sanad_conditions":"[Ittisal/Adala/Dabt/Shudhudh/Illa avec justification]","avis_savants":"[Citations des imams avec numero de hadith]"}]';

const DICT = {
  "intention":"النية","intentions":"النية","niya":"النية","foi":"الإيمان",
  "islam":"الإسلام","priere":"الصلاة","salat":"الصلاة","zakat":"الزكاة",
  "jeune":"الصيام","ramadan":"رمضان","hajj":"الحج","coran":"القرآن",
  "paradis":"الجنة","enfer":"النار","mort":"الموت","jugement":"القيامة",
  "prophete":"النبي","sunna":"السنة","hadith":"الحديث","sincere":"النصيحة",
  "sincerite":"النصيحة","patience":"الصبر","gratitude":"الشكر","verite":"الصدق",
  "mensonge":"الكذب","honnete":"الأمانة","confiance":"التوكل","purification":"الطهارة",
  "ablution":"الوضوء","mosquee":"المسجد","aumone":"الصدقة","licite":"الحلال",
  "illicite":"الحرام","repentir":"التوبة","pardon":"المغفرة","misericorde":"الرحمة",
  "connaissance":"العلم","savoir":"العلم","savant":"العلم","bien":"الخير",
  "mal":"الشر","acte":"العمل","actes":"الأعمال","jour dernier":"يوم القيامة",
  "allah":"الله","dieu":"الله","ange":"الملائكة","destin":"القدر"
};

function frToAr(q) {
  const low = q.toLowerCase().trim();
  for (const [fr, ar] of Object.entries(DICT)) {
    if (low.includes(fr)) return ar;
  }
  return q.trim().split(/\s+/).slice(0,2).join(" ");
}

function clean(s) {
  return (s || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function getField(block, label) {
  const rx = new RegExp(label + "[^<]*<\\/span>([^<]+)");
  const m = block.match(rx);
  return m ? m[1].trim() : "";
}

function parseHadiths(html) {
  const results = [];
  console.log("HTML_SAMPLE:", html.substring(0, 800));

  // Méthode 1 : split sur class="hadith"
  const parts = html.split(/(?=<div[^>]+class="hadith[^"]*")/);
  console.log("PARTS:", parts.length);

  for (const part of parts) {
    if (results.length >= 3) break;
    if (!part.includes('class="hadith')) continue;

    // Extraire le matn (tout jusqu'au premier </div>)
    const matnMatch = part.match(/class="hadith[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!matnMatch) continue;
    const arabic_text = matnMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (arabic_text.length < 10) continue;

    // Extraire le bloc hadith-info
    const infoMatch = part.match(/class="hadith-info[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const info = infoMatch ? infoMatch[1] : part;

    const grade  = getField(info, "خلاصة حكم المحدث");
    const savant = getField(info, "المحدث");
    const source = getField(info, "المصدر");
    const rawi   = getField(info, "الراوي");

    console.log("HADITH_FOUND:", arabic_text.substring(0,50), "| GRADE:", grade);
    results.push({ arabic_text, grade: grade||"غير محدد", savant, source, rawi,
      french_text: "", grade_explique: "", jarh_tadil: "", sanad_conditions: "", avis_savants: "" });
  }
  return results;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const q = req.body?.q || req.query?.q;
  if (!q) return res.status(400).json({ error: "Requete vide" });

  try {
    const isArabic = /[\u0600-\u06FF]/.test(q);
    const arabicQuery = isArabic ? q : frToAr(q);
    console.log("QUERY:", q, "->", arabicQuery);

    const dorarResp = await fetch(
      "https://dorar.net/dorar_api.json?skey=" + encodeURIComponent(arabicQuery),
      { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://dorar.net/" },
        signal: AbortSignal.timeout(8000) }
    );
    if (!dorarResp.ok) throw new Error("Dorar " + dorarResp.status);

    const dorarData = await dorarResp.json();
    console.log("DORAR_KEYS:", Object.keys(dorarData));
    const html = dorarData?.ahadith?.result || "";
    console.log("HTML_LEN:", html.length);
    if (!html) return res.status(200).json([]);

    const results = parseHadiths(html);
    console.log("PARSED:", results.length, "hadiths");
    if (!results.length) return res.status(200).json([]);

    const textes = results.map((r, i) =>
      "[" + i + "]\nMatn : " + r.arabic_text +
      "\nGrade : " + r.grade +
      "\nSavant : " + r.savant +
      "\nRawi : " + r.rawi
    ).join("\n\n");

    const promptFr = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM_TAKHRIJ,
      messages: [{ role: "user", content: textes }]
    });

    const rawText = promptFr.content[0].text;
    const analyses = {};
    try {
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) JSON.parse(match[0]).forEach(item => {
        if (typeof item.i === "number") analyses[item.i] = item;
      });
    } catch (_) {}

    results.forEach((r, i) => {
      const a = analyses[i] || {};
      r.french_text      = clean(a.french_text)      || "Non documente";
      r.grade_explique   = clean(a.grade_explique)    || "Non documente";
      r.jarh_tadil       = clean(a.jarh_tadil)        || "Non documente";
      r.sanad_conditions = clean(a.sanad_conditions)  || "Non documente";
      r.avis_savants     = clean(a.avis_savants)      || "Non documente";
    });

    return res.status(200).json(results);

  } catch (error) {
    console.log("ERROR:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
