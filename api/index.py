"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          MÎZÂN AS-SUNNAH — api/index.py — Version 23.0                      ║
║          « Silsila al-Kâmila » — La Chaîne Complète                         ║
║          14 Siècles de Science du Hadith                                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Pipeline de Takhrîj :                                                       ║
║    ① Réception requête (FR ou AR)                                            ║
║    ② Détection langue → traduction FR→AR via Claude Haiku                   ║
║    ③ Appel API officielle Dorar.net                                          ║
║    ④ Parsing HTML lxml → extraction matn + métadonnées                      ║
║    ⑤ Tentative d'extraction silsila complète (page de détail)               ║
║    ⑥ Reconstruction silsila (chaîne de transmission complète)               ║
║    ⑦ Application stricte du Lexique de Fer (terminologie légiférée)         ║
║    ⑧ Enrichissement métadonnées + traduction FR                             ║
║    ⑨ Réponse JSON structurée vers le frontend Al Mizân                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Sources du Lexique de Fer :                                                 ║
║    - An-Nihâyah fî Gharîb al-Hadîth wa al-Athar (Ibn al-Athîr)             ║
║    - Taysîr Mustalah al-Hadîth (Dr. Mahmûd al-Tahhân)                      ║
║    - Al-Bâ'ith al-Hathîth (Ahmad Shâkir sur Ibn Kathîr)                    ║
║    - Minhaj al-Naqd (Dr. Nûr al-Dîn 'Itr)                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import unicodedata
from http.server import BaseHTTPRequestHandler
from typing import Any
from urllib.parse import urlparse

import httpx
from lxml import html as lxml_html

# ─────────────────────────────────────────────────────────────────────────────
#  LOGGING
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[Mîzân %(levelname)s] %(message)s",
)
log = logging.getLogger("mizan")

# ─────────────────────────────────────────────────────────────────────────────
#  CONSTANTES
# ─────────────────────────────────────────────────────────────────────────────
VERSION           = "23.0"
DORAR_API_URL     = "https://dorar.net/dorar_api.json"
DORAR_BASE_URL    = "https://dorar.net"
ANTHROPIC_URL     = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL   = "claude-haiku-4-5-20251001"
MAX_RESULTS       = 5   # Limite qualitative — mieux vaut 5 résultats complets
DETAIL_TIMEOUT    = 8.0 # Timeout pour la page de détail silsila
DORAR_TIMEOUT     = 15.0


# ═════════════════════════════════════════════════════════════════════════════
#  LEXIQUE DE FER ── Dictionnaire de préservation des termes légiférés
#
#  RÈGLE ABSOLUE : Ces traductions sont FIGÉES. L'IA ne peut jamais les
#  modifier, atténuer, ni paraphraser. Elles sont extraites de :
#    - An-Nihâyah fî Gharîb al-Hadîth (Ibn al-Athîr, m. 606H)
#    - Lisân al-ʿArab (Ibn Manzûr, m. 711H)
#    - Taysîr Mustalah al-Hadîth (Dr. Mahmûd al-Tahhân)
# ═════════════════════════════════════════════════════════════════════════════

# ── Grades hadith ── Mustalah al-Hadîth ──────────────────────────────────────
LEXIQUE_GRADES: dict[str, dict[str, str]] = {
    # Acceptés ─────────────────────────────────────────────────────────────
    "صحيح":                 {"fr": "Sahîh",             "label": "AUTHENTIQUE",            "level": "accepted",   "color": "#22c55e"},
    "صحيح لغيره":           {"fr": "Sahîh li ghayrihi", "label": "AUTHENTIQUE PAR RENFORT", "level": "accepted",   "color": "#16a34a"},
    "حسن":                  {"fr": "Hasan",              "label": "BON",                    "level": "accepted",   "color": "#84cc16"},
    "حسن لغيره":            {"fr": "Hasan li ghayrihi", "label": "BON PAR RENFORT",         "level": "accepted",   "color": "#65a30d"},
    "حسن صحيح":             {"fr": "Hasan Sahîh",        "label": "BON AUTHENTIQUE",        "level": "accepted",   "color": "#4ade80"},
    "مقبول":                {"fr": "Maqbûl",             "label": "ACCEPTÉ",                "level": "accepted",   "color": "#a3e635"},
    # Faibles ──────────────────────────────────────────────────────────────
    "ضعيف":                 {"fr": "Daʿîf",              "label": "FAIBLE",                 "level": "weak",       "color": "#f59e0b"},
    "ضعيف جداً":            {"fr": "Daʿîf Jiddan",       "label": "TRÈS FAIBLE",            "level": "weak",       "color": "#d97706"},
    "ضعيف جدا":             {"fr": "Daʿîf Jiddan",       "label": "TRÈS FAIBLE",            "level": "weak",       "color": "#d97706"},
    "لين":                  {"fr": "Layyin",             "label": "MOU (FAIBLE LÉGER)",     "level": "weak",       "color": "#fbbf24"},
    "لين الحديث":           {"fr": "Layyin al-Hadîth",   "label": "FAIBLE LÉGER",           "level": "weak",       "color": "#fbbf24"},
    "فيه ضعف":              {"fr": "Fîhi Daʿf",          "label": "FAIBLESSE EN LUI",       "level": "weak",       "color": "#f59e0b"},
    # Rejetés ──────────────────────────────────────────────────────────────
    "منكر":                 {"fr": "Munkar",             "label": "REJETÉ",                 "level": "rejected",   "color": "#ef4444"},
    "شاذ":                  {"fr": "Shâdhdh",            "label": "ISOLÉ ANORMAL",          "level": "rejected",   "color": "#f87171"},
    "معلول":                {"fr": "Maʿlûl",             "label": "VICIÉ CACHÉ",            "level": "rejected",   "color": "#dc2626"},
    "معل":                  {"fr": "Muʿall",             "label": "VICIÉ",                  "level": "rejected",   "color": "#dc2626"},
    "مرسل":                 {"fr": "Mursal",             "label": "AVEC RUPTURE",           "level": "rejected",   "color": "#f97316"},
    "مقطوع":                {"fr": "Maqtûʿ",             "label": "COUPÉ",                  "level": "rejected",   "color": "#fb923c"},
    "معضل":                 {"fr": "Muʿdal",             "label": "DOUBLE RUPTURE",         "level": "rejected",   "color": "#f87171"},
    "منقطع":                {"fr": "Munqatiʿ",           "label": "INTERROMPU",             "level": "rejected",   "color": "#fca5a5"},
    "مدلس":                 {"fr": "Mudallis",           "label": "DISSIMULÉ",              "level": "rejected",   "color": "#fb7185"},
    "مضطرب":                {"fr": "Mudtarib",           "label": "CONTRADICTOIRE",         "level": "rejected",   "color": "#f87171"},
    "مدرج":                 {"fr": "Mudroj",             "label": "INTERPOLÉ",              "level": "rejected",   "color": "#fca5a5"},
    # Fabriqués ────────────────────────────────────────────────────────────
    "موضوع":                {"fr": "Mawdûʿ",             "label": "FABRIQUÉ",               "level": "fabricated", "color": "#7f1d1d"},
    "مكذوب":                {"fr": "Makdhûb",            "label": "MENSONGER",              "level": "fabricated", "color": "#991b1b"},
    "لا أصل له":            {"fr": "Lâ asl lahu",        "label": "SANS FONDEMENT",         "level": "fabricated", "color": "#7f1d1d"},
    "لا يصح":               {"fr": "Lâ yasihh",          "label": "NON AUTHENTIFIÉ",        "level": "fabricated", "color": "#991b1b"},
    "باطل":                 {"fr": "Bâtil",              "label": "INVALIDE",               "level": "fabricated", "color": "#7f1d1d"},
    "لا يثبت":              {"fr": "Lâ yathbut",         "label": "NON ÉTABLI",             "level": "fabricated", "color": "#7f1d1d"},
}

