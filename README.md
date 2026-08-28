<img src="img.jpg"></img>

# MistralProto

UI prototype generation from requirements descriptions using Mistral AI. <br>
Developed as part of the <a href="https://www.prostospb.team/hackathon-26">Sber X PROSTO X ITMO Hackathon</a>

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configuration

Create a `.env` file in the project root:

```env
MISTRAL_KEY=QWERTYEXAMPLE
```

Optional:

```env
MISTRAL_MODEL=mistral-small-latest  
API_PORT=3001                        
SERVER_PORT=3000                   
DATABASE_URL=postgresql://user:pass@localhost:5432/mistralproto 
```

**PostgreSQL** is used to store sessions and dialogues for the API. The database schema is created automatically when the API starts, or can be created manually:

```bash
npm run db:migrate
```

### 3. Run

**CLI:**

```bash
npm start
```

Enter your requests in the console. Files from the `input/` directory are supported (`.txt`, `.pdf`, `.docx`).

* `exit` — exit the application
* `save` — save the latest result to `output/`
* Filename (e.g. `requirements.txt`) — load text from the `input/` directory

---

**API Server:**

```bash
npm run api
```

API: `http://localhost:3001` (or the port specified by `API_PORT`).

**Sessions and dialogues** (when `DATABASE_URL` is configured):

* `POST /api/sessions` — create a session
* `POST /api/sessions/:id/dialogues` — create a dialogue
* `GET /api/sessions/:id/dialogues` — get a list of dialogues
* `GET /api/dialogues/:id?session_id=` — get a dialogue with its messages
* `POST /api/dialogues/:id/send` — send a message, run the pipeline, and save the result to the database

**WEB:**

`src/frontend/index.html`
