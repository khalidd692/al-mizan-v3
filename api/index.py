"""
api/index.py - MIZAN v22.9
Traduction hybride : Google Translate async (httpx) + Glossaire islamique l\u00e9gif\u00e9r\u00e9
Verdicts Hadith prot\u00e9g\u00e9s, scraping blind\u00e9, flux SSE complet avec debug et french_text
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import unicodedata
from typing import Any, AsyncGenerator

import httpx
from lxml import html as lx

log = logging.getLogger("mizan.rawi")

# =====================================================================
# CONSTANTES R\u00c9SEAU
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

_TIMEOUT   = httpx.Timeout(25.0, connect=10.0)
_GT_TIMEOUT = httpx.Timeout(8.0, connect=5.0)
_MAX_RETRY = 3

CORS_HEADERS: dict[str, str] = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type, Cache-Control",
}

# =====================================================================
# GLOSSAIRES ISLAMIQUES L\u00c9GIF\u00c9R\u00c9S
# =====================================================================

# \u2500\u2500 Jugements du Hadith (Hukm) \u2014 protection absolue, priorit\u00e9 maximale \u2500\u2500
# Ces termes ne doivent JAMAIS \u00eatre alt\u00e9r\u00e9s par une traduction profane.
_HUKM_AR_FR: dict[str, str] = {
    "\u0635\u062d\u064a\u062d":           "Authentique (Sah\u00eeh)",
    "\u0635\u062d\u064a\u062d \u0644\u063a\u064a\u0631\u0647":     "Authentique par ses t\u00e9moins (Sah\u00eeh li-ghayrih)",
    "\u062d\u0633\u0646":            "Bon (Hasan)",
    "\u062d\u0633\u0646 \u0644\u063a\u064a\u0631\u0647":      "Bon par ses t\u00e9moins (Hasan li-ghayrih)",
    "\u062d\u0633\u0646 \u0635\u062d\u064a\u062d":       "Bon et Authentique (Hasan Sah\u00eeh)",
    "\u0636\u0639\u064a\u0641":           "Faible (Da'\u00eef)",
    "\u0636\u0639\u064a\u0641 \u062c\u062f\u0627\u064b":      "Tr\u00e8s faible (Da'\u00eef Jiddan)",
    "\u0636\u0639\u064a\u0641 \u062c\u062f\u0627":       "Tr\u00e8s faible (Da'\u00eef Jiddan)",
    "\u0645\u0648\u0636\u0648\u0639":          "Invent\u00e9 (Mawd\u00fb')",
    "\u0645\u0646\u0643\u0631":           "R\u00e9pr\u00e9hensible (Munkar)",
    "\u0634\u0627\u0630":            "Marginal (Sh\u00e2dh)",
    "\u0645\u0639\u0644\u0648\u0644":          "D\u00e9fectueux (Ma'l\u00fbl)",
    "\u0645\u0631\u0633\u0644":           "Interrompu apr\u00e8s le Successeur (Mursal)",
    "\u0645\u0646\u0642\u0637\u0639":          "Interrompu (Munqati')",
    "\u0645\u0639\u0636\u0644":           "Doublement interrompu (Mu'dal)",
    "\u0645\u062f\u0644\u0633":           "Avec dissimulation (Mudallis)",
    "\u0645\u0636\u0637\u0631\u0628":          "Confus (Mudtarib)",
    "\u0645\u0642\u0644\u0648\u0628":          "Invers\u00e9 (Maql\u00fbb)",
    "\u0645\u062f\u0631\u062c":           "Interpol\u00e9 (Mudraj)",
    "\u0645\u062a\u0648\u0627\u062a\u0631":         "Massif et ininterrompu (Mutaw\u00e2tir)",
    "\u0622\u062d\u0627\u062f":           "Rapport\u00e9 par peu (\u00c2h\u00e2d)",
    "\u0645\u0634\u0647\u0648\u0631":          "Connu (Mashh\u00fbr)",
    "\u0639\u0632\u064a\u0632":           "Rare (Az\u00eez)",
    "\u063a\u0631\u064a\u0628":           "\u00c9trange (Ghar\u00eeb)",
    "\u0625\u0633\u0646\u0627\u062f\u0647 \u0635\u062d\u064a\u062d":    "Cha\u00eene authentique (Isn\u00e2duh Sah\u00eeh)",
    "\u0625\u0633\u0646\u0627\u062f\u0647 \u062d\u0633\u0646":     "Cha\u00eene bonne (Isn\u00e2duh Hasan)",
    "\u0625\u0633\u0646\u0627\u062f\u0647 \u0636\u0639\u064a\u0641":    "Cha\u00eene faible (Isn\u00e2duh Da'\u00eef)",
    "\u0631\u062c\u0627\u0644\u0647 \u062b\u0642\u0627\u062a":     "Ses transmetteurs sont fiables (Rij\u00e2luh Thiq\u00e2t)",
    "\u0644\u0627 \u0623\u0635\u0644 \u0644\u0647":      "Sans fondement (L\u00e2 Asla Lah)",
    "\u0628\u0627\u0637\u0644":           "Nul et non avenu (B\u00e2til)",
    "\u0645\u0643\u0630\u0648\u0628":          "Mensonger (Makdh\u00fbb)",
}

# \u2500\u2500 Glossaire AR \u2192 FR (terminologie islamique g\u00e9n\u00e9rale) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
_GLOSSAIRE_AR_FR: dict[str, str] = {
    # Jugements \u2014 inclus en priorit\u00e9 (repris de _HUKM_AR_FR pour le patch global)
    **_HUKM_AR_FR,
    # Piliers & pratiques
    "\u0635\u0644\u0627\u0629":            "Sal\u00e2t (pri\u00e8re)",
    "\u0627\u0644\u0635\u0644\u0627\u0629":          "la Sal\u00e2t (pri\u00e8re)",
    "\u0632\u0643\u0627\u0629":            "Zak\u00e2t",
    "\u0627\u0644\u0632\u0643\u0627\u0629":          "la Zak\u00e2t",
    "\u0635\u0648\u0645":             "Sawm (je\u00fbne)",
    "\u0631\u0645\u0636\u0627\u0646":           "Ramad\u00e2n",
    "\u062d\u062c":              "Hajj",
    "\u0639\u0645\u0631\u0629":            "Umrah",
    # Croyance & m\u00e9thode
    "\u062a\u0648\u062d\u064a\u062f":           "Tawh\u00eed (monoth\u00e9isme)",
    "\u0625\u064a\u0645\u0627\u0646":           "\u00cem\u00e2n (foi)",
    "\u0639\u0642\u064a\u062f\u0629":           "Aq\u00eedah (croyance)",
    "\u0645\u0646\u0647\u062c":            "Manhaj (m\u00e9thode)",
    "\u0633\u0646\u0629":             "Sunnah",
    "\u0627\u0644\u0633\u0646\u0629":           "la Sunnah",
    "\u062d\u062f\u064a\u062b":            "Had\u00eeth",
    "\u0627\u0644\u062d\u062f\u064a\u062b":          "le Had\u00eeth",
    "\u0634\u0631\u064a\u0639\u0629":           "Shar\u00ee'ah",
    "\u0641\u0642\u0647":             "Fiqh (jurisprudence islamique)",
    "\u0641\u062a\u0648\u0649":            "Fatw\u00e2",
    "\u0625\u062c\u0645\u0627\u0639":           "Ijm\u00e2' (consensus)",
    "\u0642\u064a\u0627\u0633":            "Qiy\u00e2s (analogie)",
    "\u0627\u062c\u062a\u0647\u0627\u062f":          "Ijtih\u00e2d",
    "\u062a\u0641\u0633\u064a\u0631":           "Tafs\u00eer (ex\u00e9g\u00e8se coranique)",
    # Sciences du Hadith
    "\u0625\u0633\u0646\u0627\u062f":           "Isn\u00e2d (cha\u00eene de transmission)",
    "\u0633\u0646\u062f":             "Sanad (cha\u00eene)",
    "\u0645\u062a\u0646":             "Matn (texte du had\u00eeth)",
    "\u0631\u062c\u0627\u0644":            "Rij\u00e2l (transmetteurs)",
    "\u062c\u0631\u062d \u0648\u062a\u0639\u062f\u064a\u0644":      "Jarh wa Ta'd\u00eel (critique des transmetteurs)",
    "\u062b\u0642\u0629":             "Thiqah (fiable)",
    "\u0636\u0639\u064a\u0641 \u0627\u0644\u062d\u0641\u0638":      "Faible de m\u00e9moire (Da'\u00eef al-Hifz)",
    "\u0645\u062c\u0647\u0648\u0644":           "Inconnu (Majh\u00fbl)",
    "\u0645\u062a\u0631\u0648\u0643":           "Abandonn\u00e9 (Matr\u00fbk)",
    "\u0643\u0630\u0627\u0628":            "Menteur (Kadhdh\u00e2b)",
    "\u0637\u0628\u0642\u0629":            "Tabaqah (g\u00e9n\u00e9ration)",
    "\u0635\u062d\u0627\u0628\u064a":           "Sah\u00e2b\u00ee (Compagnon)",
    "\u0635\u062d\u0627\u0628\u0629":           "Sah\u00e2bah (Compagnons)",
    "\u062a\u0627\u0628\u0639\u064a":           "T\u00e2bi'\u00ee (Successeur)",
    "\u062a\u0627\u0628\u0639\u0648\u0646":          "T\u00e2bi'\u00fbn (Successeurs)",
    "\u062a\u0628\u0639 \u0627\u0644\u062a\u0627\u0628\u0639\u064a\u0646":    "Atb\u00e2' al-T\u00e2bi'\u00een",
    # \u00c9thique & vertus
    "\u0635\u0628\u0631":             "Sabr (patience)",
    "\u0634\u0643\u0631":             "Shukr (gratitude)",
    "\u062a\u0642\u0648\u0649":            "Taqw\u00e2 (pi\u00e9t\u00e9)",
    "\u0625\u062e\u0644\u0627\u0635":           "Ikhl\u00e2s (sinc\u00e9rit\u00e9)",
    "\u062a\u0648\u0628\u0629":            "Tawbah (repentir)",
    "\u0631\u062d\u0645\u0629":            "Rahmah (mis\u00e9ricorde)",
    "\u0645\u063a\u0641\u0631\u0629":           "Maghfirah (pardon divin)",
    "\u0639\u062f\u0644":             "Adl (justice)",
    "\u0639\u0644\u0645":             "Ilm (connaissance religieuse)",
    "\u0632\u0647\u062f":             "Zuhd (asc\u00e8se)",
    "\u0648\u0631\u0639":             "Wara' (scrupule religieux)",
    # Eschatologie
    "\u062c\u0646\u0629":             "Jannah (paradis)",
    "\u0627\u0644\u062c\u0646\u0629":           "la Jannah (paradis)",
    "\u0646\u0627\u0631":             "N\u00e2r (feu de l'enfer)",
    "\u0627\u0644\u0646\u0627\u0631":           "le N\u00e2r (feu de l'enfer)",
    "\u062c\u0647\u0646\u0645":            "Jahannam (g\u00e9henne)",
    "\u064a\u0648\u0645 \u0627\u0644\u0642\u064a\u0627\u0645\u0629":     "Yawm al-Qiy\u00e2mah (Jour du Jugement)",
    "\u0627\u0644\u0622\u062e\u0631\u0629":          "al-\u00c2khirah (l'au-del\u00e0)",
    "\u0628\u0639\u062b":             "Ba'th (r\u00e9surrection)",
    "\u062d\u0633\u0627\u0628":            "His\u00e2b (jugement des actes)",
    "\u0645\u064a\u0632\u0627\u0646":           "M\u00eez\u00e2n (balance des actes)",
    # Figures & savants
    "\u0646\u0628\u064a":             "Nab\u00ee (proph\u00e8te)",
    "\u0631\u0633\u0648\u0644":            "Ras\u00fbl (messager)",
    "\u0639\u0627\u0644\u0645":            "\u00c2lim (savant islamique)",
    "\u0639\u0644\u0645\u0627\u0621":           "Ulam\u00e2 (savants islamiques)",
    "\u0625\u0645\u0627\u0645":            "Im\u00e2m",
    "\u062e\u0644\u064a\u0641\u0629":           "Khal\u00eefah (calife)",
    "\u0627\u0644\u0645\u062d\u062f\u062b":          "le Muhaddith (sp\u00e9cialiste du Had\u00eeth)",
    "\u0645\u062d\u062f\u062b":            "Muhaddith (sp\u00e9cialiste du Had\u00eeth)",
    "\u0627\u0644\u0641\u0642\u064a\u0647":          "le Faq\u00eeh (juriste islamique)",
    "\u0627\u0644\u0645\u0641\u0633\u0631":          "le Mufassir (ex\u00e9g\u00e8te)",
    # Allah & divin
    "\u0627\u0644\u0644\u0647":            "Allah",
    "\u0631\u0628":              "Rabb (Seigneur)",
    "\u062e\u0627\u0644\u0642":            "Kh\u00e2liq (Cr\u00e9ateur)",
    "\u0627\u0644\u0631\u062d\u0645\u0646":          "ar-Rahm\u00e2n (le Tout-Mis\u00e9ricordieux)",
    "\u0627\u0644\u0631\u062d\u064a\u0645":          "ar-Rah\u00eem (le Tr\u00e8s-Mis\u00e9ricordieux)",
    # Rituels & textes
    "\u0648\u0636\u0648\u0621":            "Wud\u00fb (ablutions)",
    "\u0633\u062c\u0648\u062f":            "Suj\u00fbd (prosternation)",
    "\u0623\u0630\u0627\u0646":            "Adh\u00e2n (appel \u00e0 la pri\u00e8re)",
    "\u0630\u0643\u0631":             "Dhikr (rappel d'Allah)",
    "\u062f\u0639\u0627\u0621":            "Du'\u00e2 (supplication)",
    "\u0633\u0648\u0631\u0629":            "S\u00fbrah",
    "\u0622\u064a\u0629":             "\u00c2"""