# ── Attributs d'Allah ── Protection absolue contre la déviation ──────────────
LEXIQUE_ATTRIBUTS: dict[str, str] = {
    "استوى على العرش":         "S'est établi sur le Trône (Istawâ ʿalâ al-ʿArsh)",
    "استوى":                   "S'est établi (Istawâ)",
    "يد الله":                 "La Main d'Allah (Yad Allâh)",
    "نزول":                    "La Descente (An-Nuzûl)",
    "ينزل":                    "Il Descend (Yanzil)",
    "وجه الله":                "Le Visage d'Allah (Wajh Allâh)",
    "قدم":                     "Le Pied (Al-Qadam)",
    "ساق":                     "Le Tibia (As-Sâq)",
    "عين الله":                "L'Œil d'Allah (ʿAyn Allâh)",
    "الرحمن على العرش استوى":  "Le Tout-Miséricordieux S'est établi sur le Trône",
}

# ── Mohaddith connus — Siècle hégirien de décès ───────────────────────────────
MOHADDITH_SIECLES: dict[str, str] = {
    # 2H
    "مالك":               "2H",  "الأوزاعي": "2H", "سفيان الثوري": "2H", "شعبة": "2H",
    # 3H — L'Âge d'or du Hadith
    "البخاري":            "3H",  "مسلم":      "3H", "أبو داود":    "3H", "الترمذي":     "3H",
    "النسائي":            "3H",  "ابن ماجه":  "3H", "أحمد":        "3H", "الدارمي":     "3H",
    "ابن أبي شيبة":       "3H",  "إسحاق":     "3H", "ابن حنبل":    "3H",
    # 4H
    "الطبراني":           "4H",  "ابن خزيمة": "4H", "الحاكم":      "4H", "أبو يعلى":    "4H",
    "البزار":             "4H",  "الدارقطني": "4H", "ابن حبان":    "4H",
    # 5H
    "البيهقي":            "5H",  "الخطيب البغدادي": "5H",
    # 6-9H
    "ابن الجوزي":         "6H",  "ابن القيسراني": "6H",
    "الذهبي":             "8H",  "ابن كثير":  "8H",
    "ابن حجر":            "9H",  "السيوطي":   "9H", "العراقي":     "9H",
    # 14H (modernes)
    "الألباني":           "14H", "ابن باز":   "14H", "ابن عثيمين": "14H",
    "الوادعي":            "14H", "مقبل":      "14H",
}

# ── Sahabas connus — Pour classification silsila ─────────────────────────────
SAHABAS_CONNUS: set[str] = {
    "أبو هريرة", "عائشة", "ابن عمر", "عبد الله بن عمر",
    "ابن عباس", "عبد الله بن عباس", "أنس بن مالك", "أنس",
    "جابر", "جابر بن عبد الله", "أبو سعيد الخدري", "أبو سعيد",
    "أبو موسى الأشعري", "أبو موسى", "معاذ بن جبل", "معاذ",
    "عمر بن الخطاب", "عمر", "علي بن أبي طالب", "علي",
    "عثمان بن عفان", "عثمان", "أبو بكر الصديق", "أبو بكر",
    "عبد الله بن عمرو", "سهل بن سعد", "البراء بن عازب",
    "النعمان بن بشير", "واثلة بن الأسقع", "أبو أمامة",
    "معاوية بن أبي سفيان", "معاوية", "سلمان الفارسي",
    "أبو ذر الغفاري", "أبو ذر", "بلال بن رباح", "بلال",
    "عبد الله بن مسعود", "ابن مسعود", "أبو الدرداء",
    "ثوبان", "أبو هريرة الدوسي", "رافع بن خديج",
}

