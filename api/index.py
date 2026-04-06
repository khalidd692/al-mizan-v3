"""
api/index.py - MIZAN v22.9
Traduction hybride : Google Translate async (httpx) + Glossaire islamique légifèré
Verdicts Hadith protégés, scraping blindé, flux SSE complet avec debug et french_text
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import unicodedata
from typing import Any, AsyncGenerator

import httpx
from anthropic import AsyncAnthropic
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse


log = logging.getLogger("mizan.rawi")
logging.basicConfig(level=logging.INFO)

# =====================================================================
# CONSTANTES RÉSEAU
# =====================================================================

_BASE     = "https://dorar.net"
_RIJAL    = f"{_BASE}/rijal"
_SEARCH_R = f"{_RIJAL}/search"
_HADITH_S = f"{_BASE}/hadith/search"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept":          "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ar,fr;q=0.9,en;q=0.8",
    "Referer":         _BASE,
}

_TIMEOUT    = httpx.Timeout(25.0, connect=10.0)
_GT_TIMEOUT = httpx.Timeout(8.0,  connect=5.0)
_MAX_RETRY  = 3

CORS_HEADERS: dict[str, str] = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type, Cache-Control",
}

# =====================================================================
# GLOSSAIRES ISLAMIQUES LÉGIFÈRÉS
# =====================================================================

_HUKM_AR_FR: dict[str, str] = {
    "صحيح":                  "Authentique (Sahîh)",
    "صحيح لغيره":            "Authentique par ses témoins (Sahîh li-ghayrih)",
    "حسن":                   "Bon (Hasan)",
    "حسن لغيره":             "Bon par ses témoins (Hasan li-ghayrih)",
    "حسن صحيح":              "Bon et Authentique (Hasan Sahîh)",
    "ضعيف":                  "Faible (Da'îf)",
    "ضعيف جداً":             "Très faible (Da'îf Jiddan)",
    "ضعيف جدا":              "Très faible (Da'îf Jiddan)",
    "موضوع":                 "Inventé (Mawdû')",
    "منكر":                  "Répréhensible (Munkar)",
    "شاذ":                   "Marginal (Shâdh)",
    "معلول":                 "Défectueux (Ma'lûl)",
    "مرسل":                  "Interrompu après le Successeur (Mursal)",
    "منقطع":                 "Interrompu (Munqati')",
    "معضل":                  "Doublement interrompu (Mu'dal)",
    "مدلس":                  "Avec dissimulation (Mudallis)",
    "مضطرب":                 "Confus (Mudtarib)",
    "مقلوب":                 "Inversé (Maqlûb)",
    "مدرج":                  "Interpolé (Mudraj)",
    "متواتر":                "Massif et ininterrompu (Mutawâtir)",
    "آحاد":                  "Rapporté par peu (Âhâd)",
    "مشهور":                 "Connu (Mashhûr)",
    "عزيز":                  "Rare (Azîz)",
    "غريب":                  "Étrange (Gharîb)",
    "إسناده صحيح":           "Chaîne authentique (Isnâduh Sahîh)",
    "إسناده حسن":            "Chaîne bonne (Isnâduh Hasan)",
    "إسناده ضعيف":           "Chaîne faible (Isnâduh Da'îf)",
    "رجاله ثقات":            "Ses transmetteurs sont fiables (Rijâluh Thiqât)",
    "لا أصل له":             "Sans fondement (Lâ Asla Lah)",
    "باطل":                  "Nul et non avenu (Bâtil)",
    "مكذوب":                 "Mensonger (Makdhûb)",
}

_GLOSSAIRE_AR_FR: dict[str, str] = {
    **_HUKM_AR_FR,
    "صلاة":     "Salât (prière)",
    "الصلاة":   "la Salât (prière)",
    "زكاة":     "Zakât",
    "الزكاة":   "la Zakât",
    "صوم":      "Sawm (jeûne)",
    "رمضان":    "Ramadân",
    "حج":       "Hajj",
    "عمرة":     "Umrah",
    "توحيد":    "Tawhîd (monothéisme)",
    "إيمان":    "Îmân (foi)",
    "عقيدة":    "Aqîdah (croyance)",
    "منهج":     "Manhaj (méthode)",
    "سنة":      "Sunnah",
    "السنة":    "la Sunnah",
    "حديث":     "Hadîth",
    "الحديث":   "le Hadîth",
    "شريعة":    "Sharî'ah",
    "فقه":      "Fiqh (jurisprudence islamique)",
    "فتوى":     "Fatwâ",
    "إجماع":    "Ijmâ' (consensus)",
    "قياس":     "Qiyâs (analogie)",
    "اجتهاد":   "Ijtihâd",
    "تفسير":    "Tafsîr (exégèse coranique)",
    "إسناد":    "Isnâd (chaîne de transmission)",
    "سند":      "Sanad (chaîne)",
    "متن":      "Matn (texte du hadîth)",
    "رجال":     "Rijâl (transmetteurs)",
    "جرح وتعديل": "Jarh wa Ta'dîl (critique des transmetteurs)",
    "ثقة":      "Thiqah (fiable)",
    "مجهول":    "Inconnu (Majhûl)",
    "متروك":    "Abandonné (Matrûk)",
    "كذاب":     "Menteur (Kaddhâb)",
    "طبقة":     "Tabaqah (génération)",
    "صحابي":    "Sahâbî (Compagnon)",
    "صحابة":    "Sahâbah (Compagnons)",
    "تابعي":    "Tâbi'î (Successeur)",
    "تابعون":   "Tâbi'ûn (Successeurs)",
    "جنة":      "Jannah (paradis)",
    "الجنة":    "la Jannah (paradis)",
    "نار":      "Nâr (feu de l'enfer)",
    "النار":    "le Nâr (feu de l'enfer)",
    "جهنم":     "Jahannam (géhenne)",
    "الآخرة":   "al-Âkhirah (l'au-delà)",
    "الله":     "Allah",
    "رب":       "Rabb (Seigneur)",
    "وضوء":     "Wudû (ablutions)",
    "سجود":     "Sujûd (prosternation)",
    "أذان":     "Adhân (appel à la prière)",
    "ذكر":      "Dhikr (rappel d'Allah)",
    "دعاء":     "Du'â (supplication)",
}

# =====================================================================
# FASTAPI APP
# =====================================================================

app = FastAPI(title="Mîzân API v22.9")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "Cache-Control"],
)

# =====================================================================
# UTILITAIRES TRADUCTION
# =====================================================================

def _patch_glossaire(text: str) -> str:
    """Applique le glossaire islamique sur un texte traduit."""
    if not text:
        return text
    for ar, fr in _GLOSSAIRE_AR_FR.items():
        text = text.replace(ar, fr)
    return text


def _protect_hukm(grade_ar: str) -> str:
    """Retourne la traduction légifèrée du verdict — jamais de traduction profane."""
    if not grade_ar:
        return ""
    grade_stripped = grade_ar.strip()
    # Correspondance exacte d'abord
    if grade_stripped in _HUKM_AR_FR:
        return _HUKM_AR_FR[grade_stripped]
    # Correspondance partielle
    for ar, fr in _HUKM_AR_FR.items():
        if ar in grade_stripped:
            return fr
    return grade_stripped


async def _google_translate(text: str, target: str = "fr") -> str:
    """Traduction Google Translate async — timeout 8s."""
    if not text or not text.strip():
        return ""
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl":     "ar",
            "tl":     target,
            "dt":     "t",
            "q":      text[:2000],
        }
        async with httpx.AsyncClient(timeout=_GT_TIMEOUT) as client:
            r = await client.get(url, params=params)
            if r.status_code == 200:
                data = r.json()
                parts = []
                for block in data[0]:
                    if block and block[0]:
                        parts.append(str(block[0]))
                raw = " ".join(parts)
                return _patch_glossaire(raw)
    except Exception as e:
        log.warning(f"[GT] Erreur traduction: {e}")
    return ""


# =====================================================================
# SCRAPING DORAR.NET
# =====================================================================

async def _translate_to_arabic(text: str) -> str:
    """Traduit un texte vers l'arabe via Google Translate."""
    if not text or not text.strip():
        return ""
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl":     "auto",
            "tl":     "ar",
            "dt":     "t",
            "q":      text[:500],
        }
        async with httpx.AsyncClient(timeout=_GT_TIMEOUT) as client:
            r = await client.get(url, params=params)
            if r.status_code == 200:
                data = r.json()
                parts = []
                for block in data[0]:
                    if block and block[0]:
                        parts.append(str(block[0]))
                return " ".join(parts).strip()
    except Exception as e:
        log.warning(f"[GT→AR] Erreur: {e}")
    return ""