api/index.py - MIZAN v22.9
Traduction hybride : Google Translate async (httpx) + Glossaire islamique l\u00e9gif\u00e9r\u00e9
Verdicts Hadith prot\u00e9g\u00e9s, scraping blind\u00e9, flux SSE complet avec debug et french_text
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import unicodedata
from typing import Any, AsyncGenerator

import httpx
from lxml import html as lx

log = logging.getLogger("mizan.rawi")

# =====================================================================
# CONSTANTES R\u00c9SEAU
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

_TIMEOUT   = httpx.Timeout(25.0, connect=10.0)
_GT_TIMEOUT = httpx.Timeout(8.0, connect=5.0)
_MAX_RETRY = 3

CORS_HEADERS: dict[str, str] = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type, Cache-Control",
}

# =====================================================================
# GLOSSAIRES ISLAMIQUES L\u00c9GIF\u00c9R\u00c9S
# =====================================================================

# \u2500\u2500 Jugements du Hadith (Hukm) \u2014 protection absolue, priorit\u00e9 maximale \u2500\u2500
# Ces termes ne doivent JAMAIS \u00eatre alt\u00e9r\u00e9s par une traduction profane.
_HUKM_AR_FR: dict[str, str] = {
    "\u0635\u062d\u064a\u062d":           "Authentique (Sah\u00eeh)",
    "\u0635\u062d\u064a\u062d \u0644\u063a\u064a\u0631\u0647":     "Authentique par ses t\u00e9moins (Sah\u00eeh li-ghayrih)",
    "\u062d\u0633\u0646":            "Bon (Hasan)",
    "\u062d\u0633\u0646 \u0644\u063a\u064a\u0631\u0647":      "Bon par ses t\u00e9moins (Hasan li-ghayrih)",
    "\u062d\u0633\u0646 \u0635\u062d\u064a\u062d":       "Bon et Authentique (Hasan Sah\u00eeh)",
    "\u0636\u0639\u064a\u0641":           "Faible (Da'\u00eef)",
    "\u0636\u0639\u064a\u0641 \u062c\u062f\u0627\u064b":      "Tr\u00e8s faible (Da'\u00eef Jiddan)",
    "\u0636\u0639\u064a\u0641 \u062c\u062f\u0627":       "Tr\u00e8s faible (Da'\u00eef Jiddan)",
    "\u0645\u0648\u0636\u0648\u0639":          "Invent\u00e9 (Mawd\u00fb')",
    "\u0645\u0646\u0643\u0631":           "R\u00e9pr\u00e9hensible (Munkar)",
    "\u0634\u0627\u0630":            "Marginal (Sh\u00e2dh)",
    "\u0645\u0639\u0644\u0648\u0644":          "D\u00e9fectueux (Ma'l\u00fbl)",
    "\u0645\u0631\u0633\u0644":           "Interrompu apr\u00e8s le Successeur (Mursal)",
    "\u0645\u0646\u0642\u0637\u0639":          "Interrompu (Munqati')",
    "\u0645\u0639\u0636\u0644":           "Doublement interrompu (Mu'dal)",
    "\u0645\u062f\u0644\u0633":           "Avec dissimulation (Mudallis)",
    "\u0645\u0636\u0637\u0631\u0628":          "Confus (Mudtarib)",
    "\u0645\u0642\u0644\u0648\u0628":          "Invers\u00e9 (Maql\u00fbb)",
    "\u0645\u062f\u0631\u062c":           "Interpol\u00e9 (Mudraj)",
    "\u0645\u062a\u0648\u0627\u062a\u0631":         "Massif et ininterrompu (Mutaw\u00e2tir)",
    "\u0622\u062d\u0627\u062f":           "Rapport\u00e9 par peu (\u00c2h\u00e2d)",
    "\u0645\u0634\u0647\u0648\u0631":          "Connu (Mashh\u00fbr)",
    "\u0639\u0632\u064a\u0632":           "Rare (Az\u00eez)",
    "\u063a\u0631\u064a\u0628":           "\u00c9trange (Ghar\u00eeb)",
    "\u0625\u0633\u0646\u0627\u062f\u0647 \u0635\u062d\u064a\u062d":    "Cha\u00eene authentique (Isn\u00e2duh Sah\u00eeh)",
    "\u0625\u0633\u0646\u0627\u062f\u0647 \u062d\u0633\u0646":     "Cha\u00eene bonne (Isn\u00e2duh Hasan)",
    "\u0625\u0633\u0646\u0627\u062f\u0647 \u0636\u0639\u064a\u0641":    "Cha\u00eene faible (Isn\u00e2duh Da'\u00eef)",
    "\u0631\u062c\u0627\u0644\u0647 \u062b\u0642\u0627\u062a":     "Ses transmetteurs sont fiables (Rij\u00e2luh Thiq\u00e2t)",
    "\u0644\u0627 \u0623\u0635\u0644 \u0644\u0647":      "Sans fondement (L\u00e2 Asla Lah)",
    "\u0628\u0627\u0637\u0644":           "Nul et non avenu (B\u00e2til)",
    "\u0645\u0643\u0630\u0648\u0628":          "Mensonger (Makdh\u00fbb)",
}

