<div align="center">

# LearnSphere 📚
### Personalized AI Tutoring Enhanced by Human Guidance

*A system where answers evolve from generated guesses into verified knowledge.*

![Node.js](https://img.shields.io/badge/Node.js-v22.21.0-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Backend-000000?style=flat&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat&logo=mongodb&logoColor=white)
![Groq](https://img.shields.io/badge/AI-Groq_API-F55036?style=flat)
![JWT](https://img.shields.io/badge/Auth-JWT-purple?style=flat)
![RAG](https://img.shields.io/badge/Retrieval-RAG-blue?style=flat)
![Status](https://img.shields.io/badge/Status-Active-success?style=flat)

</div>

---

## 📋 Table of Contents

1. [The Problem](#-the-problem)
2. [The Solution](#-the-solution)
3. [How It Works](#-how-it-works)
4. [System Flow](#-system-flow)
5. [Core Features](#-core-features)
6. [How It Gets Smarter](#-how-it-gets-smarter)
7. [Tech Stack](#-tech-stack)
8. [Project Structure](#️-project-structure)
9. [Setup Guide](#️-setup-guide)
10. [Future Scope](#-future-scope)
11. [Impact](#-impact)
12. [Contributing](#-contributing)

---

## 🚨The Problem

Students today rely heavily on AI tools for learning. But AI has a fundamental flaw:

| Issue | Reality |
|---|---|
| **Unverified answers** | AI generates responses with confidence — even when wrong |
| **No accountability** | No expert reviews what students learn from AI |
| **No improvement** | Every student gets the same raw AI answer, forever |
| **Misinformation risk** | Wrong answers get repeated across thousands of students |

> AI gives answers in seconds. But speed without trust is just noise.

---

## 💡 The Solution

**LearnSphere** flips the equation.

Instead of relying blindly on AI, it builds a system where:
- Answers are **validated by teachers** before being reused
- Knowledge becomes **globally reusable** once verified
- Accuracy **improves over time** as the verified database grows
- AI is used as a **last resort**, not the default

> The goal: move from *AI-generated responses* → to *verified knowledge infrastructure*

---

## 🧠 How It Works

LearnSphere uses a strict **3-step priority system** for every question:

| Priority | Source | Condition |
|---|---|---|
| **1st** |  Verified Database | Always checked first — global, shared across all students |
| **2nd** |  Selected PDF | If no verified answer exists — scoped to student's chosen document |
| **3rd** |  AI Generation | Only if both above fail — clearly tagged as AI Generated |

Every answer is labeled: `Verified` · `Resource` · `AI Generated`

---

## 🔄 System Flow

![System Flow](flow1.png)

> A continuous loop where each student query strengthens the system for every future learner.

---

## Core Features

<table>
<tr>
<td valign="top" width="50%">

### 🔒 Trust Layer
Teacher validation — approve, edit, reject with comments<br/>
Global verified answer database shared across all students

</td>
<td valign="top" width="50%">

###✨Intelligence Layer
Semantic search using vector embeddings<br/>
Context-aware matching across varied question phrasing

</td>
</tr>
<tr>
<td valign="top" width="50%">

### 👤 User System
Student and teacher authentication with role-based access<br/>
Verification request routing to assigned teachers

</td>
<td valign="top" width="50%">

### 🎓 Learning Interface
PDF upload with per-user semantic indexing<br/>
Answer tagging — `Verified` · `Resource` · `AI Generated`<br/>
Student dashboard with activity and request tracking

</td>
</tr>
</table>

---

## ⚡ System Optimization-How It Gets Smarter

<table>
<tr>
<td valign="top" width="50%">

### 🧭 Answer Priority Engine
Verified → Resource → AI ensures maximum accuracy with minimum risk

</td>
<td valign="top" width="50%">

### ⚡ Retrieval Precision
Search scoped to selected document only — faster, more relevant results

</td>
</tr>
<tr>
<td valign="top" width="50%">

### 🧠 Semantic Deduplication
Same question, different wording → same verified answer, no duplicate work

</td>
<td valign="top" width="50%">

### 💰 Cost Optimization
AI usage decreases as verified data grows — system gets cheaper over time

</td>
</tr>
<tr>
<td valign="top" width="50%">

### 🔁 Reusability Engine
Once verified → reused globally — knowledge compounds continuously

</td>
<td valign="top" width="50%">

### ⚙️ Controlled Pipeline
No cross-document search — predictable and efficient architecture

</td>
</tr>
</table>

---

## 🧩 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js v22.21.0, Express.js |
| Database | MongoDB (Mongoose) |
| AI Generation | Groq API (llama-3.1-8b-instant) |
| Embeddings | Xenova/all-MiniLM-L6-v2 (runs locally) |
| Retrieval | Manual RAG (chunking + embeddings + cosine similarity) |
| PDF Processing | pdf-parse |
| Frontend | HTML, CSS, JavaScript |

---

## 🗂️ Project Structure

```
LearnSphere/
├── backend/
│   ├── faiss/                    # Auto-created at runtime (gitignored)
│   ├── models/                   # Embedding model cache (gitignored)
│   ├── node_modules/             # Auto-created after npm install (gitignored)
│   ├── scripts/
│   │   └── clearData.js          # Manual data cleanup (development only)
│   ├── src/
│   │   ├── middleware/           # Auth middleware
│   │   ├── models/               # User, Document, Answer, VerificationRequest
│   │   ├── routes/               # upload, qa, teacher, verify
│   │   ├── services/             # decisionEngine, groqService, faissService
│   │   └── utils/                # embedder, chunker, pdfExtract, expandAbbr
│   ├── .env                      # Create manually (gitignored)
│   ├── package.json
│   └── server.js                 # Entry point
└── frontend/
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── auth.js
    │   ├── student.js
    │   └── teacher.js
    ├── index.html
    ├── student.html
    ├── teacher.html
    └── logo.png
```

---

## ⚙️ Setup Guide

> **Requirement:** Node.js v18 or higher

**1. Clone the repository**
```bash
git clone https://github.com/mitalim46/LearnSphere.git
cd LearnSphere
```

**2. Install dependencies**
```bash
cd backend
npm install
```

**3. Create `.env` file inside `backend/`**
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_secret_key
NODE_ENV=development
```

| Variable | Where to get it |
|---|---|
| `MONGO_URI` | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
| `JWT_SECRET` | Any long random string of your choice |

**4. Start the server**
```bash
npm start
```

**5. Open the frontend**

Open `frontend/index.html` in your browser or use VS Code Live Server.

> **First run note:** The embedding model downloads automatically on startup.
> Wait for `Embedding model ready ✅` in the terminal before uploading any PDF.

---

## 🔭 Future Scope

| Feature | Description |
|---|---|
| **Global PDF Indexing** | Reuse embeddings across students for the same document |
| **Teams-style Teacher Dashboard** | Subject-based channels, threaded context, request reassignment |
| **Real-time Notifications** | Alert teachers instantly when new verification requests arrive |
| **Analytics Dashboard** | Track student doubts, verification rates, and AI usage trends |

---

## 🌱 Impact

|  |  |
|---|---|
| ✅ | Builds trust-first AI learning systems |
| 🌍 | Connects remote students with expert teachers |
| 🤖 | Reduces AI misinformation in education |
| 📈 | Creates a growing, globally reusable knowledge base |
| 🎓 | Bridges quality education gaps at scale |

---

## 🤝Contribute to LearnSphere

Want to improve LearnSphere? You are welcome to:

- Fork the repository
- Make your improvements
- Submit a pull request

For major changes, open an issue first to discuss your ideas. Every contribution helps shape a more reliable learning system.
Every contribution, big or small, helps us move closer to building a smarter, more reliable learning experience.

---
**✨LearnSphere isn’t just a learning platform — it’s a self-evolving loop where curiosity sparks questions, answers get validated, and true learning becomes verified understanding.✨**