def _parse_dorar_html(html_result: str) -> list[dict]:
    """
    Parse le HTML retourne par ahadith.result de l API Dorar.
    Structure reelle confirmee :
      div.hadith      -> matn arabe
      div.hadith-info -> rawi, mohaddith, source, hukm
    """
    from lxml import html as lx_html
    results = []
    try:
        tree = lx_html.fromstring(f"<div>{html_result}</div>")
        hadith_divs = tree.xpath('.//div[@class="hadith"]')
        info_divs   = tree.xpath('.//div[@class="hadith-info"]')

        for i, hdiv in enumerate(hadith_divs[:5]):
            raw_matn = hdiv.text_content().strip()
            raw_matn = re.sub(r"^\d+\s*[-\u2013]\s*", "", raw_matn).strip().strip("\u00ab\u00bb").strip()
            if not raw_matn or len(raw_matn) < 5:
                continue

            rawi = mohaddith = source = numero = hukm = ""

            if i < len(info_divs):
                info      = info_divs[i]
                info_text = info.text_content()

                def _after(label, text):
                    idx = text.find(label)
                    if idx == -1:
                        return ""
                    after = text[idx + len(label):].strip()
                    for stop in ["\u0627\u0644\u0631\u0627\u0648\u064a:", "\u0627\u0644\u0645\u062d\u062f\u062b:", "\u0627\u0644\u0645\u0635\u062f\u0631:", "\u0627\u0644\u0635\u0641\u062d\u0629 \u0623\u0648 \u0627\u0644\u0631\u0642\u0645:", "\u062e\u0644\u0627\u0635\u0629 \u062d\u0643\u0645 \u0627\u0644\u0645\u062d\u062f\u062b:"]:
                        if stop == label:
                            continue
                        sidx = after.find(stop)
                        if sidx != -1:
                            after = after[:sidx]
                    return after.strip()

                rawi      = _after("\u0627\u0644\u0631\u0627\u0648\u064a:", info_text) or "\u2014"
                mohaddith = _after("\u0627\u0644\u0645\u062d\u062f\u062b:", info_text) or "\u2014"
                source    = _after("\u0627\u0644\u0645\u0635\u062f\u0631:", info_text) or "\u2014"
                numero    = _after("\u0627\u0644\u0635\u0641\u062d\u0629 \u0623\u0648 \u0627\u0644\u0631\u0642\u0645:", info_text) or ""

                hukm_spans = info.xpath('.//span[@class="info-subtitle"][contains(text(),"\u062e\u0644\u0627\u0635\u0629")]/following-sibling::span[1]')
                if hukm_spans:
                    hukm = hukm_spans[0].text_content().strip()
                else:
                    hukm = _after("\u062e\u0644\u0627\u0635\u0629 \u062d\u0643\u0645 \u0627\u0644\u0645\u062d\u062f\u062b:", info_text) or ""

            results.append({
                "arabic_text": raw_matn,
                "savant":      mohaddith,
                "source":      source,
                "grade":       hukm,
                "rawi":        rawi,
                "numero":      numero,
            })
    except Exception as e:
        log.error(f"[DorarParser] Erreur: {e}")
    return results


