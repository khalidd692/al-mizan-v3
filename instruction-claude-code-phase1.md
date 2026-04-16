# INSTRUCTION CLAUDE CODE — AL-MĪZĀN v5.0 — PHASE 1

## Contexte du projet

Tu travailles sur **Al-Mīzān**, un moteur de takhrīj (vérification) de hadiths selon la méthodologie des Salaf aṣ-Ṣāliḥ. Le projet est sur GitHub : `khalidd692/al-mizan-v3`. Il est hébergé sur **Render** (déjà configuré et fonctionnel).

Le code actuel est une v3 qui a des problèmes structurels. On construit la **v5.0** à côté, sans détruire la v3.

La Constitution v5.0 du projet (fichier `Constitution_v4.md` dans le repo, nommage legacy) fait foi. Le README est obsolète sur certains points — si tu vois une contradiction entre README et Constitution, la Constitution gagne.

## Règles absolues pour cette session

1. **Crée une nouvelle branche `feature/v5-rebuild`** avant toute modification. Ne touche JAMAIS à `main`.
2. **Déplace tout le code actuel dans un dossier `legacy/`** (pas de suppression). Procédure : créer le dossier `legacy/`, y déplacer `api/`, `engine.js` (et autres fichiers v3 racine sauf `.git`, `README.md`, `Constitution_v4.md`, `package.json` si nécessaire à Render).
3. **Tous les commits sont atomiques et descriptifs** (un commit par étape logique).
4. **Push sur la branche `feature/v5-rebuild` à la fin**, pas sur main.
5. **Crée une Pull Request** à la fin vers main, avec un résumé clair de ce qui a été fait.
6. **Stack technique imposée** : Python 3.11, Starlette, uvicorn, vanilla JS (PAS de React, PAS de build step), CSS vanilla.
7. **Vérifie que Render redéploie bien** la branche feature (si le render.yaml pointe sur main, NE LE MODIFIE PAS — c'est normal, on testera la branche en local d'abord).

## Objectif de cette phase

Livrer une **base v5.0 fonctionnelle end-to-end avec des agents mockés**. À la fin :
- Un utilisateur peut lancer une recherche
- Le backend orchestre 4 agents qui retournent du JSON factice
- Le frontend affiche un Dashboard 3 colonnes propre
- Le streaming SSE fonctionne
- Tout boot sans erreur sur Render

Les agents réels et le cache viennent en phase 2.

---

## ÉTAPE 1 — Préparer la branche et sauvegarder le legacy

1. Crée la branche : `git checkout -b feature/v5-rebuild`
2. Crée un dossier `legacy/` à la racine
3. Déplace dedans tous les fichiers v3 sauf : `.git/`, `.gitignore`, `README.md`, `Constitution_v4.md`, `LICENSE` (s'il existe), `render.yaml` (s'il existe)
4. Commit : `chore: move v3 code to legacy folder`

**IMPORTANT** : si `render.yaml` pointe vers des fichiers maintenant dans `legacy/`, ne touche PAS au `render.yaml`. On laisse Render continuer à servir la v3 sur main. La v5 sera testée localement avant merge.

---

## ÉTAPE 2 — Créer la structure v5

Crée cette arborescence à la racine (en plus de `legacy/` qui existe déjà) :

```
al-mizan/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── base.css
│   │   ├── dashboard.css
│   │   └── isnad-tree.css
│   └── js/
│       ├── sse-client.js
│       ├── dashboard.js
│       └── isnad-tree.js
├── backend/
│   ├── __init__.py
│   ├── main.py
│   ├── orchestrator.py
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── agent_isnad.py
│   │   ├── agent_ilal.py
│   │   ├── agent_matn.py
│   │   ├── agent_tarjih.py
│   │   └── prompts/
│   │       ├── isnad.md
│   │       ├── ilal.md
│   │       ├── matn.md
│   │       └── tarjih.md
│   ├── corpus/
│   │   ├── __init__.py
│   │   └── loader.py
│   ├── dorar/
│   │   ├── __init__.py
│   │   └── client.py
│   └── utils/
│       ├── __init__.py
│       ├── sse.py
│       ├── constitution.py
│       └── logging.py
├── tests/
│   ├── __init__.py
│   ├── test_boot.py
│   └── test_orchestrator.py
├── requirements.txt
├── .env.example
└── README-v5.md
```

Commit : `feat: create v5 directory structure`

---

## ÉTAPE 3 — Backend : fichiers utilitaires et main

### `backend/utils/sse.py`

```python
"""Helpers pour Server-Sent Events conformes au protocole W3C."""

import json


def emit(event: str, data: dict) -> str:
    """Formate un événement SSE."""
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def keepalive() -> str:
    """Commentaire SSE pour maintenir la connexion."""
    return ": keepalive\n\n"
```

### `backend/utils/constitution.py`

```python
"""Bouclier doctrinal — Lexique de Fer + filtres Bidʿah.

À implémenter en phase 2. Pour l'instant, stub no-op.
"""


def enforce_lexique_de_fer(chunk: str) -> str:
    """Vérifie les traductions d'Attributs divins. TODO phase 2."""
    return chunk


def check_forbidden_terms(text: str) -> list[str]:
    """Détecte les termes sectaires/innovants. TODO phase 2."""
    return []
```

### `backend/utils/logging.py`