# \u2500\u2500 Glossaire AR \u2192 FR (terminologie islamique g\u00e9n\u00e9rale) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
_GLOSSAIRE_AR_FR: dict[str, str] = {
    # Jugements \u2014 inclus en priorit\u00e9 (repris de _HUKM_AR_FR pour le patch global)
    **_HUKM_AR_FR,
    # Piliers & pratiques
    "\u0635\u0644\u0627\u0629":            "Sal\u00e2t (pri\u00e8re)",
    "\u0627\u0644\u0635\u0644\u0627\u0629":          "la Sal\u00e2t (pri\u00e8re)",
    "\u0632\u0643\u0627\u0629":            "Zak\u00e2t",
    "\u0627\u0644\u0632\u0643\u0627\u0629":          "la Zak\u00e2t",
    "\u0635\u0648\u0645":             "Sawm (je\u00fbne)",
    "\u0631\u0645\u0636\u0627\u0646":           "Ramad\u00e2n",
    "\u062d\u062c":              "Hajj",
    "\u0639\u0645\u0631\u0629":            "Umrah",
    # Croyance & m\u00e9thode
    "\u062a\u0648\u062d\u064a\u062f":           "Tawh\u00eed (monoth\u00e9isme)",
    "\u0625\u064a\u0645\u0627\u0646":           "\u00cem\u00e2n (foi)",
    "\u0639\u0642\u064a\u062f\u0629":           "Aq\u00eedah (croyance)",
    "\u0645\u0646\u0647\u062c":            "Manhaj (m\u00e9thode)",
    "\u0633\u0646\u0629":             "Sunnah",
    "\u0627\u0644\u0633\u0646\u0629":           "la Sunnah",
    "\u062d\u062f\u064a\u062b":            "Had\u00eeth",
    "\u0627\u0644\u062d\u062f\u064a\u062b":          "le Had\u00eeth",
    "\u0634\u0631\u064a\u0639\u0629":           "Shar\u00ee'ah",
    "\u0641\u0642\u0647":             "Fiqh (jurisprudence islamique)",
    "\u0641\u062a\u0648\u0649":            "Fatw\u00e2",
    "\u0625\u062c\u0645\u0627\u0639":           "Ijm\u00e2' (consensus)",
    "\u0642\u064a\u0627\u0633":            "Qiy\u00e2s (analogie)",
    "\u0627\u062c\u062a\u0647\u0627\u062f":          "Ijtih\u00e2d",
    "\u062a\u0641\u0633\u064a\u0631":           "Tafs\u00eer (ex\u00e9g\u00e8se coranique)",
    # Sciences du Hadith
    "\u0625\u0633\u0646\u0627\u062f":           "Isn\u00e2d (cha\u00eene de transmission)",
    "\u0633\u0646\u062f":             "Sanad (cha\u00eene)",
    "\u0645\u062a\u0646":             "Matn (texte du had\u00eeth)",
    "\u0631\u062c\u0627\u0644":            "Rij\u00e2l (transmetteurs)",
    "\u062c\u0631\u062d \u0648\u062a\u0639\u062f\u064a\u0644":      "Jarh wa Ta'd\u00eel (critique des transmetteurs)",
    "\u062b\u0642\u0629":             "Thiqah (fiable)",
    "\u0636\u0639\u064a\u0641 \u0627\u0644\u062d\u0641\u0638":      "Faible de m\u00e9moire (Da'\u00eef al-Hifz)",
    "\u0645\u062c\u0647\u0648\u0644":           "Inconnu (Majh\u00fbl)",
    "\u0645\u062a\u0631\u0648\u0643":           "Abandonn\u00e9 (Matr\u00fbk)",
    "\u0643\u0630\u0627\u0628":            "Menteur (Kadhdh\u00e2b)",
    "\u0637\u0628\u0642\u0629":            "Tabaqah (g\u00e9n\u00e9ration)",
    "\u0635\u062d\u0627\u0628\u064a":           "Sah\u00e2b\u00ee (Compagnon)",
    "\u0635\u062d\u0627\u0628\u0629":           "Sah\u00e2bah (Compagnons)",
    "\u062a\u0627\u0628\u0639\u064a":           "T\u00e2bi'\u00ee (Successeur)",
    "\u062a\u0627\u0628\u0639\u0648\u0646":          "T\u00e2bi'\u00fbn (Successeurs)",
    "\u062a\u0628\u0639 \u0627\u0644\u062a\u0627\u0628\u0639\u064a\u0646":    "Atb\u00e2' al-T\u00e2bi'\u00een",
    # \u00c9thique & vertus
    "\u0635\u0628\u0631":             "Sabr (patience)",
    "\u0634\u0643\u0631":             "Shukr (gratitude)",
    "\u062a\u0642\u0648\u0649":            "Taqw\u00e2 (pi\u00e9t\u00e9)",
    "\u0625\u062e\u0644\u0627\u0635":           "Ikhl\u00e2s (sinc\u00e9rit\u00e9)",
    "\u062a\u0648\u0628\u0629":            "Tawbah (repentir)",
    "\u0631\u062d\u0645\u0629":            "Rahmah (mis\u00e9ricorde)",
    "\u0645\u063a\u0641\u0631\u0629":           "Maghfirah (pardon divin)",
    "\u0639\u062f\u0644":             "Adl (justice)",
    "\u0639\u0644\u0645":             "Ilm (connaissance religieuse)",
    "\u0632\u0647\u062f":             "Zuhd (asc\u00e8se)",
    "\u0648\u0631\u0639":             "Wara' (scrupule religieux)",
    # Eschatologie
    "\u062c\u0646\u0629":             "Jannah (paradis)",
    "\u0627\u0644\u062c\u0646\u0629":           "la Jannah (paradis)",
    "\u0646\u0627\u0631":             "N\u00e2r (feu de l'enfer)",
    "\u0627\u0644\u0646\u0627\u0631":           "le N\u00e2r (feu de l'enfer)",
    "\u062c\u0647\u0646\u0645":            "Jahannam (g\u00e9henne)",
    "\u064a\u0648\u0645 \u0627\u0644\u0642\u064a\u0627\u0645\u0629":     "Yawm al-Qiy\u00e2mah (Jour du Jugement)",
    "\u0627\u0644\u0622\u062e\u0631\u0629":          "al-\u00c2khirah (l'au-del\u00e0)",
    "\u0628\u0639\u062b":             "Ba'th (r\u00e9surrection)",
    "\u062d\u0633\u0627\u0628":            "His\u00e2b (jugement des actes)",
    "\u0645\u064a\u0632\u0627\u0646":           "M\u00eez\u00e2n (balance des actes)",
    # Figures & savants
    "\u0646\u0628\u064a":             "Nab\u00ee (proph\u00e8te)",
    "\u0631\u0633\u0648\u0644":            "Ras\u00fbl (messager)",
    "\u0639\u0627\u0644\u0645":            "\u00c2lim (savant islamique)",
    "\u0639\u0644\u0645\u0627\u0621":           "Ulam\u00e2 (savants islamiques)",
    "\u0625\u0645\u0627\u0645":            "Im\u00e2m",
    "\u062e\u0644\u064a\u0641\u0629":           "Khal\u00eefah (calife)",
    "\u0627\u0644\u0645\u062d\u062f\u062b":          "le Muhaddith (sp\u00e9cialiste du Had\u00eeth)",
    "\u0645\u062d\u062f\u062b":            "Muhaddith (sp\u00e9cialiste du Had\u00eeth)",
    "\u0627\u0644\u0641\u0642\u064a\u0647":          "le Faq\u00eeh (juriste islamique)",
    "\u0627\u0644\u0645\u0641\u0633\u0631":          "le Mufassir (ex\u00e9g\u00e8te)",
    # Allah & divin
    "\u0627\u0644\u0644\u0647":            "Allah",
    "\u0631\u0628":              "Rabb (Seigneur)",
    "\u062e\u0627\u0644\u0642":            "Kh\u00e2liq (Cr\u00e9ateur)",
    "\u0627\u0644\u0631\u062d\u0645\u0646":          "ar-Rahm\u00e2n (le Tout-Mis\u00e9ricordieux)",
    "\u0627\u0644\u0631\u062d\u064a\u0645":          "ar-Rah\u00eem (le Tr\u00e8s-Mis\u00e9ricordieux)",
    # Rituels & textes
    "\u0648\u0636\u0648\u0621":            "Wud\u00fb (ablutions)",
    "\u0633\u062c\u0648\u062f":            "Suj\u00fbd (prosternation)",
    "\u0623\u0630\u0627\u0646":            "Adh\u00e2n (appel \u00e0 la pri\u00e8re)",
    "\u0630\u0643\u0631":             "Dhikr (rappel d'Allah)",
    "\u062f\u0639\u0627\u0621":            "Du'\u00e2 (supplication)",
    "\u0633\u0648\u0631\u0629":            "S\u00fbrah",
    "\u0622\u064a\u0629":             "\u00c2