# ── Translittérations canoniques ─────────────────────────────────────────────
TRANSLITTERATIONS: dict[str, str] = {
    "أبو هريرة":    "Abû Hurayra (رضي الله عنه)",
    "عائشة":        "Âʿisha bint Abî Bakr (رضي الله عنها)",
    "ابن عمر":      "Ibn ʿUmar (رضي الله عنهما)",
    "ابن عباس":     "Ibn ʿAbbâs (رضي الله عنهما)",
    "أنس بن مالك":  "Anas ibn Mâlik (رضي الله عنه)",
    "أنس":          "Anas ibn Mâlik (رضي الله عنه)",
    "جابر":         "Jâbir ibn ʿAbd Allâh (رضي الله عنهما)",
    "أبو سعيد":     "Abû Saʿîd al-Khudrî (رضي الله عنه)",
    "البخاري":      "Al-Bukhârî رحمه الله (m. 256H)",
    "مسلم":         "Muslim ibn al-Hajjâj رحمه الله (m. 261H)",
    "الترمذي":      "At-Tirmidhî رحمه الله (m. 279H)",
    "أبو داود":     "Abû Dâwûd رحمه الله (m. 275H)",
    "النسائي":      "An-Nasâʾî رحمه الله (m. 303H)",
    "ابن ماجه":     "Ibn Mâja رحمه الله (m. 273H)",
    "أحمد":         "Ahmad ibn Hanbal رحمه الله (m. 241H)",
    "الحاكم":       "Al-Hâkim رحمه الله (m. 405H)",
    "الطبراني":     "At-Tabarânî رحمه الله (m. 360H)",
    "البيهقي":      "Al-Bayhaqî رحمه الله (m. 458H)",
    "الألباني":     "Cheikh Al-Albânî رحمه الله (m. 1420H)",
    "ابن باز":      "Cheikh Ibn Bâz رحمه الله (m. 1420H)",
    "ابن حجر":      "Ibn Hajar al-ʿAsqalânî رحمه الله (m. 852H)",
    "الذهبي":       "Adh-Dhahabî رحمه الله (m. 748H)",
    "ابن الجوزي":   "Ibn al-Jawzî رحمه الله (m. 597H)",
    "ابن كثير":     "Ibn Kathîr رحمه الله (m. 774H)",
    "السيوطي":      "As-Suyûtî رحمه الله (m. 911H)",
    "الدارقطني":    "Ad-Dâraqutnî رحمه الله (m. 385H)",
    "ابن حبان":     "Ibn Hibbân رحمه الله (m. 354H)",
}


# ═════════════════════════════════════════════════════════════════════════════
#  ① UTILITAIRES DE NETTOYAGE & NORMALISATION
# ═════════════════════════════════════════════════════════════════════════════

def _strip_tashkil(text: str) -> str:
    """Supprime les diacritiques arabes (tashkil) pour la comparaison."""
    # Plage : U+0610–U+061A, U+064B–U+065F, U+0670 (superscript alif)
    return re.sub(r"[\u0610-\u061a\u064b-\u065f\u0670]", "", text)


def _normalize_ar(text: str) -> str:
    """
    Normalise un texte arabe :
    — NFC Unicode
    — Formes d'Alif unifiées (أ إ آ → ا)
    — Suppression tashkil
    — Espaces normalisés
    """
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    text = _strip_tashkil(text)
    text = re.sub(r"[أإآ]", "ا", text)
    text = re.sub(r"[ىي]", "ي", text)  # Alif maqsura = ya
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _clean_name(raw: str) -> str:
    """
    Purifie un nom de narrateur extrait du HTML :
    — Supprime balises HTML résiduelles
    — Supprime préfixes de transmission (عن، حدثنا، أخبرنا...)
    — Supprime caractères parasites
    — Normalise les espaces
    """
    if not raw:
        return ""
    # Supprimer les balises HTML
    raw = re.sub(r"<[^>]+>", "", raw)
    # Supprimer les préfixes de transmission Hadith
    raw = re.sub(
        r"^(عن|حدثنا|حدّثنا|أخبرنا|أخبرني|أنبأنا|أنبأني|قال|روى|سمعت|ثنا|نا)\s+",
        "", raw.strip()
    )
    # Supprimer numéros, crochets, parenthèses parasites
    raw = re.sub(r"[\[\](){}\\/|0-9]", "", raw)
    # Nettoyer les espaces
    raw = re.sub(r"\s+", " ", raw).strip()
    return raw


def _extract_rijal_id(href: str) -> str | None:
    """Extrait l'identifiant Dorar d'un narrateur depuis son URL."""
    if not href:
        return None
    m = re.search(r"/rijal/([^/?#\s]+)", href)
    return m.group(1) if m else None


def _deduplicate_chain(chain: list[dict]) -> list[dict]:
    """
    Déduplique les nœuds de la silsila.
    Deux nœuds sont identiques si leur ar_name normalisé est le même.
    Conserve le premier nœud trouvé (le plus complet).
    """
    seen: set[str] = set()
    result: list[dict] = []
    for node in chain:
        key = _normalize_ar(node.get("ar_name", ""))
        # Les nœuds sans nom (ex. nœuds génériques inférés) ont une clé vide
        # → on les garde uniquement s'il n'y a pas déjà un nœud générique du même rôle
        role_key = f"__role__{node.get('role', '')}__century__{node.get('century', '')}"
        effective_key = key if key else role_key
        if effective_key not in seen:
            seen.add(effective_key)
            result.append(node)
    return result


def _is_arabic(text: str) -> bool:
    """Retourne True si le texte contient majoritairement des caractères arabes."""
    if not text:
        return False
    arabic_chars = sum(1 for c in text if "\u0600" <= c <= "\u06FF")
    return arabic_chars > len(text.strip()) * 0.25


# ═════════════════════════════════════════════════════════════════════════════
#  ② APPLICATION DU LEXIQUE DE FER
# ═════════════════════════════════════════════════════════════════════════════

def _apply_grade(hukm_raw: str) -> dict[str, Any]:
    """
    Applique le Lexique de Fer au grade brut retourné par Dorar.

    Priorité de matching :
      1. Correspondance exacte (après normalisation)
      2. Correspondance partielle (le grade connu est dans le texte)
      3. Correspondance partielle normalisée
      4. Fallback : texte brut conservé, level=unknown

    Retourne un dict enrichi {fr, label, level, color, raw}.
    """
    if not hukm_raw:
        return {"fr": "", "label": "—", "level": "unknown", "color": "#6b7280", "raw": ""}

    hukm_clean = hukm_raw.strip()
    norm_input = _normalize_ar(hukm_clean)

    # 1. Exact
    for ar_key, data in LEXIQUE_GRADES.items():
        if _normalize_ar(ar_key) == norm_input:
            return {**data, "raw": hukm_clean}

    # 2. Partiel direct
    for ar_key, data in LEXIQUE_GRADES.items():
        if ar_key in hukm_clean:
            return {**data, "raw": hukm_clean}

    # 3. Partiel normalisé
    for ar_key, data in LEXIQUE_GRADES.items():
        if _normalize_ar(ar_key) in norm_input:
            return {**data, "raw": hukm_clean}

    # 4. Fallback
    return {
        "fr":    hukm_clean,
        "label": hukm_clean,
        "level": "unknown",
        "color": "#6b7280",
        "raw":   hukm_clean,
    }


