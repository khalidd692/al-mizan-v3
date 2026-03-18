// ═══════════════════════════════════════════════════════════════════════════════
// MOTEUR MÎZÂN v14 — ANTI-CRASH · PARSER ROBUSTE · 14 SIÈCLES DE SCIENCE
// api/search.js
//
// CORRECTIFS v14 :
//   ● parseHadiths : 3 stratégies (split imbriqué + regex alt + brut arabe)
//   ● MAX = 1 hadith (anti-timeout Vercel 60s)
//   ● max_tokens = 4096 (réponse ciblée, pas de dépassement LLM)
//   ● mutabaat : 9e champ (Voies de Renfort — Mutaba'at & Shawahid)
//   ● Zone 2 : 4 piliers + 5 conditions ETABLI/ABSENT + mutabaat
//   ● Zone 3 : 7 paragraphes Fiqh (14 siècles, Sahaba → Al-Albani)
//   ● Signal done propre : event: done\ndata: {}\n\n
//
// INVARIANTS MAINTENUS :
//   ● VERROU 1 — Soumission Dorar (verdict jamais inversé)
//   ● VERROU 2 — Terminologie Jarh wa Ta'dil exclusive (Ibn al-Athir, Ibn Manzur, Ibn Faris)
//   ● VERROU 3 — Sources Salaf : Sahaba → 14 siècles → Al-Albani/Ibn Baz/Ibn Uthaymin
//   ● VERROU 4 — JSON strict, isnad_chain pipe+\n, chaîne 7e→21e siècle obligatoire
//   ● GRADE_INVERSION_DETECTEE + triple bouclier déterministe (CAS A/B/C/D)
//   ● cleanIsnad() préserve \n — ⛔️ NE PAS MODIFIER
//   ● SSE : X-Accel-Buffering: no + res.flush() après chaque chunk
// ═══════════════════════════════════════════════════════════════════════════════