```python
"""Setup logger applicatif."""

import logging
import os


def get_logger(name: str) -> logging.Logger:
    level = os.environ.get("MIZAN_LOG_LEVEL", "INFO")
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        ))
        logger.addHandler(handler)
        logger.setLevel(level)
    return logger
```

### `backend/main.py`

```python
"""Al-Mīzān v5.0 — Point d'entrée Starlette/uvicorn."""

import os
import pathlib
from starlette.applications import Starlette
from starlette.routing import Route, Mount
from starlette.responses import JSONResponse, StreamingResponse
from starlette.staticfiles import StaticFiles
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware

from backend.orchestrator import Orchestrator
from backend.utils.logging import get_logger

log = get_logger("mizan.main")

_REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent

VERSION = "5.0.0-dev"

# Instance globale de l'orchestrateur
_orchestrator = Orchestrator(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


async def health(request):
    return JSONResponse({
        "status": "ok",
        "version": VERSION,
        "service": "Al-Mīzān — Moteur de Takhrīj",
    })


async def search(request):
    query = request.query_params.get("q", "").strip()
    if not query:
        return JSONResponse({"error": "Paramètre q requis"}, status_code=400)
    
    log.info(f"[SEARCH] Query: {query}")
    
    return StreamingResponse(
        _orchestrator.process(query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "X-Mizan-Version": VERSION,
        }
    )


routes = [
    Route("/api/health", health),
    Route("/api/search", search),
    Mount("/", app=StaticFiles(
        directory=str(_REPO_ROOT / "al-mizan" / "frontend"),
        html=True
    )),
]

middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["Content-Type", "Accept", "Cache-Control"],
    ),
]

app = Starlette(routes=routes, middleware=middleware)
```

Commit : `feat(backend): add main app + utils (sse, logging, constitution stub)`

---

## ÉTAPE 4 — Les 4 agents mockés

### `backend/agents/base.py`

```python
"""Classe abstraite commune aux 4 agents."""

import asyncio
from abc import ABC, abstractmethod
from backend.utils.sse import emit
from backend.utils.logging import get_logger

log = get_logger("mizan.agents")


class BaseAgent(ABC):
    AGENT_NAME: str = ""
    ZONES_PRODUCED: list[int] = []
    MOCK_MODE: bool = True

    def __init__(self, api_key: str):
        self.api_key = api_key

    @abstractmethod
    async def _mock_output(self, hadith_data: dict) -> dict:
        pass

    async def run(self, hadith_data: dict, queue: asyncio.Queue):
        """Point d'entrée appelé par l'orchestrateur."""
        try:
            if self.MOCK_MODE:
                output = await self._mock_output(hadith_data)
            else:
                raise NotImplementedError(f"{self.AGENT_NAME}: mode réel pas implémenté")

            for zone_num in self.ZONES_PRODUCED:
                zone_data = output.get(f"zone_{zone_num}", {"tawaqquf": True})
                await queue.put(emit(f"zone_{zone_num}", zone_data))
                await asyncio.sleep(0.3)

        except Exception as e:
            log.exception(f"[{self.AGENT_NAME}] Erreur")
            for zone_num in self.ZONES_PRODUCED:
                await queue.put(emit(f"zone_{zone_num}", {
                    "tawaqquf": True,
                    "reason": f"{self.AGENT_NAME} failed: {str(e)}"
                }))
```

### `backend/agents/agent_isnad.py`

```python
"""Agent 1 — Chaîne d'Isnād et Jarḥ wa Taʿdīl."""

from backend.agents.base import BaseAgent


class AgentIsnad(BaseAgent):
    AGENT_NAME = "ISNAD"
    ZONES_PRODUCED = [2, 3]

    async def _mock_output(self, hadith_data: dict) -> dict:
        return {
            "zone_2": {
                "type": "isnad_chain",
                "chain": [
                    {"name_ar": "محمد بن إسماعيل البخاري", "name_fr": "Al-Bukhārī", "verdict": "imam", "tabaqa": 11, "death_h": 256},
                    {"name_ar": "عبد الله بن يوسف", "name_fr": "ʿAbd Allāh b. Yūsuf", "verdict": "thiqah", "tabaqa": 10, "death_h": 218},
                    {"name_ar": "مالك بن أنس", "name_fr": "Mālik b. Anas", "verdict": "imam", "tabaqa": 7, "death_h": 179},
                    {"name_ar": "يحيى بن سعيد الأنصاري", "name_fr": "Yaḥyā b. Saʿīd al-Anṣārī", "verdict": "thiqah", "tabaqa": 5, "death_h": 143},
                    {"name_ar": "محمد بن إبراهيم التيمي", "name_fr": "Muḥammad b. Ibrāhīm al-Taymī", "verdict": "thiqah", "tabaqa": 4, "death_h": 120},
                    {"name_ar": "علقمة بن وقاص الليثي", "name_fr": "ʿAlqamah b. Waqqāṣ al-Laythī", "verdict": "thiqah", "tabaqa": 2, "death_h": 80},
                    {"name_ar": "عمر بن الخطاب", "name_fr": "ʿUmar b. al-Khaṭṭāb", "verdict": "sahabi", "tabaqa": 1, "death_h": 23},
                ],
                "ittisal": True,
                "mock": True,
            },
            "zone_3": {
                "type": "jarh_tadil",
                "mock": True,
                "note": "Les vraies citations du corpus arriveront phase 2",
            }
        }
```

### `backend/agents/agent_ilal.py`

