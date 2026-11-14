# 🌍 EARTHPULSE

**EARTHPULSE** is an advanced AI-powered Earth observation and cryospheric intelligence platform designed to monitor global glacier retreat, analyze Synthetic Aperture Radar (SAR) and optical satellite data, and deliver scientific insights through an autonomous reasoning agent.

Powered by **FastAPI**, **LangGraph**, **Gemini**, **GeoPandas**, and **Rasterio**, EARTHPULSE connects verified **World Glacier Monitoring Service (WGMS)** historical observations with multi-temporal change detection algorithms to track environmental dynamics worldwide.

---

## 📌 Key Capabilities

- **Global Cryospheric Archive**: Indexed access to over **214,600+ glaciers**, spanning mass balance, front variation (advance/retreat), surface area/length changes, and hazard events (surges, avalanches, GLOFs).
- **LangGraph Multi-Step AI Agent**: An autonomous 10-node intelligence workflow combining:
  1. Natural language query understanding & intent classification
  2. Input & parameter validation
  3. Dynamic dataset selection
  4. Global data retrieval
  5. Empirical data quality verification
  6. Numerical analysis tool selection
  7. Deterministic Pandas calculation (cumulative mass loss, retreat rate, ELA/AAR dynamics)
  8. Scientific result validation
  9. Dual-mode AI report generation (Google Gemini + deterministic fallback)
  10. Structured JSON response delivery
- **Geospatial Processing Engine**: Reusable tools built on GeoPandas, Shapely, PyProj, and Rasterio for GeoJSON export, KML/KMZ boundary parsing, DEM differencing, and spectral index calculations (NDVI, NDWI, NDSI).
- **AtlasX Frontend Ready**: Real-time REST API delivering RFC 7946 compliant GeoJSON `FeatureCollection` payloads for 3D globe and interactive map rendering.
- **Enterprise-Grade Testing**: 100% passing test suite across retrieval, calculations, agent workflows, geospatial tools, and API endpoints.

---

## 🏗️ Project Architecture

```text
EARTHPULSE/
├── frontend/
│   ├── atlasx/                      # AtlasX interactive 3D map frontend
│   └── components/                  # Globe, MapLayers, Timeline, Intelligence UI
│
├── backend/
│   ├── main.py                      # FastAPI application entrypoint & middleware
│   ├── core/
│   │   ├── config.py                # Pydantic BaseSettings & environment configuration
│   │   └── logging_config.py        # Centralized logging setup
│   ├── schemas/                     # Pydantic v2 validation & response models
│   │   ├── glacier.py               # Glacier metadata & registry schemas
│   │   ├── analysis.py              # Agent request & metric analysis schemas
│   │   └── quality.py               # Empirical dataset quality schemas
│   ├── tools/                       # Deterministic analysis & data retrieval tools
│   │   ├── retrieve_satellite_data.py # In-memory cached WGMS data retrieval engine
│   │   ├── analyze_changes.py       # Deterministic numerical analysis & validation
│   │   ├── generate_report.py       # Dual-mode report synthesis (Gemini / fallback)
│   │   └── retrieve_kml.py          # KML / KMZ boundary loader
│   ├── agent/                       # LangGraph cryospheric intelligence agent
│   │   ├── state.py                 # GlacierAgentState TypedDict
│   │   ├── prompts.py               # Scientific prompt definitions
│   │   ├── nodes.py                 # 10 pipeline workflow nodes
│   │   ├── graph.py                 # Compiled StateGraph & conditional routing
│   │   └── workflow.py              # Agent execution runner
│   ├── geospatial/                  # Vector & raster processing
│   │   ├── geojson_exporter.py      # RFC 7946 GeoJSON exporter
│   │   ├── raster_processor.py      # Rasterio metadata, spectral indices, CRS reprojector
│   │   ├── change_detection.py      # Polygon area differencing & DEM elevation change
│   │   └── kml_parser.py            # XML & KML parser
│   ├── database/                    # Storage layer (PostGIS ready)
│   │   ├── connection.py            # SQLAlchemy engine & session factory
│   │   └── models.py                # Declarative relational ORM models
│   └── api/                         # FastAPI route modules
│       ├── monitoring_routes.py     # Health (/health) & Data Quality (/api/v1/data/quality)
│       ├── agent_routes.py          # Agent analysis & Glacier registry endpoints
│       └── geospatial_routes.py     # GeoJSON spatial endpoints
│
├── data/
│   ├── raw/glacier_data/data/       # WGMS historical CSV datasets
│   │   ├── agency.csv               # Monitoring agencies & institutions
│   │   ├── change_band.csv          # Elevation band geodetic changes
│   │   ├── event.csv                # Hazard & physical event catalogue
│   │   ├── front_variation.csv      # Terminus advance/retreat observations
│   │   ├── glacier.csv              # Global glacier registry (214,662 records)
│   │   ├── mass_balance.csv         # Annual & seasonal mass balance (mm w.e.)
│   │   ├── mass_balance_band.csv    # Mass balance elevation distribution
│   │   ├── mass_balance_point.csv   # Field stake & point observations
│   │   ├── person.csv               # Contributing scientists & investigators
│   │   ├── state.csv                # Glacier surface area & length records
│   │   └── state_band.csv           # State elevation distributions
│   └── vector_store/                # Vector store directory
│
├── tests/                           # Complete pytest test suite (24 tests)
│   ├── test_glacier_retrieval.py
│   ├── test_analysis.py
│   ├── test_agent.py
│   ├── test_geospatial.py
│   └── test_api.py
│
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules (protects secrets & large files)
├── pytest.ini                       # Pytest path configuration
├── requirements.txt                 # Pinned dependencies
└── README.md                        # Documentation & setup guide
```