async def _scrape_dorar(query: str) -> list[dict]:
    """
    API JSON officielle Dorar.net.
    Structure reponse : {"ahadith": {"result": "HTML..."}}
    Si query non-arabe -> traduction arabe d abord.
    """
    arabic_query = query
    if not _is_arabic(query):
        log.info(f"[Dorar] Traduction FR->AR : {query[:50]}")
        arabic_query = await _translate_to_arabic(query)
        if not arabic_query or not _is_arabic(arabic_query):
            log.warning("[Dorar] Traduction echouee, query originale utilisee")
            arabic_query = query

    log.info(f"[Dorar] Requete arabe : {arabic_query[:80]}")

    try:
        url     = "https://dorar.net/dorar_api.json"
        params  = {"skey": arabic_query}
        headers = {
            "User-Agent":      _HEADERS["User-Agent"],
            "Accept":          "application/json, text/javascript, */*",
            "Accept-Language": "ar,fr;q=0.9,en;q=0.8",
            "Referer":         "https://dorar.net/",
        }
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            r = await client.get(url, params=params, headers=headers)
            log.info(f"[Dorar API] Status: {r.status_code}")
            if r.status_code != 200:
                return []
            data        = r.json()
            html_result = data.get("ahadith", {}).get("result", "")
            if not html_result or len(html_result) < 10:
                log.info("[Dorar API] Aucun resultat")
                return []
            results = _parse_dorar_html(html_result)
            log.info(f"[Dorar API] {len(results)} hadith(s) parse(s)")
            return results
    except Exception as e:
        log.error(f"[Dorar API] Erreur: {e}")
        return []


