# System Architecture — FinTrack AI

> **Personal Finance Management Application**
> Architecture diagram depicting the full microservices topology, data flows, and external integrations.

```mermaid
graph TD
    %% ─── Colour palette ───────────────────────────────────────────────────
    classDef client     fill:#3B82F6,stroke:#1D4ED8,color:#fff,rx:8
    classDef mobile     fill:#6366F1,stroke:#4338CA,color:#fff,rx:8
    classDef gateway    fill:#0EA5E9,stroke:#0369A1,color:#fff,rx:6
    classDef svcNode    fill:#10B981,stroke:#047857,color:#fff,rx:6
    classDef svcAI      fill:#8B5CF6,stroke:#6D28D9,color:#fff,rx:6
    classDef db         fill:#F59E0B,stroke:#B45309,color:#fff,rx:4
    classDef cache      fill:#EF4444,stroke:#B91C1C,color:#fff,rx:4
    classDef external   fill:#EC4899,stroke:#BE185D,color:#fff,rx:6
    classDef infra      fill:#6B7280,stroke:#374151,color:#fff,rx:4
    classDef queue      fill:#F97316,stroke:#C2410C,color:#fff,rx:6

    %% ══════════════════════════════════════════════════════════════════════
    subgraph CLIENT_LAYER["  Client Applications  "]
        direction LR
        WEB["🌐 Web Dashboard\nNext.js · Tailwind CSS · Recharts"]
        MOB["📱 Mobile App\nReact Native · Expo"]
    end

    %% ──────────────────────────────────────────────────────────────────────
    subgraph GATEWAY_LAYER["  API Gateway Layer  "]
        GW["🔀 API Gateway\nNode.js · Express\nJWT Verification · Rate Limiting · BFF Adapters"]
    end

    %% ──────────────────────────────────────────────────────────────────────
    subgraph SERVICES["  Microservices Cluster  "]
        direction TB

        subgraph CORE["Core Services (Node.js / TypeScript)"]
            ID["🔐 identity-service\nUser Auth · App Settings\nAI Quotas · API Key Mgmt"]
            TX["💳 transaction-service\nWallets · Income/Expense\nCashflow Analytics"]
            INV["🧾 invoice-service\nReceipt Processing\nCloudinary Integration"]
        end

        subgraph AI_SVC["AI Layer"]
            AIAG["🤖 ai-advisor-service\nPython · Agentic RAG\nGemini API · Search Grounding\nNLP Transaction Entry · Financial Advisory"]
        end
    end

    %% ──────────────────────────────────────────────────────────────────────
    subgraph MESSAGING["  Async Messaging  "]
        RMQ["🐇 RabbitMQ\nEvent Bus"]
    end

    %% ──────────────────────────────────────────────────────────────────────
    subgraph PERSISTENCE["  Data Persistence  "]
        direction LR
        DB_ID[("🗄️ MongoDB Atlas\nidentity-db")]
        DB_TX[("🗄️ MongoDB Atlas\ntransaction-db")]
        DB_INV[("🗄️ MongoDB Atlas\ninvoice-db")]
        DB_AI[("🗄️ MongoDB Atlas\nai-context-db")]
        REDIS[("⚡ Redis\nDistributed Cache\nSession · Rate-limit · AI Context")]
    end

    %% ──────────────────────────────────────────────────────────────────────
    subgraph EXTERNAL["  External Cloud Services  "]
        GEMINI["✨ Google Gemini API\nLLM · Function Calling"]
        GSEARCH["🔍 Google Search Grounding\nReal-time Market Data"]
        CLOUD["☁️ Cloudinary\nImage Storage & CDN"]
        FCMAPNS["🔔 FCM / APNs\nPush Notifications"]
    end

    %% ──────────────────────────────────────────────────────────────────────
    subgraph INFRA["  Infrastructure & DevOps  "]
        direction LR
        DOCKER["🐳 Docker Compose\nContainer Orchestration"]
        MONGO_ATLAS["🌍 MongoDB Atlas\nCloud Database Cluster"]
    end

    %% ══════════════════════════════════════════════════════════════════════
    %% Data-flow edges
    WEB  -->|"HTTPS REST / WS"| GW
    MOB  -->|"HTTPS REST / WS"| GW

    GW -->|"REST"| ID
    GW -->|"REST"| TX
    GW -->|"REST"| INV
    GW -->|"REST / SSE"| AIAG

    ID   -->|"Read / Write"| DB_ID
    TX   -->|"Read / Write"| DB_TX
    INV  -->|"Read / Write"| DB_INV
    AIAG -->|"Read / Write"| DB_AI

    ID   <-->|"Cache"| REDIS
    TX   <-->|"Cache"| REDIS
    AIAG <-->|"AI Context Cache"| REDIS

    TX  -->|"Publish events"| RMQ
    ID  -->|"Publish events"| RMQ
    RMQ -->|"Consume"| AIAG
    RMQ -->|"Consume"| INV

    INV  -->|"Upload / Fetch CDN"| CLOUD
    AIAG -->|"LLM Inference"| GEMINI
    AIAG -->|"Grounding Tool Call"| GSEARCH
    GEMINI -->|"Search Results"| GSEARCH

    ID  -->|"Push Triggers"| FCMAPNS
    FCMAPNS -->|"Deliver"| MOB

    DOCKER -.->|"Runs"| SERVICES
    DOCKER -.->|"Runs"| MESSAGING
    MONGO_ATLAS -.->|"Hosts"| PERSISTENCE

    %% ══════════════════════════════════════════════════════════════════════
    %% Apply styles
    class WEB client
    class MOB mobile
    class GW gateway
    class ID,TX,INV svcNode
    class AIAG svcAI
    class DB_ID,DB_TX,DB_INV,DB_AI db
    class REDIS cache
    class GEMINI,GSEARCH,CLOUD,FCMAPNS external
    class DOCKER,MONGO_ATLAS infra
    class RMQ queue
```

---

## Subgraph Legend

| Colour | Layer |
|--------|-------|
| 🔵 Blue | Web client (Next.js) |
| 🟣 Indigo | Mobile client (React Native) |
| 🩵 Sky | API Gateway |
| 🟢 Emerald | Core Node.js microservices |
| 🟣 Violet | AI advisor service (Python) |
| 🟡 Amber | MongoDB Atlas databases |
| 🔴 Red | Redis cache |
| 🩷 Pink | External cloud services |
| 🟠 Orange | RabbitMQ message broker |
| ⬜ Gray | Infrastructure / DevOps |

---

## Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Database-per-Service** | Each microservice owns its MongoDB Atlas instance, enforcing strict data isolation and independent scalability. |
| **API Gateway BFF** | A single entry point handles JWT verification, rate limiting, and service-specific payload shaping (BFF adapters per service). |
| **Agentic RAG on ai-advisor-service** | Combines retrieval of user financial history with LLM reasoning and real-time Search Grounding, enabling grounded and personalised financial advice. |
| **RabbitMQ Event Bus** | Decouples services for cross-cutting concerns (e.g., transaction-created → AI context update, invoice-processed → transaction creation). |
| **Redis Distributed Cache** | Shared cache layer reduces MongoDB round-trips for sessions, rate-limit counters, and AI conversation context. |