---

## 🛠️ Installation & Setup Tutorial

Follow these steps to set up and run EARTHPULSE on your machine.

### Prerequisites

- **Python**: Version **3.12** is recommended (compatible with 3.11+).
- **Git**: Installed with command line tools.
- **Operating System**: Windows 10/11, macOS, or Linux.

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/ChakrabortyRitabbrata-design/EARTHPULSE.git
cd EARTHPULSE
```

---

### Step 2: Create a Virtual Environment

#### On Windows (PowerShell):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> **Note on PowerShell Execution Policy**: If you receive an execution policy error, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

#### On macOS / Linux:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### Step 3: Upgrade pip & Install Dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### Installed Core Libraries:
| Category | Packages |
|---|---|
| **API & Backend** | `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `python-dotenv` |
| **AI & Agent** | `langgraph`, `langchain`, `langchain-core`, `langchain-google-genai` |
| **Data Processing** | `pandas`, `numpy`, `SQLAlchemy` |
| **Geospatial** | `geopandas`, `shapely`, `pyproj`, `rasterio` |
| **Testing & Quality** | `pytest`, `httpx`, `ruff` |

---

### Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# On Windows PowerShell
Copy-Item .env.example .env

# On Linux / macOS
cp .env.example .env
```

Open `.env` and configure your API key:

```env
# Google Gemini API Key (for LLM reasoning & report generation)
GOOGLE_API_KEY="your-gemini-api-key-here"

# Model name (default: gemini-2.5-flash)
GEMINI_MODEL="gemini-2.5-flash"

# Application Settings
APP_ENV="development"
APP_HOST="0.0.0.0"
APP_PORT=8000
APP_DEBUG=true
```

> 💡 **Deterministic Fallback**: If `GOOGLE_API_KEY` is not provided or Gemini is unreachable, the system automatically falls back to deterministic scientific Markdown reports. All calculations and API routes remain 100% operational!

---

### Step 5: Verify the Installation with Pytest

Run the comprehensive test suite to confirm everything is configured properly:

```bash
python -m pytest -v
```

Expected output:
```text
============================= 24 passed in 16.36s =============================
```

---

## 🚀 Running the Server

Start the FastAPI application with Uvicorn:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Once started:
- 🌐 **Interactive OpenAPI Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 📖 **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- 🩺 **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 📡 API Reference & Example Usage

### 1. Health & Readiness Check
```http
GET /health
```
**Response:**
```json
{
  "status": "online",
  "app_name": "EARTHPULSE",
  "environment": "development",
  "data_directory_exists": true,
  "llm_model": "gemini-2.5-flash",
  "llm_configured": true
}
```

---

### 2. Global Glacier Registry Search
```http
GET /api/v1/glaciers?country=CH&query=rhone&limit=1
```
**Response:**
```json
{
  "items": [
    {
      "id": 352,
      "short_name": "RHONE",
      "names": "Rhonegletscher",
      "country": "CH",
      "latitude": 46.5985,
      "longitude": 8.3847,
      "gtng_region": "11_central_europe",
      "glims_id": "G008385E46599N",
      "rgi60_ids": "RGI60-11.02028"
    }
  ],
  "total": 1,
  "offset": 0,
  "limit": 1
}
```

---

### 3. Detailed Glacier Metadata & History
```http
GET /api/v1/glaciers/352
```
**Response:**
```json
{
  "id": 352,
  "short_name": "RHONE",
  "country": "CH",
  "latitude": 46.5985,
  "longitude": 8.3847,
  "observation_summary": {
    "mass_balance_records": 19,
    "front_variation_records": 142,
    "state_records": 9,
    "event_records": 1
  }
}
```

---

### 4. Interactive GeoJSON Export (for AtlasX 3D Map)
```http
GET /api/v1/geospatial/glaciers?country=CH&limit=100
```
Returns an RFC 7946 compliant GeoJSON `FeatureCollection` with point geometries `[longitude, latitude]` and observation counts.

---

### 5. Autonomous AI Cryospheric Analysis
```http
POST /api/v1/agent/analyze
Content-Type: application/json