def _detect_lexique_attributs(ar_text: str) -> list[dict[str, str]]:
    """
    Détecte les attributs d'Allah dans le matn et retourne les termes protégés.
    Ne modifie JAMAIS le texte arabe — retourne uniquement la liste des termes détectés.
    """
    found: list[dict[str, str]] = []
    for ar_term, fr_protected in LEXIQUE_ATTRIBUTS.items():
        if ar_term in ar_text:
            found.append({"ar": ar_term, "fr": fr_protected})
    return found


# ═════════════════════════════════════════════════════════════════════════════
#  ③ PARSING HTML DORAR
# ═════════════════════════════════════════════════════════════════════════════

def _parse_dorar_html(raw_html: str) -> list[dict[str, Any]]:
    """
    Parse le HTML retourné par l'API Dorar.net.

    Structure HTML confirmée sur données réelles Dorar :
    ┌──────────────────────────────────────────────────────────────────────┐
    │  [bloc1] --- [bloc2] --- [bloc3] ...                                 │
    │  Chaque bloc :                                                        │
    │    <div class="hadith">          → Matn arabe                        │
    │    <div class="hadith-info">     → Métadonnées                       │
    │      <span class="info-subtitle">الراوي:</span>                       │
    │      <span class="info-subtitle">المحدث:</span>                      │
    │      <span class="info-subtitle">المصدر:</span>                      │
    │      <span class="info-subtitle">الصفحة أو الرقم:</span>             │
    │      <span class="info-subtitle">خلاصة حكم المحدث:</span>           │
    └──────────────────────────────────────────────────────────────────────┘

    Retourne une liste de dicts structurés, un par hadith trouvé.
    """
    results: list[dict[str, Any]] = []

    if not raw_html or not raw_html.strip():
        return results

    # Dorar sépare les hadiths par ' --- ' dans le HTML
    blocks = re.split(r"\s*---\s*", raw_html)
    log.info(f"Dorar HTML → {len(blocks)} bloc(s) brut(s)")

    for i, block_str in enumerate(blocks):
        block_str = block_str.strip()
        if not block_str or len(block_str) < 20:
            continue

        try:
            tree = lxml_html.fromstring(f"<div class='mz-wrapper'>{block_str}</div>")
        except Exception as exc:
            log.warning(f"Bloc {i} : erreur parsing lxml — {exc}")
            continue

        h: dict[str, Any] = {
            "ar_text":      "",
            "rawi":         "",
            "rawi_id":      None,
            "mohaddith":    "",
            "mohaddith_id": None,
            "source":       "",
            "source_url":   "",
            "page_num":     "",
            "hukm_raw":     "",
            "hukm":         {},
            "detail_url":   None,
            "rijal_links":  [],
        }

        # ── Matn : texte arabe du hadith ─────────────────────────────────
        # Chercher div.hadith en excluant div.hadith-info
        for el in tree.xpath('.//div[contains(@class,"hadith")]'):
            classes = el.get("class", "")
            if "hadith-info" in classes:
                continue
            text = el.text_content().strip()
            if text and len(text) > 15:
                h["ar_text"] = text
                break

        # Fallback : premier texte arabe substantiel de la page
        if not h["ar_text"]:
            full_text = tree.text_content().strip()
            # Prendre les 500 premiers caractères si arabe
            if _is_arabic(full_text[:100]):
                h["ar_text"] = full_text[:500]

        # ── Métadonnées via span.info-subtitle ───────────────────────────
        for label_el in tree.xpath('.//span[@class="info-subtitle"]'):
            label = label_el.text_content().strip()
            parent = label_el.getparent()
            if parent is None:
                continue

            # Texte du parent sans le label
            parent_text = parent.text_content().replace(label, "", 1).strip()
            # Liens /rijal/ dans le parent
            rij_links = parent.xpath('.//a[contains(@href,"/rijal/")]')

            if "الراوي" in label:
                h["rawi"] = _clean_name(parent_text)
                if rij_links:
                    h["rawi_id"] = _extract_rijal_id(rij_links[0].get("href", ""))
                    h["rijal_links"].append({
                        "name": _clean_name(rij_links[0].text_content()),
                        "id":   h["rawi_id"],
                        "role": "rawi",
                        "url":  DORAR_BASE_URL + rij_links[0].get("href", ""),
                    })

            elif "المحدث" in label:
                h["mohaddith"] = _clean_name(parent_text)
                if rij_links:
                    h["mohaddith_id"] = _extract_rijal_id(rij_links[0].get("href", ""))
                    h["rijal_links"].append({
                        "name": _clean_name(rij_links[0].text_content()),
                        "id":   h["mohaddith_id"],
                        "role": "mohaddith",
                        "url":  DORAR_BASE_URL + rij_links[0].get("href", ""),
                    })

            elif "المصدر" in label:
                h["source"] = _clean_name(parent_text)
                src_links = parent.xpath('.//a')
                if src_links:
                    href = src_links[0].get("href", "")
                    h["source_url"] = DORAR_BASE_URL + href if href.startswith("/") else href

            elif "الصفحة" in label or "الرقم" in label:
                h["page_num"] = parent_text.strip()

            elif "خلاصة حكم" in label or ("الحكم" in label and "خلاصة" in label):
                h["hukm_raw"] = parent_text.strip()
                h["hukm"]     = _apply_grade(parent_text.strip())

        # ── URL de la page de détail (pour extraction silsila complète) ──
        for link in tree.xpath('.//a[contains(@href,"/hadith/")]'):
            href = link.get("href", "")
            if href:
                h["detail_url"] = DORAR_BASE_URL + href if href.startswith("/") else href
                break

        # ── Validation minimale avant d'inclure dans les résultats ───────
        if h["ar_text"] or h["rawi"] or h["hukm_raw"]:
            results.append(h)
        else:
            log.debug(f"Bloc {i} ignoré (trop vide)")

    log.info(f"Hadiths parsés avec succès : {len(results)}")
    return results