```python
"""Agent 2 — ʿIlal, Tafarrud, Munkar."""

from backend.agents.base import BaseAgent


class AgentIlal(BaseAgent):
    AGENT_NAME = "ILAL"
    ZONES_PRODUCED = [6, 7, 8]

    async def _mock_output(self, hadith_data: dict) -> dict:
        return {
            "zone_6": {
                "type": "ilal",
                "illal_signalees": [],
                "conclusion": "Aucune ʿillah signalée dans le corpus Al-Mīzān",
                "mock": True,
            },
            "zone_7": {"type": "tafarrud", "est_isole": False, "mock": True},
            "zone_8": {"type": "munkar", "est_munkar": False, "mock": True},
        }
```

### `backend/agents/agent_matn.py`

```python
"""Agent 3 — Matn, Gharīb, Sabab, Āthār des Salaf."""

from backend.agents.base import BaseAgent


class AgentMatn(BaseAgent):
    AGENT_NAME = "MATN"
    ZONES_PRODUCED = [9, 10, 12, 13, 14]

    async def _mock_output(self, hadith_data: dict) -> dict:
        return {
            "zone_9": {"type": "gharib", "words": [], "mock": True},
            "zone_10": {"type": "sabab_wurud", "circonstance": "Non documentée dans le corpus mock", "mock": True},
            "zone_12": {"type": "athar_sahabah", "athar": [], "mock": True},
            "zone_13": {"type": "athar_tabiin", "athar": [], "mock": True},
            "zone_14": {"type": "positions_imams", "positions": [], "mock": True},
        }
```

### `backend/agents/agent_tarjih.py`

```python
"""Agent 4 — Ijmāʿ, Khilāf, Mukhtalif, Audit, Tarjīḥ final."""

from backend.agents.base import BaseAgent


class AgentTarjih(BaseAgent):
    AGENT_NAME = "TARJIH"
    ZONES_PRODUCED = [15, 16, 17, 28, 29]

    async def _mock_output(self, hadith_data: dict) -> dict:
        return {
            "zone_15": {"type": "ijma", "ijma_detected": False, "mock": True},
            "zone_16": {"type": "khilaf", "divergences": [], "mock": True},
            "zone_17": {"type": "mukhtalif", "conflits": [], "mock": True},
            "zone_28": {"type": "audit_contemporain", "audits": [], "mock": True},
            "zone_29": {
                "type": "tarjih_final",
                "avis_rajih": "En attente du corpus réel",
                "mock": True,
            },
        }
```

### Fichiers prompts vides

Crée les 4 fichiers `backend/agents/prompts/*.md` avec juste :

```markdown
# Prompt [NOM_AGENT]

À rédiger en phase 2 quand le corpus sera disponible.

## Règles absolues

- Cet agent ne produit JAMAIS de verdict de sa propre autorité
- Il cite uniquement les IDs de citations fournies dans le contexte
- Si aucune citation ne couvre le sujet → tawaqquf explicite
```

Commit : `feat(agents): add 4 mocked specialized agents + prompt stubs`

---

## ÉTAPE 5 — Orchestrateur

### `backend/orchestrator.py`

```python
"""Orchestrateur Al-Mīzān v5.0.

Pilote les 4 agents spécialisés en parallèle via une queue partagée.
Streame les 32 zones au fur et à mesure via SSE.
"""

import asyncio
from typing import AsyncGenerator

from backend.agents.agent_isnad import AgentIsnad
from backend.agents.agent_ilal import AgentIlal
from backend.agents.agent_matn import AgentMatn
from backend.agents.agent_tarjih import AgentTarjih
from backend.utils.sse import emit, keepalive
from backend.utils.logging import get_logger

log = get_logger("mizan.orchestrator")

GLOBAL_TIMEOUT_S = 55.0
KEEPALIVE_INTERVAL_S = 10.0


class Orchestrator:
    def __init__(self, api_key: str):
        self.agents = [
            AgentIsnad(api_key),
            AgentIlal(api_key),
            AgentMatn(api_key),
            AgentTarjih(api_key),
        ]

    async def process(self, query: str) -> AsyncGenerator[str, None]:
        """Pipeline complet avec timeout global de sécurité."""
        try:
            async for chunk in self._process_inner(query):
                yield chunk
        except asyncio.TimeoutError:
            log.warning(f"[TIMEOUT] Query dépassée: {query}")
            yield emit("zone_32", {"type": "done", "partial": True, "reason": "global_timeout"})
        except Exception as e:
            log.exception(f"[ORCHESTRATOR] Erreur critique")
            yield emit("error", {"message": str(e)})
            yield emit("zone_32", {"type": "done", "error": True})

    async def _process_inner(self, query: str) -> AsyncGenerator[str, None]:
        # ── Zone 1 : INITIALISATION ───────────────────────────
        yield emit("zone_1", {
            "zone": 1, "step": "INITIALISATION",
            "message": "Ouverture des registres"
        })

        # ── Zone 2 : TRADUCTION (mock pour l'instant) ──────────
        # Note : la vraie traduction FR→AR sera réintroduite phase 2
        yield emit("zone_pipeline_traduction", {
            "step": "TRADUCTION",
            "message": f"Requête: {query}"
        })

        # ── Zones 3-4 : DORAR (mock pour l'instant) ────────────
        yield emit("zone_3", {"zone": 3, "step": "DORAR_REQUETE"})
        
        hadith_data = {
            "matn": "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى",
            "translation_fr": "Les actions ne valent que par les intentions, et chaque homme n'aura que ce qu'il a eu l'intention d'obtenir.",
            "source": "Ṣaḥīḥ al-Bukhārī n°1",
            "grade_raw": "صحيح",
            "mock": True,
        }
        
        yield emit("zone_4", {
            "zone": 4,
            "type": "hadith_core",
            "data": hadith_data
        })

        # ── Zones 5-29 : 4 agents en parallèle ─────────────────
        queue: asyncio.Queue = asyncio.Queue()

        async def run_all_agents():
            tasks = [agent.run(hadith_data, queue) for agent in self.agents]
            await asyncio.gather(*tasks, return_exceptions=True)
            await queue.put(None)  # Sentinelle

        agent_task = asyncio.create_task(run_all_agents())
        
        while True:
            try:
                chunk = await asyncio.wait_for(queue.get(), timeout=KEEPALIVE_INTERVAL_S)
                if chunk is None:
                    break
                yield chunk
            except asyncio.TimeoutError:
                yield keepalive()

        await agent_task

        # ── Zones 30-32 : CLÔTURE ──────────────────────────────
        yield emit("zone_30", {"zone": 30, "step": "SYNTHESE", "message": "Pipeline terminé"})
        yield emit("zone_31", {"zone": 31, "step": "VERIFICATION"})
        yield emit("zone_32", {"zone": 32, "type": "done"})
```