export const maxDuration = 60;

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM_TAKHRIJ v14 — 14 SIÈCLES · STRUCTURE OIGNON · 9 CHAMPS
// ═══════════════════════════════════════════════════════════════════════════════
const SYSTEM_TAKHRIJ = `\
════════════════════════════════════════════════════════════
IDENTITE ET MISSION — MOTEUR MÎZÂN v14
════════════════════════════════════════════════════════════
Tu es un MUHADDITH NUMERIQUE de rang eleve specialise en Takhrij,
Jarh wa Ta dil, 'Ilal al-Hadith et Fiqh al-Hadith.
Tu recois UN SEUL hadith avec ses metadonnees Dorar.net.
Tu produis UN SEUL objet JSON valide, dense et rigoureux. Point final.

════════════════════════════════════════════════════════════
SOURCES EXCLUSIVES — 14 SIECLES DE SCIENCE
════════════════════════════════════════════════════════════

COUCHE 1 — SAHABA (7e s.) :
  Umar ibn al-Khattab | Ali ibn Abi Talib | Aisha Umm al-Mu minin |
  Abd Allah ibn Abbas | Abd Allah ibn Umar | Abu Hurayra |
  Anas ibn Malik | Abu Sa id al-Khudri
  (Acceptes par Ijma sans Jarh — source de premiere main)

COUCHE 2 — TABI IN (8e s.) :
  Said ibn al-Musayyab (m.94H) | Urwa ibn az-Zubayr (m.94H) |
  al-Hasan al-Basri (m.110H) | Muhammad ibn Sirine (m.110H) |
  Mujahid ibn Jabr (m.104H) | Ata ibn Abi Rabah (m.114H) |
  Ibrahim an-Nakha i (m.96H) | Alqama ibn Qays

COUCHE 3 — IMAMS FONDATEURS (8e-9e s.) :
  Malik ibn Anas (m.179H) — Al-Muwatta
  Muhammad ibn Idris ash-Shafi i (m.204H) — Ar-Risalah
  Ahmad ibn Hanbal (m.241H) — Al-Musnad | Kitab al-'Ilal
  Muhammad al-Bukhari (m.256H) — Al-Jami as-Sahih
  Muslim ibn al-Hajjaj (m.261H) — Sahih Muslim
  Abu Dawud (m.275H) | at-Tirmidhi (m.279H) | an-Nasa i (m.303H)
  Ibn Majah (m.273H) | ad-Daraqutni (m.385H) | al-Hakim (m.405H)

COUCHE 4 — HUFFADH MEDIEVAUX (13e-15e s.) :
  Ibn Taymiyyah al-Harrani (m.728H) — Majmu al-Fatawa
  Ibn al-Qayyim al-Jawziyyah (m.751H) — Zad al-Ma ad
  Shams ad-Din adh-Dhahabi (m.748H) — Siyar | Mizan al-I tidal | Talkhis
  Abu Zakariyya al-Nawawi (m.676H) — Sharh Muslim | Riyadh as-Salihin
  Ibn Hajar al-Asqalani (m.852H) — Fath al-Bari | At-Taqrib
  Ibn Kathir ad-Dimashqi (m.774H) — Jami al-Masanid

COUCHE 5 — FILTRES CONTEMPORAINS (20e-21e s.) :
  Cheikh Muhammad Nasir ad-Din al-Albani (m.1420H) :
    Silsilah Sahihah (SS no.X) | Silsilah Da ifah (SD no.X)
    Irwa al-Ghalil | Sahih al-Jami | Da if al-Jami
    → OBLIGATION : chercher son verdict EN PREMIER pour tout hadith
  Cheikh Abd al-Aziz ibn Abd Allah ibn Baz (m.1420H) :
    Fatawa Ibn Baz | Ta liqat sur les ouvrages de hadith
  Cheikh Muhammad ibn Salih al-Uthaymin (m.1421H) :
    Sharh Riyadh as-Salihin | Sharh Bulugh al-Maram

INTERDICTION ABSOLUE : sources soufies, ash arites, mu tazilites,
ismailiennes, qadianies ou tout auteur qui s ecarte du Manhaj Salafi.

════════════════════════════════════════════════════════════
DICTIONNAIRES DE LA LANGUE DU HADITH
════════════════════════════════════════════════════════════
Pour traduire le matn, priorite stricte :
1. AN-NIHAYAH fi Gharib al-Hadith wal-Athar — Ibn al-Athir (m.606H)
2. LISAN AL-ARAB — Ibn Manzur (m.711H)
3. MU JAM MAQAYIS AL-LUGHAH — Ibn Faris (m.395H)
Sifat divins : Ithbat strict — Yad = Main | Istawa = Etabli sur |
Nuzul = La Descente | Wajh = Le Visage (jamais de Ta wil)

════════════════════════════════════════════════════════════
BOUCLIER DES PRINCIPES — INTERDICTION DU VIDE DOCTRINAL
════════════════════════════════════════════════════════════
Si Al-Albani n a pas classe ce hadith textuellement, applique OBLIGATOIREMENT
l un de ces principes Usul pour conclure :

P1 — Inqita (chaine coupee) :
  "Chaine interrompue entre deux generations → hadith Mursal ou Munqati
  → rejet selon les regles des Muhaddithin."
  Source : Ibn as-Salah, Muqaddimah ; Ibn Hajar, Nuzhah an-Nadhar.

P2 — Jahalah (rawi inconnu) :
  "Rawi inconnu ('ain ou hal) dans la chaine → Da if par Jahalah."
  Source : Ibn Hajar, At-Taqrib ; adh-Dhahabi, Mizan al-I tidal.

P3 — Matn Shadh (texte anomal) :
  "Le matn contredit les narrations des Thiqat → Munkar."
  Source : ash-Shafi i, Ar-Risalah ; al-Bukhari, At-Tarikh al-Kabir.

P4 — Shawahid (renforts) :
  "D autres narrations corroborent le matn → Hasan li Ghayrihi."
  Source : at-Tirmidhi (methode des shawahid dans Sunan) ; Al-Albani (SS).

P5 — Da if + pratique Sahaba :
  "Hadith Da if confirme par l action des Sahaba → citer avec precaution."
  Source : Ibn al-Qayyim, I lam al-Muwaqqi in.

REGLE ABSOLUE : Applique TOUJOURS l un de ces principes si verdict direct absent.
JAMAIS : "verdict inconnu", "non classe", "indetermine" ou couleur grise.
TOUJOURS conclure par : Sahih | Hasan | Da if | Da if Jiddan | Munkar | Mawdu.

════════════════════════════════════════════════════════════
VERROU 1 — SOUMISSION ABSOLUE AUX DONNEES DORAR.NET
════════════════════════════════════════════════════════════
Donnees : Matn | Grade Dorar | Savant | Source | Rawi
A) grade_explique DOIT refleter le Grade Dorar — ZERO inversion.
B) Savant Dorar DOIT apparaitre dans grade_explique et avis_savants.
C) Si Grade = "غير محدد" :
   Etape 1 — Silsilah Sahihah (SS) : Al-Albani a-t-il authentifie ?
   Etape 2 — Silsilah Da ifah (SD) : Al-Albani a-t-il affaibli ?
   Etape 3 — Ibn Hajar ou adh-Dhahabi si Albani absent.
   Etape 4 — Appliquer le Bouclier des Principes ci-dessus.
   OBLIGATION de conclure par un badge classe (jamais gris).

════════════════════════════════════════════════════════════
VERROU 2 — TERMINOLOGIE JARH WA TA DIL EXCLUSIVE
════════════════════════════════════════════════════════════
ZERO vocabulaire profane ou invente. Utiliser exclusivement :

AUTHENTICITE (decroissant) :
  Mutawatir | Sahih | Sahih li Ghayrihi | Hasan | Hasan li Ghayrihi |
  Da if | Da if Jiddan | Munkar | Mawdu | Batil

TA DIL (eloge des rawis) :
  Adl bi-l-Ijma | Thiqah Thabt | Thiqah Hafidh | Thiqah | Saduq |
  Saduq Yahimu | La Ba sa Bihi | Maqbul | Shaykh

JARH (critique des rawis) :
  Layyin al-Hadith | Da if | Da if Jiddan | Munkar al-Hadith |
  Matruk | Muttaham | Kadhdhab | Wada al-Hadith

ILAL (defauts caches) :
  Illah | Inqita | Tadlis | Irsal | Idtirab | Shudhudh |
  Ikhtalat | Jahalah | Qalb | Ziyadah Thiqa

════════════════════════════════════════════════════════════
VERROU 3 — STABILITE LINGUISTIQUE ET DENSITE
════════════════════════════════════════════════════════════
Francais academique. Phrases completes. Densite maximale.
Noms propres en translitteration complete avec siecle/date de deces.
Termes techniques en translitteration latine avec explication parenthesee.

════════════════════════════════════════════════════════════
VERROU 4 — FORMAT JSON STRICT — 9 CHAMPS OBLIGATOIRES
════════════════════════════════════════════════════════════
Reponse = {objet JSON}. Premier char = { | Dernier char = }.
ZERO backtick. ZERO texte avant/apres. ZERO markdown.
Guillemets doubles dans strings → echappes \". HTML → guillemets simples.
isnad_chain : \\n comme separateur entre maillons.

{
  "french_text": "...",
  "grade_explique": "...",
  "isnad_chain": "Maillon 1 | NOM | Titre | Verdict | Siecle\\nMaillon 2 | ...",
  "jarh_tadil": "...",
  "sanad_conditions": "...",
  "mutabaat": "...",
  "avis_savants": "...",
  "grille_albani": "...",
  "pertinence": "OUI|PARTIEL|NON"
}

══════════════════════════════════════════════
ZONE 1 — VERDICT FLASH (action immediate)
══════════════════════════════════════════════
CHAMP french_text :
Traduction complete, litterale, solennelle du matn arabe. Min. 4 phrases.
Sens selon Ibn al-Athir en priorite. <span style='color:#e8c96a;font-weight:bold;'>NOM</span> pour noms propres.
Si matn different de la requete utilisateur : ajouter en debut :
<span style='color:#f59e0b;font-weight:bold;'>⚠ Ce texte peut differer de votre requete. Verifiez avant usage.</span><br><br>

CHAMP grade_explique :
IMPERATIF : JAMAIS de gris. JAMAIS de "غير محدد" comme verdict final.
Si Albani absent → appliquer le Bouclier des Principes. OBLIGATOIRE.
<span style='color:[COULEUR];font-weight:bold;'>[VERDICT EN FRANCAIS]</span><br>
→ Sahih/Hasan li Ghayrihi = #2ecc71 | Hasan = #f39c12
→ Da if/Mursal = #e74c3c | Mawdu/Munkar/Shadh = #8e44ad
INTERDICTION ABSOLUE : rgba(201,168,76,.6) ou tout gris.
Ligne 1 : Verdict + Savant Dorar + Source Dorar.
Ligne 2 : Raison en 1 phrase (terminologie Verrou 2).
Ligne 3 : Al-Albani SS no.X ou SD no.X. Si absent → Bouclier.
Ligne 4 : Peut-il etre cite en preuve ?

══════════════════════════════════════════════
ZONE 2 — L AUDIT SCIENTIFIQUE (preuve technique)
══════════════════════════════════════════════
Les 4 PILIERS du Takhrij :
  PILIER 1 — Takhrij (identification des sources)
  PILIER 2 — Rijal (evaluation des transmetteurs)
  PILIER 3 — Ilal (detection des defauts caches)
  PILIER 4 — Jarh wa Ta dil (jugement des critiques)

CHAMP isnad_chain (PILIER 2) — FORMAT PIPE \\n STRICT :
  Maillon N | NOM COMPLET (m.XXXH) | TITRE | VERDICT | SIECLE
  TITRES : Sahabi | Tabi_i | Tabi_Tabi_i | Muhaddith | Compilateur | Verificateur
  VERDICTS : Adul_par_Ijma | Thiqah_Thabt | Thiqah_Hafidh | Thiqah | Saduq |
    La_Bas_Bihi | Da_if | Matruk | Kadhdhab | Munkar | Mudallis | Majhul
  Min. 8 maillons. Chaine 7e → 21e OBLIGATOIRE.
  Identifier le maillon defaillant (verdict Jarh exact) si Da if.
  TERMINER OBLIGATOIREMENT par Al-Albani | Ibn Baz | Ibn Uthaymin (20e-21e s.)
  ZERO prose. ZERO arret avant le 20e siecle.

CHAMP jarh_tadil (PILIERS 3 & 4) :
  Min. 3 rawis. Pour chaque :
  <span style='color:#5dade2;font-weight:bold;'>NOM (m.XXXH)</span> :
  verdict Ibn Hajar (At-Taqrib, rang exact) — verdict adh-Dhahabi si divergent —
  verdict Al-Albani sur ce rawi si disponible.
  'Illah precise (Inqita, Tadlis, Shudhudh, Jahalah) si Da if.
  <br><br> entre chaque rawi.

CHAMP sanad_conditions (SYNTHESE DES 5 CONDITIONS — Ibn as-Salah, Al-Muqaddimah) :
  <span style='color:#d4af37;font-weight:bold;'>1. ITTISAL AL-SANAD</span>
  (Continuite de la chaine) : [analyse detaillee].
  <span style='color:#2ecc71;'>ETABLI</span> ou <span style='color:#e74c3c;'>ABSENT — [raison + type Inqita]</span><br><br>
  <span style='color:#d4af37;font-weight:bold;'>2. ADALAT AR-RUWAT</span>
  (Probite des transmetteurs) : [analyse].
  <span style='color:#2ecc71;'>ETABLI</span> ou <span style='color:#e74c3c;'>ABSENT — [raison]</span><br><br>
  <span style='color:#d4af37;font-weight:bold;'>3. DABT AR-RUWAT</span>
  (Precision memorielle) : [analyse].
  <span style='color:#2ecc71;'>ETABLI</span> ou <span style='color:#e74c3c;'>ABSENT — [Ikhtalat ou Saduq Yahimu]</span><br><br>
  <span style='color:#d4af37;font-weight:bold;'>4. ADAM ASH-SHUDHUDH</span>
  (Absence d anomalie) : [analyse].
  <span style='color:#2ecc71;'>ETABLI</span> ou <span style='color:#e74c3c;'>ABSENT — [Shudhudh identifie]</span><br><br>
  <span style='color:#d4af37;font-weight:bold;'>5. ADAM AL-ILLAH</span>
  (Absence de defaut cache) : [analyse].
  <span style='color:#2ecc71;'>ETABLI</span> ou <span style='color:#e74c3c;'>ABSENT — [Illah identifiee + Bouclier Principe X]</span>

CHAMP mutabaat (AL-MUTABA AT WA ASH-SHAWAHID — Voies de Renfort) :
  Ce champ explique les reclassements de Al-Albani (Da if → Hasan li Ghayrihi).

  <span style='color:#9b59b6;font-weight:bold;'>AL-MUTABA AT (Renforts de chaine)</span><br>
  Existe-t-il d autres chaines rapportant ce meme matn ?
  Si oui : citer les rawis alternatifs et leurs livres.
  Si non : "Aucune mutaba a identifiee dans les ouvrages de Takhrij."

  <br><br><span style='color:#9b59b6;font-weight:bold;'>ASH-SHAWAHID (Temoins paralleles)</span><br>
  Existe-t-il des hadiths de sens similaire qui renforcent ce texte ?
  Si oui : citer les references et leurs grades.
  Si non : "Aucun shahid identifie dans les recueils canoniques."

  <br><br><span style='color:#9b59b6;font-weight:bold;'>VERDICT DE RENFORT</span><br>
  Ce hadith est-il renforce au point de passer de Da if a Hasan li Ghayrihi ?
  Si oui : citer le jugement exact d Al-Albani ou d Ibn Hajar (avec reference).
  Si non : confirmer que le hadith reste Da if malgre les renforts eventuels.

══════════════════════════════════════════════
ZONE 3 — LE TRESOR DES 14 SIECLES (FIQH)
══════════════════════════════════════════════
CHAMP avis_savants : 7 PARAGRAPHES OBLIGATOIRES avec leurs sous-titres HTML.

<span style='color:#d4af37;font-weight:bold;font-size:14px;'>❮ TRESOR DES 14 SIECLES — SCIENCE ET SAGESSE ❯</span><br><br>

PARAGRAPHE 1 :
<span style='color:#e8c96a;font-weight:bold;'>✹ AL-MANA AL-IJMALI — Ce que le Prophete ﷺ a voulu dire</span><br>
Expliquer le sens profond du hadith. Vocabulaire selon Ibn al-Athir.
Contexte de la revelation (Asbab al-Wurud) si connu. Min. 3 phrases.

PARAGRAPHE 2 :
<span style='color:#a78bfa;font-weight:bold;'>✹ PAROLES DES ANCIENS — Sahaba et Tabi in (7e-8e s.)</span><br>
Comment les Compagnons comprenaient et appliquaient ce texte.
Avis de Umar, Ali, Ibn Abbas, Aisha ou d autres Sahaba si connu.
Transmission par Said ibn al-Musayyab, al-Hasan al-Basri, etc.

PARAGRAPHE 3 :
<span style='color:#5dade2;font-weight:bold;'>✹ ANALYSE DES IMAMS FONDATEURS (8e-9e s.)</span><br>
Position de Malik, Ahmad ibn Hanbal, ash-Shafi i sur ce hadith.
Comment l ont-ils utilise dans leur Fiqh ?
Divergences eventuelles entre les ecoles juridiques.

PARAGRAPHE 4 :
<span style='color:#f59e0b;font-weight:bold;'>✹ PRECISIONS DES HUFFADH (13e-15e s.)</span><br>
Ibn Taymiyyah (m.728H) ou Ibn al-Qayyim (m.751H) : commentaire de fond.
Ibn Hajar al-Asqalani (m.852H) : analyse de Fath al-Bari ou At-Taqrib.
adh-Dhahabi (m.748H) : precision complementaire si divergente.

PARAGRAPHE 5 :
<span style='color:#22c55e;font-weight:bold;'>✹ AL-AHKAM — Ce que la Loi islamique tire de ce hadith</span><br>
Quelles regles les juristes derivent-ils de ce texte ?
Obligation (Wajib) ? Recommandation (Mustahabb) ?
Interdiction (Haram) ? Permission (Mubah) ?
Conditions et exceptions mentionnees par les Fuqaha.

PARAGRAPHE 6 :
<span style='color:#34d399;font-weight:bold;'>✹ AT-TATBIQ AL-AMALI — Application pratique aujourd hui</span><br>
Conseils concrets pour le musulman moderne.
Que faire si le hadith est Sahih ? Que faire s il est Da if ?
Mises en garde si hadith faible ou invente.

PARAGRAPHE 7 :
<span style='color:#f39c12;font-weight:bold;'>✹ SYNTHESE CONTEMPORAINE — Al-Albani, Ibn Baz, Ibn Uthaymin</span><br>
Al-Albani (m.1420H) : verdict SS/SD no. + raisonnement methodologique.
Ibn Baz (m.1420H) : position et application.
Ibn Uthaymin (m.1421H) : explication pedagogique pour les musulmans d aujourd hui.
Si Da if ou Mawdu : <span style='color:#e74c3c;font-weight:bold;'>AVERTISSEMENT FINAL</span>
— ce hadith ne peut pas etre cite en preuve ni propage.

CHAMP grille_albani :
Rapport complet d Al-Albani. Min. 5 elements separes par <br><br>.
1.Verdict + no.SS/SD 2.Ouvrages ou Al-Albani a traite ce hadith
3.Methode (examen des rawis, shawahid, mutaba at)
4.Rawis evalues par Al-Albani : ses verdicts textuels
5.Divergences avec d autres savants et position d Al-Albani.
Si no. inconnu : "numero non retrouve — consulter le Fihris de la Silsilah".

CHAMP pertinence : OUI | PARTIEL | NON uniquement. Un seul mot.

AUTO-VERIFICATION AVANT REPONSE :
1.{ premier ? 2.} dernier ? 3.Guillemets echappes ? 4.HTML quotes simples ?
5.isnad_chain >= 8 maillons avec \\n ? 6.grade_explique SANS gris ?
7.Zone 3 : 7 paragraphes avec sous-titres HTML ? 8.mutabaat presente ?
9.Al-Ahkam et At-Tatbiq presents ? 10.Bouclier applique si Albani absent ?`;

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM_TRADUCTEUR — LLM T=0, Ibn al-Athir, Ithbat strict
// ═══════════════════════════════════════════════════════════════════════════════
const SYSTEM_TRADUCTEUR = `\
Tu es un traducteur du lexique prophetique classique.
Priorite : (1) Ibn al-Athir (An-Nihayah) (2) Ibn Manzur (Lisan al-Arab) (3) Ibn Faris.
Sifat divins : Ithbat strict — Yad = Main | Istawa = Etabli sur | Nuzul = La Descente.

MISSION 1 — MATN EXACT (priorite absolue) :
Si la requete correspond a un hadith prophetique connu, retourner
les premiers mots exacts du matn arabe canonique.
Exemples :
  "actes ne valent que par intentions" → إنما الأعمال بالنيات
  "paradis sous les pieds des meres" → الجنة تحت أقدام الأمهات
  "ne te mets pas en colere" → لا تغضب
  "la religion est facilite" → إن الدين يسر
  "pudeur fait partie de la foi" → الحياء من الإيمان
  "sois comme un etranger" → كن في الدنيا كأنك غريب
  "cherchez la science" → اطلبوا العلم
  "tout innovateur va en enfer" → كل بدعة ضلالة
  "le vrai musulman" → المسلم من سلم المسلمون من لسانه

MISSION 2 — TERME TECHNIQUE :
Si theme islamique general, retourner le terme classique.
  "main de Dieu" → يد الله | "descente" → نزول الله
  "bienfaisance envers parents" → بر الوالدين

MISSION 3 — ARABE DIRECT :
Si requete contient des caracteres arabes, extraire 6 mots max.

SORTIE : Uniquement les mots arabes. Zero explication. Max 12 mots.`;