{
  "query": "Analyse mass balance loss and front retreat in Switzerland between 2022 and 2024",
  "country": "CH",
  "start_date": "2022-01-01",
  "end_date": "2024-12-31"
}
```

**Response Overview:**
```json
{
  "query": "Analyse mass balance loss and front retreat in Switzerland between 2022 and 2024",
  "status": "success",
  "glaciers_analyzed": 50,
  "datasets_used": ["mass_balance", "glacier"],
  "analysis_results": {
    "mass_balance": {
      "status": "calculated",
      "observation_count": 67,
      "year_range": [2022, 2024],
      "cumulative_mass_balance_mm_we": -147.4,
      "cumulative_mass_balance_m_we": -0.147,
      "mean_annual_balance_mm_we": -2.2,
      "negative_balance_years": 67,
      "positive_balance_years": 0,
      "balance_regime": "LOSS",
      "unit": "mm w.e."
    },
    "mass_balance_rankings": {
      "rankings": [
        {"glacier_name": "PLAINE MORTE", "cumulative_balance": -8.8},
        {"glacier_name": "GRIES", "cumulative_balance": -8.4},
        {"glacier_name": "OTEMMA", "cumulative_balance": -8.0}
      ]
    }
  },
  "report": "# Executive Summary\n\nAn analysis of glacier mass balance in Switzerland for 2022-2024 reveals a severe mass loss regime..."
}
```

---

## 📊 Scientific Data Integrity & Units

All empirical calculations follow the official **World Glacier Monitoring Service (WGMS)** data conventions:
- **Mass Balance**: Measured in millimeters of water equivalent (`mm w.e.`) or meters of water equivalent (`m w.e.`). Negative values indicate net mass ablation.
- **Front Variation**: Measured in meters (`m`). Negative values indicate terminus retreat.
- **Surface Area**: Measured in square meters (`m²`) and square kilometers (`km²`).
- **Equilibrium Line Altitude (ELA)**: Measured in meters above sea level (`m a.s.l.`).
- **Accumulation Area Ratio (AAR)**: Expressed as a percentage (`%`).
- **Data Gap Preservation**: Missing values are treated as missing field records rather than fabricated zero-change observations.

---

## 🧪 Scientific & Analytical Testing

The test suite covers:
- **Retrieval Engine**: Verified date filters, pagination, country filters, and metadata joins.
- **Calculations**: Plausibility of cumulative metrics, sign conventions, and multi-temporal change rates.
- **Agent Pipeline**: Validates deterministic query routing, input date validation, and LLM synthesis.
- **Geospatial Foundations**: Coordinate transformation accuracy, GeoJSON structure validity, and geometric difference areas.

To run tests with detailed coverage:
```bash
pytest --verbose
```

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/SentinelSARIntegration`)
3. Commit your Changes (`git commit -m 'Add Sentinel-1 SAR backscatter change pipeline'`)
4. Push to the Branch (`git push origin feature/SentinelSARIntegration`)
5. Open a Pull Request

---

## 📜 License & Acknowledgments

- **Datasets**: Provided by the [World Glacier Monitoring Service (WGMS)](https://wgms.ch/) under international scientific open-data guidelines.
- **Platform**: Developed for global cryospheric observation and climate impact intelligence.