### Fichiers stubs à créer (juste docstring) :

- `backend/corpus/loader.py` : `"""Chargement du corpus. À implémenter phase 2."""`
- `backend/dorar/client.py` : `"""Client Dorar.net. À implémenter phase 2."""`

Commit : `feat(orchestrator): add SSE orchestrator with 4-agent parallel pipeline`

---

## ÉTAPE 6 — Frontend Dashboard 3 colonnes

### `al-mizan/frontend/index.html`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>الميزان — Al-Mīzān</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Cinzel:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/dashboard.css">
  <link rel="stylesheet" href="/css/isnad-tree.css">
</head>
<body>
  <header class="mz-header">
    <h1 class="mz-logo">الميزان</h1>
    <form id="mz-search-form" dir="rtl">
      <input type="text" id="mz-query" placeholder="ابحث عن حديث..." autocomplete="off">
      <button type="submit">بحث</button>
    </form>
  </header>

  <main class="mz-dashboard" id="mz-dashboard">
    <aside class="mz-col mz-col-left" data-col="isnad">
      <h2 class="mz-col-title">سلسلة الإسناد</h2>
      <div id="isnad-tree" class="isnad-tree-container">
        <p class="mz-empty">En attente de données...</p>
      </div>
    </aside>

    <section class="mz-col mz-col-center" data-col="matn">
      <div class="mz-matn-block">
        <div id="matn-verdict" class="mz-verdict-banner"></div>
        <div id="matn-arabic" class="mz-matn-ar"></div>
        <div id="matn-french" class="mz-matn-fr"></div>
        <div id="matn-sources" class="mz-sources"></div>
      </div>

      <nav class="mz-tabs" id="mz-tabs">
        <button class="mz-tab" data-tab="isnad">الإسناد</button>
        <button class="mz-tab" data-tab="ilal">العلل</button>
        <button class="mz-tab" data-tab="gharib">الغريب</button>
        <button class="mz-tab" data-tab="sabab">سبب الورود</button>
        <button class="mz-tab" data-tab="athar">الآثار</button>
        <button class="mz-tab" data-tab="ijma">الإجماع</button>
        <button class="mz-tab" data-tab="mukhtalif">المختلف</button>
        <button class="mz-tab" data-tab="tarjih">الترجيح</button>
      </nav>
      <div id="tabs-content" class="mz-tabs-content"></div>
    </section>

    <aside class="mz-col mz-col-right" data-col="evidence">
      <h2 class="mz-col-title">سجل الأدلة</h2>
      <div id="evidence-log" class="evidence-log-container">
        <p class="mz-empty">Les preuves apparaîtront ici...</p>
      </div>
    </aside>
  </main>

  <footer class="mz-status-bar">
    <div id="progress-bar" class="mz-progress"></div>
    <div id="status-text" class="mz-status-text">Prêt</div>
  </footer>

  <script src="/js/sse-client.js"></script>
  <script src="/js/isnad-tree.js"></script>
  <script src="/js/dashboard.js"></script>
</body>
</html>
```

### `al-mizan/frontend/css/base.css`

```css
:root {
  --mz-bg: #0c0800;
  --mz-bg-elevated: #1a1408;
  --mz-gold: #c9a84c;
  --mz-gold-light: #e0c070;
  --mz-gold-dim: rgba(201, 168, 76, 0.3);
  --mz-text: #dcc896;
  --mz-text-dim: rgba(220, 200, 150, 0.6);
  --mz-border: rgba(201, 168, 76, 0.18);
  --mz-green: #22c55e;
  --mz-yellow: #f59e0b;
  --mz-red: #dc2626;
  --mz-purple: #7c3aed;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  overflow: hidden;
}

body {
  background: var(--mz-bg);
  color: var(--mz-text);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 16px;
  line-height: 1.6;
}

h1, h2, h3 {
  font-family: 'Cinzel', serif;
  color: var(--mz-gold);
  font-weight: 600;
}

.mz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--mz-border);
  background: var(--mz-bg-elevated);
  height: 72px;
}