# ═════════════════════════════════════════════════════════════════════════════
#  ④ RECONSTRUCTION DE LA SILSILA
# ═════════════════════════════════════════════════════════════════════════════

def _infer_rawi_role(name: str) -> str:
    """Infère si le rawi est un Sahabi à partir d'une liste de référence."""
    if not name:
        return "narrator"
    norm = _normalize_ar(name)
    for sahabi in SAHABAS_CONNUS:
        if _normalize_ar(sahabi) in norm or norm in _normalize_ar(sahabi):
            return "sahabi"
    return "narrator"


def _infer_mohaddith_century(name: str) -> str:
    """Infère le siècle hégirien d'un muhaddith selon son nom."""
    if not name:
        return ""
    norm = _normalize_ar(name)
    for key, century in MOHADDITH_SIECLES.items():
        if _normalize_ar(key) in norm:
            return century
    return ""


def _translitterate(ar_name: str) -> str:
    """
    Translittère un nom arabe en français (translittération canonique salafiyya).
    Retourne le nom arabe brut si aucune translittération n'est disponible.
    """
    if not ar_name:
        return ""
    norm = _normalize_ar(ar_name)
    for ar_key, fr_val in TRANSLITTERATIONS.items():
        if _normalize_ar(ar_key) in norm or norm in _normalize_ar(ar_key):
            return fr_val
    return ar_name


def _build_silsila(
    hadith: dict[str, Any],
    detail_chain: list[dict] | None = None,
) -> list[dict[str, Any]]:
    """
    Reconstruit la silsila (chaîne de transmission) complète.

    Ordre de priorité des sources :
      ① detail_chain : nœuds extraits de la page de détail Dorar (exact + vérifié)
      ② rijal_links  : liens extraits du HTML de recherche
      ③ Inférence    : construction raisonnée depuis rawi + mohaddith

    Structure d'un nœud :
    {
        rank      : int       Position (1 = Prophète ﷺ)
        ar_name   : str       Nom arabe
        fr_name   : str       Translittération française
        role      : str       prophet | sahabi | tabii | ttt | muhaddith | narrator
        rawi_id   : str|None  Identifiant Dorar
        century   : str       Siècle hégirien
        verified  : bool      True = nom exact extrait de Dorar
    }
    """
    chain: list[dict[str, Any]] = []

    # ── Nœud 0 : Le Prophète Muhammad ﷺ ─────────────────────────────────────
    # Toujours présent — il est l'origine de toute transmission authentique
    chain.append({
        "rank":     1,
        "ar_name":  "النَّبِيُّ مُحَمَّد ﷺ",
        "fr_name":  "Le Prophète Muhammad ﷺ",
        "role":     "prophet",
        "rawi_id":  None,
        "century":  "1H",
        "verified": True,
    })

    # ── CAS 1 : Chaîne détaillée disponible (page de détail Dorar) ──────────
    if detail_chain and len(detail_chain) >= 1:
        for rank_offset, node in enumerate(detail_chain, start=2):
            chain.append({
                "rank":     rank_offset,
                "ar_name":  node.get("ar_name", ""),
                "fr_name":  node.get("fr_name", "") or _translitterate(node.get("ar_name", "")),
                "role":     node.get("role", "narrator"),
                "rawi_id":  node.get("rawi_id"),
                "century":  node.get("century", ""),
                "verified": True,
            })
        log.info(f"Silsila depuis page détail : {len(chain)} nœuds")
        return _deduplicate_chain(chain)

    # ── CAS 2 : Construction depuis rawi + mohaddith + inférence ────────────
    rawi_name      = hadith.get("rawi", "")
    mohaddith_name = hadith.get("mohaddith", "")
    rawi_id        = hadith.get("rawi_id")
    mohaddith_id   = hadith.get("mohaddith_id")

    # Nœud 1 : Rawi (premier narrateur humain)
    if rawi_name:
        rawi_role = _infer_rawi_role(rawi_name)
        chain.append({
            "rank":     2,
            "ar_name":  rawi_name,
            "fr_name":  _translitterate(rawi_name),
            "role":     rawi_role,
            "rawi_id":  rawi_id,
            "century":  "1H" if rawi_role == "sahabi" else "2H",
            "verified": True,
        })

    # Nœuds intermédiaires inférés selon l'écart temporel
    rawi_is_sahabi  = (_infer_rawi_role(rawi_name) == "sahabi")
    mohadd_century  = _infer_mohaddith_century(mohaddith_name)

    if rawi_is_sahabi:
        # Tabi'î : toujours présent entre un Sahabi et un compilateur du hadith
        chain.append({
            "rank":     len(chain) + 1,
            "ar_name":  "تَابِعِيّ",
            "fr_name":  "Tâbiʿî — Génération des Suivants (2ème siècle H)",
            "role":     "tabii",
            "rawi_id":  None,
            "century":  "2H",
            "verified": False,  # Nœud INFÉRÉ — nom exact non extrait
        })

        # Tabi' al-Tabi'in : nécessaire si le mohaddith vit au 3ème siècle ou plus
        if mohadd_century not in ["1H", "2H"] or not mohadd_century:
            chain.append({
                "rank":     len(chain) + 1,
                "ar_name":  "تَابِعُ التَّابِعِيّ",
                "fr_name":  "Tâbiʿ al-Tâbiʿîn — 2ème génération des Suivants (3ème siècle H)",
                "role":     "ttt",
                "rawi_id":  None,
                "century":  "3H",
                "verified": False,
            })

    # Nœud final : Mohaddith authenticateur
    if mohaddith_name:
        chain.append({
            "rank":     len(chain) + 1,
            "ar_name":  mohaddith_name,
            "fr_name":  _translitterate(mohaddith_name),
            "role":     "muhaddith",
            "rawi_id":  mohaddith_id,
            "century":  mohadd_century,
            "verified": True,
        })

    log.info(f"Silsila inférée : {len(chain)} nœuds (rawi={rawi_name!r}, mohaddith={mohaddith_name!r})")
    return _deduplicate_chain(chain)


