# Syllabi

An open-source AI-powered chatbot platform with advanced knowledge base integration, multi-modal support, and seamless integrations.

## 🌟 Features

- **AI-Powered Chatbots**: Build intelligent chatbots with OpenAI GPT-4 and other LLMs
- **Knowledge Base Integration**: Upload documents, videos, audio files, and URLs
- **Multi-Modal Support**: Process PDFs, videos, audio with automatic transcription
- **Custom Theming**: Full customization of chatbot appearance
- **API Integrations**: Connect to Discord, Slack, Teams, and more
- **Skills System**: Extend chatbot capabilities with custom actions
- **Analytics Dashboard**: Track usage, messages, and performance
- **Embedded Widget**: Add chatbots to any website

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **AI SDK**: Vercel AI SDK v5
- **State Management**: React Context
- **Database**: Supabase (PostgreSQL)

### Backend
- **Framework**: FastAPI (Python)
- **Task Queue**: Celery
- **Document Processing**: PyMuPDF, pdfplumber
- **Audio/Video**: Whisper API, pydub
- **Embeddings**: OpenAI text-embedding-3-small

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- Python 3.10+
- Supabase account
- OpenAI API key
- Redis (for backend task queue)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/syllabi.git
cd syllabi
```

2. **Setup Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

3. **Setup Backend** (Optional - for document processing)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn app.main:app --reload
```

4. **Setup Database**
- Create a Supabase project
- Run the SQL migrations from `frontend/supabase/migrations/`
- Configure RLS policies

## 📖 Documentation

- [Architecture Overview](./docs/architecture.md)
- [Deployment Guide](./docs/deployment.md)
- [API Reference](./docs/api-reference.md)
- [Theming Guide](./docs/theming.md)
- [Skills Development](./docs/skills.md)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Vercel AI SDK](https://sdk.vercel.ai/)
- Powered by [OpenAI](https://openai.com/)
- Database by [Supabase](https://supabase.com/)

## 📧 Contact

- GitHub Issues: [Report bugs or request features](https://github.com/YOUR_USERNAME/syllabi/issues)
- Discord: [Join our community](#)

---

Made with ❤️ by the Syllabi team