.mz-logo {
  font-family: 'Scheherazade New', serif;
  font-size: 2.5rem;
  color: var(--mz-gold);
  margin: 0;
}

#mz-search-form {
  display: flex;
  gap: 8px;
  flex: 1;
  max-width: 600px;
  margin-left: 32px;
}

#mz-query {
  flex: 1;
  padding: 10px 16px;
  background: var(--mz-bg);
  border: 1px solid var(--mz-border);
  border-radius: 8px;
  color: var(--mz-text);
  font-family: 'Scheherazade New', 'Cormorant Garamond', serif;
  font-size: 18px;
  outline: none;
  transition: border-color 0.2s;
}

#mz-query:focus { border-color: var(--mz-gold); }

#mz-search-form button {
  padding: 10px 24px;
  background: var(--mz-gold);
  color: var(--mz-bg);
  border: none;
  border-radius: 8px;
  font-family: 'Cinzel', serif;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

#mz-search-form button:hover { background: var(--mz-gold-light); }

.mz-empty {
  color: var(--mz-text-dim);
  font-style: italic;
  text-align: center;
  padding: 32px 16px;
}

.mz-status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 32px;
  background: var(--mz-bg-elevated);
  border-top: 1px solid var(--mz-border);
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.mz-progress {
  flex: 1;
  height: 3px;
  background: var(--mz-gold-dim);
  border-radius: 2px;
  overflow: hidden;
  margin-right: 16px;
}

.mz-progress::before {
  content: "";
  display: block;
  height: 100%;
  width: 0;
  background: var(--mz-gold);
  transition: width 0.3s;
}

.mz-progress.active::before { width: var(--progress, 0%); }

.mz-status-text {
  font-size: 12px;
  color: var(--mz-text-dim);
  font-family: 'Cinzel', serif;
  letter-spacing: 0.1em;
}
```

### `al-mizan/frontend/css/dashboard.css`

```css
.mz-dashboard {
  display: grid;
  grid-template-columns: 25% 50% 25%;
  gap: 12px;
  padding: 12px;
  height: calc(100vh - 72px - 32px);
  overflow: hidden;
}

.mz-col {
  background: var(--mz-bg-elevated);
  border: 1px solid var(--mz-border);
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--mz-gold-dim) transparent;
}

.mz-col::-webkit-scrollbar { width: 8px; }
.mz-col::-webkit-scrollbar-track { background: transparent; }
.mz-col::-webkit-scrollbar-thumb {
  background: var(--mz-gold-dim);
  border-radius: 4px;
}

.mz-col-title {
  font-family: 'Scheherazade New', serif;
  font-size: 1.5rem;
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--mz-border);
  margin-bottom: 16px;
}

/* COLONNE CENTRALE */
.mz-matn-block {
  margin-bottom: 24px;
}

.mz-verdict-banner {
  padding: 8px 16px;
  border-radius: 8px;
  text-align: center;
  font-family: 'Cinzel', serif;
  font-size: 12px;
  letter-spacing: 0.15em;
  margin-bottom: 16px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mz-verdict-banner.sahih {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: var(--mz-green);
}

.mz-verdict-banner.hasan {
  background: rgba(74, 222, 128, 0.08);
  border: 1px solid rgba(74, 222, 128, 0.25);
  color: #4ade80;
}

.mz-verdict-banner.daif {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: var(--mz-yellow);
}

.mz-verdict-banner.mawdu {
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.3);
  color: var(--mz-red);
}

.mz-matn-ar {
  font-family: 'Scheherazade New', serif;
  font-size: 1.8rem;
  line-height: 2.2;
  color: var(--mz-text);
  text-align: center;
  padding: 24px 16px;
  background: rgba(12, 8, 0, 0.4);
  border-radius: 12px;
  margin-bottom: 16px;
  min-height: 80px;
}

.mz-matn-fr {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.1rem;
  font-style: italic;
  color: var(--mz-text-dim);
  text-align: center;
  padding: 8px 16px;
  margin-bottom: 12px;
  direction: ltr;
}

.mz-sources {
  font-family: 'Cinzel', serif;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--mz-gold);
  text-align: center;
  padding: 8px;
  direction: ltr;
}

/* ONGLETS */
.mz-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  padding: 12px 0;
  border-bottom: 1px solid var(--mz-border);
  margin-bottom: 16px;
  justify-content: center;
}

.mz-tab {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--mz-border);
  border-radius: 6px;
  color: var(--mz-text-dim);
  font-family: 'Scheherazade New', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.mz-tab:hover {
  border-color: var(--mz-gold);
  color: var(--mz-text);
}

.mz-tab.active {
  background: var(--mz-gold);
  color: var(--mz-bg);
  border-color: var(--mz-gold);
}

.mz-tabs-content {
  padding: 16px 0;
  min-height: 200px;
}

.mz-tab-panel {
  display: none;
  animation: fadeIn 0.3s;
}

.mz-tab-panel.active { display: block; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* COLONNE DROITE : JOURNAL DES PREUVES */
.evidence-log-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.evidence-item {
  padding: 12px;
  background: rgba(12, 8, 0, 0.4);
  border: 1px solid var(--mz-border);
  border-radius: 8px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
}

.evidence-item .evidence-author {
  font-family: 'Cinzel', serif;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--mz-gold);
  margin-bottom: 6px;
}

.evidence-item .evidence-date {
  font-size: 11px;
  color: var(--mz-text-dim);
  float: right;
}