# =====================================================================
# ENRICHISSEMENT VIA CLAUDE API
# =====================================================================

_SYSTEM_ENRICHISSEMENT = """Tu es Al-Mîzân, moteur d'analyse de Hadith selon le Manhaj Salafi.
Tu analyses les hadiths selon la science du Jarh wa Ta'dîl.

RÈGLES ABSOLUES :
1. Les verdicts (Sahîh, Da'îf, Hasan, Mawdû', etc.) ne doivent JAMAIS être traduits librement.
2. Utilise toujours la terminologie islamique exacte avec sa translittération.
3. Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.

Format de réponse JSON strict :
{
  "french_text": "traduction française du matn",
  "grade_explique": "explication du verdict en français avec sources",
  "jarh_tadil": "analyse de la chaîne de transmission",
  "isnad_chain": "chaîne pipe-séparée: Maillon 1|Nom|Titre|Verdict|Siècle",
  "sanad_conditions": "analyse des 5 conditions d'authenticité",
  "mutabaat": "voies de renfort (shawahid/mutaba'at)",
  "avis_savants": "avis des savants contemporains",
  "grille_albani": "verdict d'Al-Albani si disponible",
  "pertinence": "OUI/PARTIEL/NON — explication courte"
}"""


async def _enrich_hadith_claude(
    hadith: dict,
    query: str,
    idx: int,
) -> dict:
    """Enrichit un hadith via l'API Claude avec streaming."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        log.warning("[Claude] ANTHROPIC_API_KEY manquante")
        return hadith

    client = AsyncAnthropic(api_key=api_key)
    ar_text = hadith.get("arabic_text", "")
    grade_ar = hadith.get("grade", "")
    savant = hadith.get("savant", "")
    source = hadith.get("source", "")

    prompt = f"""Analyse ce hadith selon le Manhaj Salafi :

Texte arabe : {ar_text}
Savant / Mohaddith : {savant}
Source : {source}
Grade arabe (Hukm) : {grade_ar}
Requête originale : {query}

Fournis l'analyse complète en JSON."""

    try:
        enriched = dict(hadith)
        full_response = ""

        async with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            system=_SYSTEM_ENRICHISSEMENT,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                full_response += text

        # Parse JSON
        clean = full_response.strip()
        clean = re.sub(r"^```json\s*", "", clean)
        clean = re.sub(r"```$", "", clean)
        clean = clean.strip()

        data = json.loads(clean)

        # Protection des verdicts — jamais de traduction profane
        if grade_ar:
            data["grade_protege"] = _protect_hukm(grade_ar)

        enriched.update(data)
        return enriched

    except json.JSONDecodeError as e:
        log.warning(f"[Claude] JSON parse error idx={idx}: {e}")
        # Fallback traduction Google
        fr = await _google_translate(ar_text)
        hadith["french_text"] = fr
        if grade_ar:
            hadith["grade_explique"] = _protect_hukm(grade_ar)
        return hadith
    except Exception as e:
        log.error(f"[Claude] Erreur enrichissement idx={idx}: {e}")
        return hadith


# =====================================================================
# GÉNÉRATEUR SSE
# =====================================================================

async def _sse_event(event: str, data: Any) -> str:
    """Formate un événement SSE."""
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