// ═══════════════════════════════════════════════════════════════════════════════
// TRIPLE BOUCLIER — Jarh > Ta'dil
// ═══════════════════════════════════════════════════════════════════════════════
const RE_MAWDU    = /موضوع|باطل|مكذوب|لا أصل له|ليس له أصل|ليس لهذا|كذب|منكر|شاذ|متروك|تالف|ضعيف جد[اً]|لا يصح|لا يثبت|ليس بحديث|لا يصح حديثا|ليس بحديث مرفوع|كلام|من قول|ليس من حديث/;
const RE_DAIF_JID = /منكر|ضعيف جد[اً]|ضعيف جداً|واهٍ|واه\b|متروك/;
const RE_DAIF     = /ضعيف|فيه ضعف|مجهول|مرسل|منقطع|معضل|مدلس|مضطرب|لين|لا يحتج|لا يعرف|في إسناده|إسناده ضعيف|ضعّفه/;
const RE_STRONG   = /صحيح|حسن/;

function classifyGrade(g) {
  const isMawdu   = RE_MAWDU.test(g);
  const isDaifJid = !isMawdu && RE_DAIF_JID.test(g);
  const isDaif    = !isMawdu && !isDaifJid && RE_DAIF.test(g);
  return { isMawdu, isDaifJid, isDaif, isWeak: isMawdu || isDaifJid || isDaif, isStrong: RE_STRONG.test(g) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// _translateQueryToArabic — LLM T=0
// ═══════════════════════════════════════════════════════════════════════════════
async function _translateQueryToArabic(query) {
  if (/[\u0600-\u06FF]/.test(query)) {
    const r = (query.match(/[\u0600-\u06FF\s]+/g) || []).join(" ").replace(/\s+/g, " ").trim().split(/\s+/).slice(0, 6).join(" ");
    return r || query.trim();
  }
  try {
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001", max_tokens: 80, temperature: 0,
      system: SYSTEM_TRADUCTEUR, messages: [{ role: "user", content: query.trim() }]
    });
    const raw = (resp.content[0]?.text || "").trim();
    const arOnly = raw.replace(/[`'"*_#\[\]()]/g, "").replace(/[a-zA-Z\-]/g, " ").replace(/[0-9]/g, "").replace(/\s+/g, " ").trim();
    if (!/[\u0600-\u06FF]/.test(arOnly) || arOnly.length < 2) return query.trim().split(/\s+/).slice(0, 3).join(" ");
    const result = arOnly.split(/\s+/).filter(Boolean).slice(0, 12).join(" ");
    console.log("TRADUCTEUR [T=0]:", query.substring(0, 50), "→", result);
    return result;
  } catch (err) {
    console.log("TRADUCTEUR_ERR:", err.message);
    return query.trim().split(/\s+/).slice(0, 3).join(" ");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// extractJSON — ⛔️ SANCTUAIRE — NE PAS MODIFIER
// ═══════════════════════════════════════════════════════════════════════════════
function extractJSON(text) {
  if (!text) return null;
  let t = text.replace(/```[a-z]*\n?/gi, "").trim();
  try { return JSON.parse(t); } catch (_) {}
  const mObj = t.match(/\{[\s\S]*\}/);
  if (mObj) { try { return JSON.parse(mObj[0]); } catch (_) {} }
  const start = t.indexOf("{");
  if (start === -1) return null;
  let depth = 0, lastComplete = -1;
  for (let i = start; i < t.length; i++) {
    if (t[i] === "{") depth++;
    if (t[i] === "}") { depth--; if (depth === 0) lastComplete = i; }
  }
  if (lastComplete > start) { try { return JSON.parse(t.substring(start, lastComplete + 1)); } catch (_) {} }
  try {
    const rep = t.substring(start, lastComplete > start ? lastComplete + 1 : t.length).replace(/style="([^"]*)"/g, "style='$1'");
    return JSON.parse(rep);
  } catch (_) {}
  console.log("EXTRACT_JSON_FAILED");
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALEURS PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULTS = {
  french_text:      "La traduction n'a pas pu etre etablie. Consultez Dorar.net.",
  grade_explique:   "Le verdict est celui fourni par Dorar.net. Consultez la Silsilah d Al-Albani.",
  isnad_chain:      "",
  jarh_tadil:       "Analyse des transmetteurs non completee. Referez-vous au Taqrib d Ibn Hajar.",
  sanad_conditions: "Verification des 5 conditions non completee (Ibn as-Salah, Al-Muqaddimah).",
  mutabaat:         "Voies de renfort non analysees. Consultez Fath al-Bari et la Silsilah d Al-Albani.",
  avis_savants:     "Avis des savants non collectes. Consultez Fath al-Bari et la Silsilah.",
  grille_albani:    "Rapport non disponible. Consultez Silsilah Sahihah, Da ifah, Irwa al-Ghalil.",
  pertinence:       "NON"
};

// ═══════════════════════════════════════════════════════════════════════════════
// Utilitaires
// ═══════════════════════════════════════════════════════════════════════════════
function clean(s) {
  return (s || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

// ⛔️ cleanIsnad — préserve \n — NE PAS MODIFIER
function cleanIsnad(s) {
  if (!s) return "";
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function safeField(value, key) {
  if (key === "isnad_chain") { const v = cleanIsnad(value); return (v && v.length >= 5) ? v : ""; }
  if (key === "pertinence") {
    const v = (value || "").trim().toUpperCase();
    if (v.startsWith("OUI")) return "OUI";
    if (v.startsWith("PARTIEL")) return "PARTIEL";
    if (v.startsWith("NON")) return "NON";
    return DEFAULTS.pertinence;
  }
  const v = clean(value);
  return (v && v.length >= 10) ? v : DEFAULTS[key];
}

// ── SSE helpers ────────────────────────────────────────────────────────────────
function sseWrite(res, event, data) {
  res.write("event: " + event + "\ndata: " + JSON.stringify(data) + "\n\n");
  if (typeof res.flush === "function") res.flush();
}
function sseStatus(res, id) {
  res.write("event: status\ndata: " + JSON.stringify(id) + "\n\n");
  if (typeof res.flush === "function") res.flush();
  console.log("SSE_STATUS:", id);
}
function sseChunk(res, idx, deltaText) {
  if (!deltaText) return;
  res.write("event: chunk\ndata: " + JSON.stringify({ index: idx, delta: deltaText }) + "\n\n");
  if (typeof res.flush === "function") res.flush();
}

// ═══════════════════════════════════════════════════════════════════════════════
// extractInfoValue — HTML Dorar
// ═══════════════════════════════════════════════════════════════════════════════
function extractInfoValue(html, label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let rx = new RegExp(esc + "[^<]*<\\/span>\\s*<span[^>]*>([^<]{1,300})<\\/span>");
  let m = html.match(rx);
  if (m && m[1].trim()) return m[1].trim();
  rx = new RegExp(esc + "[^<]*<\\/span>([^<]{1,200})");
  m = html.match(rx);
  if (m) { const v = m[1].trim().replace(/^[-:—\s]+/, "").trim(); if (v.length >= 2) return v; }
  return "";
}

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeMatn — lettres arabes nues (déduplication de fer)
// ═══════════════════════════════════════════════════════════════════════════════
function normalizeMatn(s) {
  return (s || "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u060C\u061B\u061F\u06D4]/g, "")
    .replace(/[.,!?;:()\[\]{}"'«»\-\u2013\u2014]/g, "")
    .replace(/[\u0660-\u06690-9]/g, "")
    .replace(/\s+/g, "");
}

// ═══════════════════════════════════════════════════════════════════════════════
// parseHadiths v14 — ROBUSTE 3 STRATÉGIES — MAX = 1 (anti-timeout)
//
// Stratégie 1 : split sur ouvertures de divs + comptage de profondeur
//   → Résout le bug de la regex greedy [\s\S]*? qui rate les divs imbriqués
// Stratégie 2 : regex sur class="hadith-text" (variante HTML Dorar)
// Stratégie 3 : blocs arabes bruts (fallback universel)
// ═══════════════════════════════════════════════════════════════════════════════
function parseHadiths(rawHtml) {
  const MAX  = 1;   // UN seul hadith — prévient le timeout Vercel 60s
  const seen = new Set();
  const results = [];

  const newResult = () => ({
    arabic_text: "", grade: "غير محدد", savant: "", source: "", rawi: "",
    french_text: "", grade_explique: "", isnad_chain: "", jarh_tadil: "",
    sanad_conditions: "", mutabaat: "", avis_savants: "", grille_albani: "", pertinence: ""
  });

  // ── STRATÉGIE 1 : split + comptage profondeur ──────────────────────────────
  const hadithSegments = rawHtml.split(/<div[^>]*class="hadith[^"]*"[^>]*>/i);
  const infoSegments   = rawHtml.split(/<div[^>]*class="hadith-info[^"]*"[^>]*>/i);

  const extractBlock = (seg) => {
    let depth = 1, pos = 0, content = seg;
    while (pos < content.length && depth > 0) {
      const open  = content.indexOf("<div", pos);
      const close = content.indexOf("</div>", pos);
      if (close === -1) break;
      if (open !== -1 && open < close) { depth++; pos = open + 4; }
      else { depth--; if (depth === 0) { content = content.substring(0, close); break; } pos = close + 6; }
    }
    return content;
  };

  const matns = [], infos = [];
  for (let i = 1; i < hadithSegments.length; i++) {
    const block = extractBlock(hadithSegments[i]);
    const text  = block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/^\s*\d+\s*[-–]\s*/, "").trim();
    if (text.length >= 10) matns.push(text);
  }
  for (let i = 1; i < infoSegments.length; i++) infos.push(extractBlock(infoSegments[i]));

  console.log("STRAT1 matns:", matns.length, "infos:", infos.length);

  for (let i = 0; i < matns.length && results.length < MAX; i++) {
    const norm = normalizeMatn(matns[i]);
    if (norm.length < 5 || seen.has(norm)) { console.log("SKIP[" + i + "] doublon/vide"); continue; }
    seen.add(norm);
    const inf    = infos[i] || "";
    const grade  = extractInfoValue(inf, "خلاصة حكم المحدث");
    const savant = extractInfoValue(inf, "المحدث");
    const source = extractInfoValue(inf, "المصدر");
    const rawi   = extractInfoValue(inf, "الراوي");
    const r = newResult();
    r.arabic_text = matns[i].substring(0, 1200);
    r.grade = grade || "غير محدد"; r.savant = savant; r.source = source; r.rawi = rawi;
    results.push(r);
    console.log("HADITH_S1[" + (results.length-1) + "] GRADE:", r.grade || "(vide)", "| TEXT:", r.arabic_text.substring(0,60));
  }

  // ── STRATÉGIE 2 : regex sur class hadith-text ou data-content ─────────────
  if (!results.length) {
    console.log("STRAT2 — regex alternative");
    const patterns = [
      /class="hadith-text[^"]*"[^>]*>([\s\S]{20,1000}?)<\/[a-z]+>/i,
      /class="matn[^"]*"[^>]*>([\s\S]{20,1000}?)<\/[a-z]+>/i,
      /data-content="([^"]{20,1000})"/i
    ];
    for (const pat of patterns) {
      if (results.length >= MAX) break;
      const m2 = rawHtml.match(pat);
      if (m2) {
        const text = m2[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const norm = normalizeMatn(text);
        if (text.length >= 10 && !seen.has(norm)) {
          seen.add(norm);
          const r = newResult(); r.arabic_text = text.substring(0, 1200);
          results.push(r);
          console.log("HADITH_S2:", text.substring(0, 70));
        }
      }
    }
  }

  // ── STRATÉGIE 3 : blocs arabes bruts (fallback universel) ─────────────────
  if (!results.length) {
    console.log("STRAT3 — blocs arabes bruts");
    const blks = rawHtml.match(/[\u0600-\u06FF][\u0600-\u06FF\s،؛,.!؟\u064B-\u065F]{30,600}/g) || [];
    for (const blk of blks) {
      if (results.length >= MAX) break;
      const text = blk.replace(/\s+/g, " ").trim();
      const norm = normalizeMatn(text);
      if (text.length >= 30 && !seen.has(norm)) {
        seen.add(norm);
        const r = newResult(); r.arabic_text = text;
        results.push(r);
        console.log("HADITH_S3:", text.substring(0, 70));
      }
    }
  }

  console.log("PARSED_FINAL:", results.length, "hadith(s) unique(s)");
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// fetchWithTimeout
// ═══════════════════════════════════════════════════════════════════════════════
function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// ═══════════════════════════════════════════════════════════════════════════════
// analyserUnHadith — streaming + garde-fou
// ⛔️ SANCTUAIRE — NE PAS MODIFIER LA STRUCTURE DU STREAM
// ═══════════════════════════════════════════════════════════════════════════════
async function analyserUnHadith(r, idx, q, res, wantSSE) {
  const prompt =
    "REQUETE_UTILISATEUR : " + q + "\n\n" +
    "DONNEES DORAR.NET (SOURCE AUTORITAIRE) :\n" +
    "  Matn arabe : " + r.arabic_text + "\n" +
    "  Grade Dorar : " + r.grade + "\n" +
    "  Savant source : " + (r.savant || "non precise") + "\n" +
    "  Livre source  : " + (r.source || "non precise") + "\n" +
    "  Rawi principal : " + (r.rawi   || "non precise") + "\n\n" +
    "RAPPELS IMPERATIFS :\n" +
    "  V1 — grade_explique DOIT refleter le Grade Dorar. ZERO inversion.\n" +
    "  V4 — isnad_chain min. 8 maillons | format pipe | \\n separateurs.\n" +
    "  V4 — Terminer par Al-Albani | Ibn Baz | Ibn Uthaymin (20e-21e s.).\n" +
    "  V4 — 9 champs obligatoires. { premier. } dernier. ZERO backtick.\n" +
    "  Zone 3 — 7 paragraphes avec sous-titres HTML ✹.\n" +
    "  mutabaat — Mutaba at + Shawahid + Verdict de renfort OBLIGATOIRES.\n";

  try {
    let rawText = "", chunkCount = 0;
    const stream = client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,   // ← réduit : prévient timeout Vercel 60s
      system: SYSTEM_TAKHRIJ,
      messages: [{ role: "user", content: prompt }]
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.text) {
        const chunk = event.delta.text;
        rawText += chunk;
        chunkCount++;
        if (wantSSE && chunkCount % 5 === 0) sseChunk(res, idx, chunk);
      }
    }
    if (wantSSE && chunkCount % 5 !== 0) sseChunk(res, idx, " ");

    console.log("HADITH[" + idx + "]_LEN:", rawText.length, "| CHUNKS:", chunkCount);

    let parsed = extractJSON(rawText);
    if (Array.isArray(parsed)) parsed = parsed[0] || null;
    console.log("HADITH[" + idx + "]_PARSE:", parsed ? "OK" : "ECHEC");

    // ── GARDE-FOU GRADE_INVERSION + CAS A/B/C/D ──────────────────────────────
    if (parsed && r.grade) {
      const cls    = classifyGrade(r.grade);
      const expl   = (parsed.grade_explique || "").toLowerCase();
      const aiGood = /\bsahih\b|\bhasan\b|#2ecc71|#f39c12/.test(expl);
      const aiBad  = /\bda.if\b|mawdu|munkar|#e74c3c|#8e44ad/.test(expl);

      // Cas A : Da'if → Sahih (inversion)
      if (cls.isWeak && aiGood && !aiBad) {
        const n = cls.isMawdu ? "Mawdu'" : cls.isDaifJid ? "Da'if Jiddan" : "Da'if";
        console.log("HADITH[" + idx + "]_GRADE_INVERSION (" + n + "→Sahih) — corrige");
        parsed.grade_explique = DEFAULTS.grade_explique;
      }
      // Cas B : Sahih → Da'if (inversion inverse)
      if (cls.isStrong && aiBad && !aiGood) {
        console.log("HADITH[" + idx + "]_GRADE_INVERSION (Sahih→Da'if) — corrige");
        parsed.grade_explique = DEFAULTS.grade_explique;
      }
      // Cas C : phrase complexe sans badge (Da'if non détecté par l'IA)
      if (cls.isWeak && !aiBad && !aiGood) {
        const coul = cls.isMawdu ? "#8e44ad" : "#e74c3c";
        const lbl  = cls.isMawdu ? "REJET\u00c9 \u2014 CE N'EST PAS UN HADITH (MAWDU')"
                   : cls.isDaifJid ? "DA'IF JIDDAN \u2014 TR\u00c8S FAIBLE" : "DA'IF \u2014 FAIBLE";
        console.log("HADITH[" + idx + "]_PHRASE_COMPLEXE (" + r.grade.substring(0, 35) + ") — badge force");
        parsed.grade_explique =
          "<span style='color:" + coul + ";font-weight:bold;'>" + lbl + "</span>" +
          " \u2014 " + (r.savant || "Muhaddith") + (r.source ? ", " + r.source : "") + ".<br>" +
          "Verdict Dorar.net : <em>" + r.grade + "</em>.<br>" +
          (parsed.grade_explique && parsed.grade_explique.length > 20 ? parsed.grade_explique : DEFAULTS.grade_explique);
      }
      // Cas D : grade non classé + IA sans badge → orange Al-Albani
      const gradeUnknown = !cls.isWeak && !cls.isStrong;
      if (gradeUnknown && !aiGood && !aiBad) {
        console.log("HADITH[" + idx + "]_GRADE_INCONNU — badge orange force");
        parsed.grade_explique =
          "<span style='color:#f59e0b;font-weight:bold;'>VERDICT EN COURS DE V\u00c9RIFICATION \u2014 Consulter Al-Albani</span>" +
          " \u2014 " + (r.savant || "Muhaddith") + (r.source ? ", " + r.source : "") + ".<br>" +
          "Verdict Dorar.net : <em>" + r.grade + "</em>.<br>" +
          "Consultez la Silsilah Sahihah (SS) et Da\u2019ifah (SD) du Cheikh al-Alb\u0101ni (rahimahullah).";
      }
    }
    return parsed;
  } catch (e) {
    console.log("HADITH[" + idx + "]_ERR:", e.message);
    return null;
  }
  // ⛔️ FIN DU SANCTUAIRE
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// Séquence SSE : INITIALISATION → DORAR → dorar(metadata) → TAKHRIJ →
//   RIJAL → [chunks LLM] → JARH → HUKM → hadith(enrichi) → done: {}
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(200).end();

  const q = req.body?.q || req.query?.q;
  if (!q) return res.status(400).json({ error: "Requete vide" });
  console.log("DEBUT v14 — q:", q);

  const wantSSE = (req.headers.accept || "").includes("text/event-stream");
  if (wantSSE) {
    res.setHeader("Content-Type",      "text/event-stream; charset=utf-8");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Cache-Control",     "no-cache, no-transform");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("Transfer-Encoding", "chunked");
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    sseStatus(res, "INITIALISATION");
  }

  try {
    // ÉTAPE 1 : TRADUCTION FR→AR
    const arabicQuery = await _translateQueryToArabic(q);
    console.log("ARABIC_QUERY:", arabicQuery);
    if (wantSSE) sseStatus(res, "DORAR");

    // ÉTAPE 2 : DORAR.NET
    const dorarResp = await fetchWithTimeout(
      "https://dorar.net/dorar_api.json?skey=" + encodeURIComponent(arabicQuery),
      { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://dorar.net/" } },
      9000
    );
    if (!dorarResp.ok) throw new Error("Dorar HTTP " + dorarResp.status);

    const dorarData = await dorarResp.json();
    const html = dorarData?.ahadith?.result || "";
    console.log("HTML_LEN:", html.length, "| PREVIEW:", html.substring(0, 120));

    if (!html || html.length < 10) {
      console.log("DORAR_EMPTY");
      if (wantSSE) { res.write("event: done\ndata: {}\n\n"); if (typeof res.flush === "function") res.flush(); res.end(); return; }
      return res.status(200).json([]);
    }

    // ÉTAPE 3 : PARSE ROBUSTE (3 stratégies)
    const results = parseHadiths(html);
    if (!results.length) {
      console.log("PARSE_EMPTY — HTML snippet:", html.substring(0, 300));
      if (wantSSE) { res.write("event: done\ndata: {}\n\n"); if (typeof res.flush === "function") res.flush(); res.end(); return; }
      return res.status(200).json([]);
    }

    if (wantSSE) {
      sseWrite(res, "dorar", results);   // métadonnées immédiates → badges instantanés
      sseStatus(res, "TAKHRIJ");
    }

    // ÉTAPE 4 : ANALYSE IA — SÉQUENTIELLE (MAX=1)
    if (wantSSE) {
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        sseStatus(res, "RIJAL");
        const parsed = await analyserUnHadith(r, i, q, res, wantSSE);
        sseStatus(res, "JARH");
        const a = parsed || {};
        r.french_text      = safeField(a.french_text,      "french_text");
        r.grade_explique   = safeField(a.grade_explique,   "grade_explique");
        r.isnad_chain      = safeField(a.isnad_chain,      "isnad_chain");
        r.jarh_tadil       = safeField(a.jarh_tadil,       "jarh_tadil");
        r.sanad_conditions = safeField(a.sanad_conditions, "sanad_conditions");
        r.mutabaat         = safeField(a.mutabaat,         "mutabaat");
        r.avis_savants     = safeField(a.avis_savants,     "avis_savants");
        r.grille_albani    = safeField(a.grille_albani,    "grille_albani");
        r.pertinence       = safeField(a.pertinence,       "pertinence");
        sseStatus(res, "HUKM");
        sseWrite(res, "hadith", { index: i, data: r });
        console.log("SSE_HADITH[" + i + "] isnad:", r.isnad_chain.length,
          "fr:", r.french_text.length, "mutabaat:", r.mutabaat.length);
      }
      // Signal de fin propre → déclenche auto-hide frontend
      res.write("event: done\ndata: {}\n\n");
      if (typeof res.flush === "function") res.flush();
      res.end();

    } else {
      const analyses = await Promise.all(results.map((r, i) => analyserUnHadith(r, i, q, null, false)));
      results.forEach((r, i) => {
        const a = analyses[i] || {};
        r.french_text      = safeField(a.french_text,      "french_text");
        r.grade_explique   = safeField(a.grade_explique,   "grade_explique");
        r.isnad_chain      = safeField(a.isnad_chain,      "isnad_chain");
        r.jarh_tadil       = safeField(a.jarh_tadil,       "jarh_tadil");
        r.sanad_conditions = safeField(a.sanad_conditions, "sanad_conditions");
        r.mutabaat         = safeField(a.mutabaat,         "mutabaat");
        r.avis_savants     = safeField(a.avis_savants,     "avis_savants");
        r.grille_albani    = safeField(a.grille_albani,    "grille_albani");
        r.pertinence       = safeField(a.pertinence,       "pertinence");
      });
      return res.status(200).json(results);
    }

  } catch (error) {
    console.log("ERROR:", error.message);
    if (wantSSE) { sseWrite(res, "error", { message: error.message }); res.end(); }
    else return res.status(500).json({ error: error.message });
  }
};