/* RESPONSIVE MOBILE */
@media (max-width: 900px) {
  .mz-dashboard {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  
  .mz-col-left, .mz-col-right {
    display: none;
  }
  
  .mz-col-left.mobile-active,
  .mz-col-right.mobile-active {
    display: block;
  }
}
```

### `al-mizan/frontend/css/isnad-tree.css`

```css
.isnad-tree-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 16px 0;
}

.isnad-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
}

.isnad-node-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Scheherazade New', serif;
  font-size: 12px;
  text-align: center;
  padding: 4px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid;
  position: relative;
  z-index: 2;
  background: var(--mz-bg-elevated);
}

.isnad-node-circle:hover {
  transform: scale(1.1);
  box-shadow: 0 0 20px currentColor;
}

.isnad-node-circle.verdict-imam {
  border-color: var(--mz-gold);
  color: var(--mz-gold);
}

.isnad-node-circle.verdict-sahabi {
  border-color: var(--mz-gold-light);
  color: var(--mz-gold-light);
  background: rgba(224, 192, 112, 0.1);
}

.isnad-node-circle.verdict-thiqah {
  border-color: var(--mz-green);
  color: var(--mz-green);
}

.isnad-node-circle.verdict-saduq {
  border-color: #4ade80;
  color: #4ade80;
}

.isnad-node-circle.verdict-daif {
  border-color: var(--mz-yellow);
  color: var(--mz-yellow);
}

.isnad-node-circle.verdict-matruk {
  border-color: var(--mz-red);
  color: var(--mz-red);
}

.isnad-connector {
  width: 2px;
  height: 24px;
  background: var(--mz-gold-dim);
  position: relative;
  z-index: 1;
}

.isnad-node-label {
  font-family: 'Cinzel', serif;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--mz-text-dim);
  margin-top: 4px;
  text-align: center;
  direction: ltr;
}

.isnad-tooltip {
  position: absolute;
  top: 0;
  left: calc(100% + 12px);
  background: var(--mz-bg-elevated);
  border: 1px solid var(--mz-gold);
  border-radius: 8px;
  padding: 12px;
  min-width: 200px;
  font-size: 12px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;
}

.isnad-node:hover .isnad-tooltip {
  opacity: 1;
}
```

### `al-mizan/frontend/js/sse-client.js`

```javascript
/* Client SSE Al-Mīzān — Consommateur fiable avec reconnexion */

class MizanSSEClient {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.controller = null;
    this.lastActivity = Date.now();
    this.connected = false;
  }

  async connect(query) {
    this.disconnect();
    this.controller = new AbortController();
    this.connected = true;
    this.lastActivity = Date.now();

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        this.lastActivity = Date.now();

        const events = buffer.split('\n\n');
        buffer = events.pop();

        for (const raw of events) {
          const parsed = this._parseSSE(raw);
          if (parsed) this.onEvent(parsed.event, parsed.data);
        }
      }

      if (buffer.trim()) {
        const parsed = this._parseSSE(buffer);
        if (parsed) this.onEvent(parsed.event, parsed.data);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[SSE]', err);
        this.onEvent('error', { message: err.message });
      }
    } finally {
      this.connected = false;
    }
  }

  _parseSSE(block) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith(':')) return null;

    let event = 'message';
    let data = '';

    for (const line of trimmed.split('\n')) {
      const clean = line.trim();
      if (clean.startsWith('event:')) event = clean.substring(6).trim();
      else if (clean.startsWith('data:')) {
        const frag = clean.substring(5).trim();
        data = data ? data + '\n' + frag : frag;
      }
    }

    if (!data) return null;
    try { return { event, data: JSON.parse(data) }; }
    catch { return { event, data: { raw: data } }; }
  }

  disconnect() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    this.connected = false;
  }
}

window.MizanSSEClient = MizanSSEClient;
```

### `al-mizan/frontend/js/isnad-tree.js`

```javascript
/* Arbre d'Isnād vertical — rendu SVG/DOM léger */

class IsnadTree {
  constructor(container) {
    this.container = container;
  }

  render(chain) {
    if (!chain || chain.length === 0) {
      this.container.innerHTML = '<p class="mz-empty">Pas de chaîne disponible</p>';
      return;
    }

    this.container.innerHTML = '';

    chain.forEach((narrator, idx) => {
      const node = document.createElement('div');
      node.className = 'isnad-node';

      const circle = document.createElement('div');
      circle.className = `isnad-node-circle verdict-${narrator.verdict || 'unknown'}`;
      circle.textContent = this._shortName(narrator.name_ar || '');
      node.appendChild(circle);

      const label = document.createElement('div');
      label.className = 'isnad-node-label';
      label.textContent = narrator.name_fr || '';
      if (narrator.death_h) label.textContent += ` (m. ${narrator.death_h}H)`;
      node.appendChild(label);

      const tooltip = document.createElement('div');
      tooltip.className = 'isnad-tooltip';
      tooltip.innerHTML = `
        <div style="font-family:'Scheherazade New',serif;font-size:14px;margin-bottom:6px;">${narrator.name_ar || ''}</div>
        <div style="font-size:11px;color:var(--mz-text-dim);">Ṭabaqah ${narrator.tabaqa || '?'}</div>
        <div style="font-size:11px;color:var(--mz-gold);margin-top:4px;">${narrator.verdict || 'unknown'}</div>
      `;
      node.appendChild(tooltip);

      this.container.appendChild(node);

      if (idx < chain.length - 1) {
        const connector = document.createElement('div');
        connector.className = 'isnad-connector';
        this.container.appendChild(connector);
      }
    });
  }