async def _search_generator(query: str) -> AsyncGenerator[str, None]:
    """Générateur principal du flux SSE."""

    # ── STEP 0 : Initialisation ──
    yield await _sse_event("status", {"step": "INITIALISATION"})
    await asyncio.sleep(0.05)

    # ── STEP 1 : Scraping Dorar ──
    yield await _sse_event("status", {"step": "DORAR"})
    hadiths_raw = await _scrape_dorar(query)

    # Fallback si Dorar ne retourne rien
    if not hadiths_raw:
        log.info(f"[Dorar] Aucun résultat pour: {query}")
        # Traduction Google du query comme fallback
        fr_query = await _google_translate(query)
        yield await _sse_event("dorar", [])
        yield await _sse_event("status", {"step": "TAKHRIJ"})

        # Enrichissement direct via Claude sans résultat Dorar
        fake_hadith = {
            "arabic_text": query if _is_arabic(query) else "",
            "savant": "—",
            "source": "—",
            "grade": "",
            "rawi": "—",
            "french_text": fr_query,
        }
        enriched = await _enrich_hadith_claude(fake_hadith, query, 0)
        yield await _sse_event("hadith", {"index": 0, "data": enriched})
        yield await _sse_event("done", [enriched])
        return

    # ── STEP 2 : Envoi des hadiths bruts ──
    yield await _sse_event("status", {"step": "TAKHRIJ"})
    yield await _sse_event("dorar", hadiths_raw)

    # ── STEP 3 : Enrichissement hadith par hadith ──
    yield await _sse_event("status", {"step": "RIJAL"})
    enriched_list = []

    for idx, hadith in enumerate(hadiths_raw):
        yield await _sse_event("status", {"step": "JARH"})

        # Chunk intermédiaire (typewriter effect)
        ar_preview = hadith.get("arabic_text", "")[:80]
        yield await _sse_event("chunk", {"index": idx, "delta": f"Analyse en cours — {ar_preview}…"})

        # Enrichissement complet
        enriched = await _enrich_hadith_claude(hadith, query, idx)

        # Protection verdict HUKM — règle absolue
        grade_ar = hadith.get("grade", "")
        if grade_ar and "grade_explique" not in enriched:
            enriched["grade_explique"] = _protect_hukm(grade_ar)

        # Traduction Google fallback si pas de french_text
        if not enriched.get("french_text") and hadith.get("arabic_text"):
            enriched["french_text"] = await _google_translate(hadith["arabic_text"])

        enriched_list.append(enriched)

        yield await _sse_event("status", {"step": "HUKM"})
        yield await _sse_event("hadith", {"index": idx, "data": enriched})
        await asyncio.sleep(0.1)

    # ── STEP 4 : Done ──
    yield await _sse_event("done", enriched_list)


def _is_arabic(text: str) -> bool:
    """Détecte si le texte contient principalement de l'arabe."""
    arabic_chars = sum(1 for c in text if "\u0600" <= c <= "\u06ff")
    return arabic_chars > len(text) * 0.3


# =====================================================================
# ROUTES FASTAPI
# =====================================================================

@app.get("/api/search")
async def search(request: Request, q: str = ""):
    """Endpoint principal — flux SSE de recherche et analyse de hadith."""
    if not q or not q.strip():
        return {"error": "Paramètre q requis"}

    accept = request.headers.get("accept", "")

    if "text/event-stream" in accept:
        return StreamingResponse(
            _search_generator(q.strip()),
            media_type="text/event-stream",
            headers={
                **CORS_HEADERS,
                "Cache-Control":  "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        # Fallback JSON — collecte tous les événements
        results = []
        async for chunk in _search_generator(q.strip()):
            if chunk.startswith("event: hadith"):
                lines = chunk.strip().split("\n")
                for line in lines:
                    if line.startswith("data:"):
                        try:
                            data = json.loads(line[5:].strip())
                            if data.get("data"):
                                results.append(data["data"])
                        except Exception:
                            pass
        return results


@app.get("/api/health")
async def health():
    """Health check."""
    return {"status": "ok", "version": "22.9"}


@app.options("/api/{path:path}")
async def options_handler():
    """CORS preflight."""
    from fastapi.responses import Response
    return Response(headers=CORS_HEADERS)


# =====================================================================
# HANDLER VERCEL (WSGI/ASGI)
# =====================================================================

handler = app