def _is_chain_complete(chain: list[dict]) -> bool:
    """
    Vérifie si la silsila est acceptable pour l'affichage :
    — Au moins 2 nœuds (Prophète + au moins un autre)
    — Au moins 2 nœuds vérifiés (extraits de Dorar, pas seulement inférés)
    """
    if len(chain) < 2:
        return False
    return sum(1 for n in chain if n.get("verified")) >= 2


# ═════════════════════════════════════════════════════════════════════════════
#  ⑤ EXTRACTION SILSILA DEPUIS PAGE DE DÉTAIL DORAR
# ═════════════════════════════════════════════════════════════════════════════

async def _fetch_detail_chain(
    client: httpx.AsyncClient,
    detail_url: str,
) -> list[dict[str, Any]]:
    """
    Tente d'extraire la silsila complète depuis la page de détail d'un hadith.

    La page de détail Dorar contient le sanad complet avec chaque narrateur
    lié à sa biographie (/rijal/ID), permettant une reconstruction exacte.

    Retourne une liste de nœuds ordonnés (du Rawi le plus proche du Prophète
    vers le Mohaddith compilateur).
    Retourne [] si la page est inaccessible ou si aucun lien rijal n'est trouvé.
    """
    chain: list[dict[str, Any]] = []
    if not detail_url:
        return chain

    try:
        resp = await client.get(
            detail_url,
            headers={"User-Agent": "Mozilla/5.0 (AlMizan/23.0 Science du Hadith)"},
            timeout=DETAIL_TIMEOUT,
            follow_redirects=True,
        )
        if resp.status_code != 200:
            log.warning(f"Détail {detail_url} → HTTP {resp.status_code}")
            return chain

        tree = lxml_html.fromstring(resp.text)

        # ── Chercher le bloc sanad/isnad dans la page ─────────────────────
        # Dorar affiche le sanad dans un bloc structuré avec liens /rijal/
        narrator_links: list = []

        # Tentative sur plusieurs sélecteurs selon la structure Dorar
        for selector in [
            './/div[contains(@class,"sanad")]//a[contains(@href,"/rijal/")]',
            './/div[contains(@class,"isnad")]//a[contains(@href,"/rijal/")]',
            './/div[@id="sanad"]//a[contains(@href,"/rijal/")]',
            './/span[contains(@class,"sanad")]//a[contains(@href,"/rijal/")]',
            './/p[contains(@class,"sanad")]//a[contains(@href,"/rijal/")]',
        ]:
            links = tree.xpath(selector)
            if links:
                narrator_links = links
                log.info(f"Sanad trouvé via sélecteur : {selector}")
                break

        # Fallback global : tous les liens /rijal/ de la page (hors nav)
        if not narrator_links:
            narrator_links = tree.xpath(
                './/div[not(contains(@class,"navbar")) and not(contains(@class,"menu"))]'
                '//a[contains(@href,"/rijal/")]'
            )
            if narrator_links:
                log.info(f"Silsila via fallback global : {len(narrator_links)} liens rijal")

        # ── Construire les nœuds depuis les liens narrateurs ──────────────
        seen_ids: set[str] = set()
        for link in narrator_links:
            href  = link.get("href", "")
            rid   = _extract_rijal_id(href)
            name  = _clean_name(link.text_content())

            if not name:
                continue
            if rid and rid in seen_ids:
                continue  # Déduplique par ID
            if rid:
                seen_ids.add(rid)

            chain.append({
                "ar_name":  name,
                "fr_name":  _translitterate(name),
                "role":     "narrator",
                "rawi_id":  rid,
                "century":  _infer_mohaddith_century(name),
                "verified": True,
            })

        log.info(f"Silsila extraite depuis détail : {len(chain)} nœuds")

    except httpx.TimeoutException:
        log.warning(f"Timeout page détail : {detail_url}")
    except Exception as exc:
        log.warning(f"Erreur extraction silsila détail : {exc}")

    return chain


# ═════════════════════════════════════════════════════════════════════════════
#  ⑥ TRADUCTION FR→AR VIA CLAUDE HAIKU
# ═════════════════════════════════════════════════════════════════════════════

async def _translate_query_to_arabic(
    client: httpx.AsyncClient,
    french_query: str,
    api_key: str,
) -> str:
    """
    Traduit une requête française en arabe classique via Claude Haiku.

    Prompt strictement limité à la traduction de la requête de recherche.
    L'IA ne génère JAMAIS de texte hadith — uniquement la requête de recherche.
    """
    if not api_key:
        log.warning("ANTHROPIC_API_KEY manquante — traduction ignorée")
        return french_query

    prompt = (
        "Tu es un traducteur spécialisé en arabe classique (fusha) pour "
        "la recherche de hadiths dans une base de données islamique. "
        "Traduis UNIQUEMENT la requête suivante en arabe — sans explication, "
        "sans ponctuation superflue, sans introduction. "
        "Retourne UNIQUEMENT les mots arabes.\n\n"
        f"Requête : {french_query}"
    )

    try:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key":         api_key,
                "anthropic-version": "2023-06-01",
                "content-type":      "application/json",
            },
            json={
                "model":      ANTHROPIC_MODEL,
                "max_tokens": 150,
                "messages":   [{"role": "user", "content": prompt}],
            },
            timeout=10.0,
        )
        if resp.status_code == 200:
            translated = resp.json().get("content", [{}])[0].get("text", "").strip()
            log.info(f"Traduction FR→AR : «{french_query}» → «{translated}»")
            return translated or french_query
        else:
            log.warning(f"Anthropic API {resp.status_code} — texte original conservé")
    except Exception as exc:
        log.warning(f"Erreur traduction : {exc}")

    return french_query