  _shortName(fullName) {
    if (!fullName) return '?';
    const parts = fullName.split(' ');
    if (parts.length <= 2) return fullName;
    return parts.slice(0, 2).join(' ');
  }

  clear() {
    this.container.innerHTML = '<p class="mz-empty">En attente de données...</p>';
  }
}

window.IsnadTree = IsnadTree;
```

### `al-mizan/frontend/js/dashboard.js`

```javascript
/* Dashboard Al-Mīzān — Orchestration UI */

(function() {
  'use strict';

  const form = document.getElementById('mz-search-form');
  const queryInput = document.getElementById('mz-query');
  const matnAr = document.getElementById('matn-arabic');
  const matnFr = document.getElementById('matn-french');
  const matnSources = document.getElementById('matn-sources');
  const verdictBanner = document.getElementById('matn-verdict');
  const tabsContent = document.getElementById('tabs-content');
  const tabs = document.querySelectorAll('.mz-tab');
  const evidenceLog = document.getElementById('evidence-log');
  const statusText = document.getElementById('status-text');
  const progressBar = document.getElementById('progress-bar');
  const isnadContainer = document.getElementById('isnad-tree');

  const tree = new IsnadTree(isnadContainer);
  const sse = new MizanSSEClient(onZone);

  let zonesReceived = 0;
  const TOTAL_ZONES = 32;

  // ── Onglets ──────────────────────────────────────────────
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showTabPanel(tab.dataset.tab);
    });
  });

  function showTabPanel(tabName) {
    const panels = tabsContent.querySelectorAll('.mz-tab-panel');
    panels.forEach(p => p.classList.remove('active'));
    const target = tabsContent.querySelector(`[data-panel="${tabName}"]`);
    if (target) target.classList.add('active');
  }

  // Active le premier onglet par défaut
  if (tabs.length > 0) tabs[0].click();

  // ── Formulaire ────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = queryInput.value.trim();
    if (!query) return;
    resetUI();
    setStatus('Recherche en cours...');
    setProgress(2);
    await sse.connect(query);
    setStatus('Terminé');
    setProgress(100);
  });

  // ── Reset UI ──────────────────────────────────────────────
  function resetUI() {
    matnAr.textContent = '';
    matnFr.textContent = '';
    matnSources.textContent = '';
    verdictBanner.textContent = '';
    verdictBanner.className = 'mz-verdict-banner';
    tree.clear();
    tabsContent.innerHTML = '';
    evidenceLog.innerHTML = '<p class="mz-empty">Les preuves apparaîtront ici...</p>';
    zonesReceived = 0;
  }

  function setStatus(txt) { statusText.textContent = txt; }
  function setProgress(pct) {
    progressBar.classList.add('active');
    progressBar.style.setProperty('--progress', `${pct}%`);
  }

  // ── Routeur de zones ──────────────────────────────────────
  function onZone(event, data) {
    console.log(`[ZONE] ${event}`, data);
    zonesReceived++;
    setProgress(Math.min(95, (zonesReceived / TOTAL_ZONES) * 100));

    if (event === 'zone_1') setStatus('Initialisation');
    else if (event === 'zone_3') setStatus('Recherche Dorar');
    else if (event === 'zone_4') renderHadithCore(data.data);
    else if (event === 'zone_2') renderIsnad(data);
    else if (event === 'zone_3') renderTabPanel('isnad', data);
    else if (event === 'zone_6') renderTabPanel('ilal', data);
    else if (event === 'zone_7' || event === 'zone_8') appendToTab('ilal', data);
    else if (event === 'zone_9') renderTabPanel('gharib', data);
    else if (event === 'zone_10') renderTabPanel('sabab', data);
    else if (event === 'zone_12' || event === 'zone_13' || event === 'zone_14') appendToTab('athar', data);
    else if (event === 'zone_15') renderTabPanel('ijma', data);
    else if (event === 'zone_16' || event === 'zone_17') appendToTab('mukhtalif', data);
    else if (event === 'zone_28' || event === 'zone_29') appendToTab('tarjih', data);
    else if (event === 'zone_32') setStatus('Terminé ✓');
    else if (event === 'error') setStatus('Erreur : ' + (data.message || 'inconnue'));
  }

  function renderHadithCore(data) {
    if (!data) return;
    matnAr.textContent = data.matn || '';
    matnFr.textContent = data.translation_fr || '';
    matnSources.textContent = data.source || '';
    const grade = (data.grade_raw || '').toLowerCase();
    verdictBanner.className = 'mz-verdict-banner';
    if (grade.includes('صحيح')) verdictBanner.classList.add('sahih');
    else if (grade.includes('حسن')) verdictBanner.classList.add('hasan');
    else if (grade.includes('ضعيف')) verdictBanner.classList.add('daif');
    else if (grade.includes('موضوع')) verdictBanner.classList.add('mawdu');
    verdictBanner.textContent = data.grade_raw || 'En cours...';
  }

  function renderIsnad(data) {
    if (data && data.chain) tree.render(data.chain);
  }

  function renderTabPanel(tabName, data) {
    let panel = tabsContent.querySelector(`[data-panel="${tabName}"]`);
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'mz-tab-panel';
      panel.dataset.panel = tabName;
      tabsContent.appendChild(panel);
    }
    const content = document.createElement('div');
    content.className = 'mz-tab-data';
    content.innerHTML = `<pre style="font-size:11px;white-space:pre-wrap;color:var(--mz-text-dim);">${JSON.stringify(data, null, 2)}</pre>`;
    panel.appendChild(content);
    if (!tabsContent.querySelector('.mz-tab-panel.active')) panel.classList.add('active');
  }

  function appendToTab(tabName, data) {
    renderTabPanel(tabName, data);
  }

})();
```

Commit : `feat(frontend): add 3-column dashboard with SSE client and isnād tree`

---

## ÉTAPE 7 — Tests et configuration

### `tests/test_boot.py`

```python
"""Test de boot minimal."""

from starlette.testclient import TestClient
from backend.main import app


def test_health():
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_search_requires_query():
    client = TestClient(app)
    r = client.get("/api/search")
    assert r.status_code == 400
```

### `tests/test_orchestrator.py`

```python
"""Test de l'orchestrateur avec agents mockés."""

import pytest
from backend.orchestrator import Orchestrator


@pytest.mark.asyncio
async def test_orchestrator_produces_all_zones():
    orch = Orchestrator(api_key="test")
    zones_seen = set()
    async for chunk in orch.process("test query"):
        if chunk.startswith("event: zone_"):
            zone = chunk.split("\n")[0].replace("event: ", "")
            zones_seen.add(zone)
    
    # Vérifier les zones clés
    assert "zone_1" in zones_seen
    assert "zone_32" in zones_seen
    assert "zone_4" in zones_seen
```

### `requirements.txt`

```
starlette==0.37.2
uvicorn[standard]==0.30.1
anthropic==0.39.0
httpx==0.27.0
aiosqlite==0.20.0
lxml==5.2.2
pytest==8.2.0
pytest-asyncio==0.23.6
```

### `.env.example`

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
MIZAN_ENV=development
MIZAN_LOG_LEVEL=INFO
```

### `README-v5.md`

```markdown
# Al-Mīzān v5.0

Moteur de takhrīj de hadiths selon la méthodologie des Salaf aṣ-Ṣāliḥ.

## Architecture

- **Backend** : Python 3.11 + Starlette + uvicorn, 4 agents spécialisés parallèles
- **Frontend** : Vanilla JS + CSS Grid, Dashboard 3 colonnes
- **Streaming** : SSE temps réel, 32 zones hiérarchisées
- **Hébergement** : Render (Web Service)

## Démarrage local

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Ouvrir http://localhost:8000

## Structure

- `backend/` — Serveur Python
- `al-mizan/frontend/` — Interface web
- `legacy/` — Ancienne v3 (conservée pour référence)
- `tests/` — Tests unitaires

## Phase actuelle

**Phase 1** : Squelette + pipeline SSE avec agents mockés.
Les agents réels et le corpus de citations arrivent en Phase 2.
```

Commit : `feat(tests): add boot and orchestrator tests + docs`

---

## ÉTAPE 8 — Validation finale et push

1. Lance `pip install -r requirements.txt`
2. Lance `pytest tests/ -v`  → les 3 tests doivent passer
3. Lance `uvicorn backend.main:app --reload` en arrière-plan
4. Test manuel : `curl http://localhost:8000/api/health` → doit retourner le JSON
5. Test manuel : `curl -N "http://localhost:8000/api/search?q=test"` → doit streamer les zones en ~10s
6. Ouvre http://localhost:8000 dans un navigateur → Dashboard doit apparaître
7. Tape "test" dans la barre de recherche → les zones doivent s'afficher
8. Arrête uvicorn
9. `git add -A && git commit -m "chore: finalize v5.0 phase 1"`
10. `git push -u origin feature/v5-rebuild`
11. Crée la Pull Request via GitHub CLI : `gh pr create --title "v5.0 Phase 1: Backend skeleton + Dashboard + Mocked agents" --body "Voir docs/cline/instruction-phase1.md"`

---

## Rapport final attendu

Quand tout est fini, réponds-moi avec ce format exact :

```
═══════════════════════════════════════
AL-MĪZĀN v5.0 — PHASE 1 TERMINÉE
═══════════════════════════════════════

📁 Fichiers créés : [nombre]
📝 Commits : [nombre]
✅ Tests passés : [X/3]
🌐 Boot uvicorn : [ok/erreur]
🔗 Branch pushed : feature/v5-rebuild
🎯 PR créée : [URL de la PR]

⚠️ Problèmes rencontrés :
[liste courte ou "aucun"]

📋 Validation manuelle à faire par l'utilisateur :
1. Ouvrir la PR sur GitHub
2. Pull la branche localement
3. Lancer uvicorn et tester l'UI
4. Merger si OK → déclenche déploiement Render

Prêt pour Phase 2 (Dorar réel + Agents IA + Cache) quand tu donneras le feu vert.
```

---

## Règles de survie à NE JAMAIS enfreindre

1. **Ne touche pas à `main`** — tout sur `feature/v5-rebuild`
2. **Ne supprime rien du v3** — tout dans `legacy/`
3. **Ne modifie pas `render.yaml`** sans me prévenir
4. **Pas de React, pas de build step** — vanilla JS strict
5. **Pas de logique métier dans le frontend** — il n'affiche que ce que le backend envoie
6. **Si un test échoue, ne triche pas** — signale-le dans le rapport final
7. **Commits atomiques et descriptifs** — un commit par étape logique nommée ci-dessus