# ═════════════════════════════════════════════════════════════════════════════
#  ⑦ TRADUCTION FR DES MÉTADONNÉES VIA CLAUDE HAIKU
# ═════════════════════════════════════════════════════════════════════════════

async def _translate_metadata(
    client: httpx.AsyncClient,
    hadith: dict[str, Any],
    api_key: str,
) -> str:
    """
    Génère une traduction française des MÉTADONNÉES du hadith uniquement.

    INTERDIT : traduire le matn (texte du hadith) — risque de dénaturation.
    OBLIGATOIRE : appliquer le Lexique de Fer aux attributs d'Allah.
    """
    if not api_key:
        return ""

    # Construire la liste des métadonnées à traduire
    meta_lines: list[str] = []
    if hadith.get("rawi"):
        meta_lines.append(f"الراوي: {hadith['rawi']}")
    if hadith.get("mohaddith"):
        meta_lines.append(f"المحدث: {hadith['mohaddith']}")
    if hadith.get("source"):
        meta_lines.append(f"المصدر: {hadith['source']}")
    if hadith.get("page_num"):
        meta_lines.append(f"الصفحة أو الرقم: {hadith['page_num']}")

    if not meta_lines:
        return ""

    lexique_rules = "\n".join(
        f"- {ar} = {fr}" for ar, fr in list(LEXIQUE_ATTRIBUTS.items())[:6]
    )

    prompt = (
        "Tu es un traducteur islamique suivant strictement la méthodologie salafiyya.\n"
        "Traduis ces métadonnées de hadith en français académique clair.\n\n"
        "LEXIQUE DE FER — RÈGLES ABSOLUES (ne jamais dévier) :\n"
        f"{lexique_rules}\n\n"
        "INTERDIT : générer ou modifier le texte du hadith.\n"
        "INTERDIT : utiliser 'pouvoir', 'autorité', 'présence', 'manifestation' "
        "pour les attributs d'Allah.\n\n"
        "Métadonnées à traduire :\n"
        + "\n".join(meta_lines)
    )

    try:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key":         api_key,
                "anthropic-version": "2023-06-01",
                "content-type":      "application/json",
            },
            json={
                "model":      ANTHROPIC_MODEL,
                "max_tokens": 400,
                "messages":   [{"role": "user", "content": prompt}],
            },
            timeout=12.0,
        )
        if resp.status_code == 200:
            return resp.json().get("content", [{}])[0].get("text", "").strip()
        else:
            log.warning(f"Traduction métadonnées : HTTP {resp.status_code}")
    except Exception as exc:
        log.warning(f"Erreur traduction métadonnées : {exc}")

    return ""


# ═════════════════════════════════════════════════════════════════════════════
#  ⑧ MOTEUR PRINCIPAL — PIPELINE TAKHRÎJ
# ═════════════════════════════════════════════════════════════════════════════

async def _run_takhrij(query: str) -> dict[str, Any]:
    """
    Pipeline complet du Takhrîj :

    [1] Détection langue → traduction FR→AR si nécessaire
    [2] Appel API Dorar.net avec httpx.AsyncClient
    [3] Parsing JSON → extraction du HTML brut
    [4] Parsing HTML lxml → liste des hadiths bruts
    [5] Pour chaque hadith (max 5) :
        a. Tentative extraction silsila depuis page de détail
        b. Reconstruction silsila complète
        c. Application Lexique de Fer sur le grade
        d. Traduction métadonnées FR via Claude Haiku
        e. Détection attributs d'Allah dans le matn
        f. Construction résultat JSON structuré
    [6] Retour réponse finale enrichie
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(25.0, connect=5.0),
        headers={
            "User-Agent": "Mozilla/5.0 (AlMizan/23.0; dorar.net research)",
            "Accept":     "application/json, text/html;q=0.9",
        },
        follow_redirects=True,
    ) as client:

        # ── [1] Traduction FR→AR ─────────────────────────────────────────────
        query_original = query.strip()
        query_ar = query_original

        if query_ar and not _is_arabic(query_ar):
            query_ar = await _translate_query_to_arabic(client, query_ar, api_key)

        if not query_ar:
            return _err("Requête vide après normalisation")

        # ── [2] Appel API Dorar.net ──────────────────────────────────────────
        log.info(f"Requête Dorar : «{query_ar}»")
        try:
            dorar_resp = await client.get(
                DORAR_API_URL,
                params={"skey": query_ar, "type": "1"},
                timeout=DORAR_TIMEOUT,
            )
        except httpx.TimeoutException:
            return _err("Dorar.net : timeout — réessayez dans quelques instants")
        except httpx.ConnectError as exc:
            return _err(f"Dorar.net inaccessible : {exc}")
        except Exception as exc:
            return _err(f"Erreur connexion Dorar : {exc}")

        if dorar_resp.status_code != 200:
            return _err(f"API Dorar a retourné HTTP {dorar_resp.status_code}")

        # ── [3] Parsing JSON ─────────────────────────────────────────────────
        try:
            dorar_data = dorar_resp.json()
        except Exception:
            return _err("Réponse Dorar non-JSON — structure inattendue")

        # Structure confirmée : {"ahadith": {"result": "HTML_BRUT"}}
        raw_html = dorar_data.get("ahadith", {}).get("result", "")

        if not raw_html or not raw_html.strip():
            return {
                "status":       "not_found",
                "message":      "Aucun hadith trouvé dans la base Dorar pour cette requête.",
                "query_ar":     query_ar,
                "query_orig":   query_original,
                "results":      [],
                "total":        0,
                "version":      VERSION,
            }

        # ── [4] Parsing HTML ─────────────────────────────────────────────────
        hadiths_bruts = _parse_dorar_html(raw_html)

        if not hadiths_bruts:
            return _err("Parsing HTML Dorar : aucun hadith extrait (structure inattendue)")

        # ── [5] Enrichissement de chaque hadith ─────────────────────────────
        results: list[dict[str, Any]] = []

        for hadith in hadiths_bruts[:MAX_RESULTS]:

            # [5a] Tentative extraction silsila depuis page de détail
            detail_chain: list[dict] = []
            if hadith.get("detail_url"):
                detail_chain = await _fetch_detail_chain(client, hadith["detail_url"])

            # [5b] Reconstruction silsila
            chain = _build_silsila(hadith, detail_chain or None)

            # [5c] Grade Lexique de Fer
            hukm = hadith.get("hukm") or _apply_grade(hadith.get("hukm_raw", ""))

            # [5d] Traduction métadonnées FR
            fr_meta = await _translate_metadata(client, hadith, api_key)

            # [5e] Détection attributs d'Allah dans le matn
            attributs_detectes = _detect_lexique_attributs(hadith.get("ar_text", ""))

            # [5f] Résultat structuré
            result = {
                # ── Texte arabe (matn) — JAMAIS modifié ni traduit ─────────
                "arabic_text": hadith.get("ar_text", ""),

                # ── Texte français = métadonnées uniquement ────────────────
                "french_text": fr_meta,

                # ── Silsila (chaîne de transmission) ──────────────────────
                "chain": chain,

                # ── Métadonnées structurées ────────────────────────────────
                "metadata": {
                    "rawi": {
                        "ar":    hadith.get("rawi", ""),
                        "fr":    _translitterate(hadith.get("rawi", "")),
                        "id":    hadith.get("rawi_id"),
                        "role":  _infer_rawi_role(hadith.get("rawi", "")),
                    },
                    "mohaddith": {
                        "ar":     hadith.get("mohaddith", ""),
                        "fr":     _translitterate(hadith.get("mohaddith", "")),
                        "id":     hadith.get("mohaddith_id"),
                        "century": _infer_mohaddith_century(hadith.get("mohaddith", "")),
                    },
                    "source": {
                        "ar":  hadith.get("source", ""),
                        "url": hadith.get("source_url", ""),
                    },
                    "page":         hadith.get("page_num", ""),
                    "detail_url":   hadith.get("detail_url"),
                    "hukm": {
                        "ar":    hadith.get("hukm_raw", ""),
                        "fr":    hukm.get("fr", ""),
                        "label": hukm.get("label", "—"),
                        "level": hukm.get("level", "unknown"),
                        "color": hukm.get("color", "#6b7280"),
                    },
                    # Qualité de la silsila
                    "chain_nodes":    len(chain),
                    "chain_verified": _is_chain_complete(chain),
                    "chain_has_inference": any(
                        not n.get("verified") for n in chain
                    ),
                    # Lexique de Fer — attributs d'Allah détectés dans le matn
                    "lexique_attributs": attributs_detectes,
                },
            }
            results.append(result)

        # ── [6] Réponse finale ───────────────────────────────────────────────
        return {
            "status":     "success",
            "query_ar":   query_ar,
            "query_orig": query_original,
            "results":    results,
            "total":      len(results),
            "version":    VERSION,
        }


def _err(msg: str) -> dict[str, Any]:
    """Construit une réponse d'erreur standardisée."""
    log.error(f"[Mîzân Erreur] {msg}")
    return {
        "status":  "error",
        "message": msg,
        "results": [],
        "total":   0,
        "version": VERSION,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  ⑨ HANDLER VERCEL — Serveur HTTP
# ═════════════════════════════════════════════════════════════════════════════

class handler(BaseHTTPRequestHandler):
    """
    Handler HTTP Vercel pour l'API Al Mizân.

    Routes :
      GET  /api/health  → Statut du service + version
      POST /api/        → Takhrîj hadith (JSON: {"query": "..."})
      OPTIONS *         → CORS preflight (réponse 204)
    """

    _CORS = {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age":       "86400",
    }

    # ── Envoi JSON ────────────────────────────────────────────────────────────
    def _json(self, data: dict, status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        for k, v in self._CORS.items():
            self.send_header(k, v)
        self.send_header("Content-Type",    "application/json; charset=utf-8")
        self.send_header("Content-Length",  str(len(body)))
        self.send_header("X-Mizan-Version", VERSION)
        self.end_headers()
        self.wfile.write(body)

    # ── OPTIONS — CORS preflight ──────────────────────────────────────────────
    def do_OPTIONS(self) -> None:
        self.send_response(204)
        for k, v in self._CORS.items():
            self.send_header(k, v)
        self.end_headers()

    # ── GET — Health check ────────────────────────────────────────────────────
    def do_GET(self) -> None:
        path = urlparse(self.path).path.rstrip("/")
        if path.endswith("health"):
            self._json({
                "status":   "ok",
                "version":  VERSION,
                "service":  "Mîzân as-Sunnah — Moteur de Takhrîj",
                "lexique":  f"{len(LEXIQUE_GRADES)} grades + {len(LEXIQUE_ATTRIBUTS)} attributs",
                "routes": {
                    "POST /api/":      "Takhrîj — corps JSON : {query: string}",
                    "GET  /api/health": "Ce healthcheck",
                },
            })
        else:
            self._json({"error": "Route inconnue", "version": VERSION}, status=404)

    # ── POST — Pipeline Takhrîj ───────────────────────────────────────────────
    def do_POST(self) -> None:
        # Lecture et décodage du corps
        try:
            length  = int(self.headers.get("Content-Length", 0))
            raw     = self.rfile.read(length) if length > 0 else b"{}"
            payload = json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, ValueError, UnicodeDecodeError) as exc:
            self._json({"error": f"JSON invalide : {exc}"}, status=400)
            return

        query = payload.get("query", "").strip()
        if not query:
            self._json(
                {"error": "Paramètre 'query' manquant ou vide", "version": VERSION},
                status=400,
            )
            return

        # Exécution du pipeline asynchrone dans un contexte synchrone Vercel
        try:
            result = asyncio.run(_run_takhrij(query))
            http_status = 200 if result.get("status") != "error" else 500
            self._json(result, status=http_status)
        except Exception as exc:
            log.exception("Erreur critique dans _run_takhrij")
            self._json(_err(f"Erreur interne : {exc}"), status=500)

    # ── Suppression des logs HTTP par défaut (trop verbeux en prod) ───────────
    def log_message(self, fmt: str, *args) -> None:
        log.info(fmt % args)
