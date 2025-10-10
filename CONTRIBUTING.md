# Contributing to Syllabi

Thank you for your interest in contributing to Syllabi! This document provides guidelines and instructions for contributing.

## 🤝 Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/YOUR_USERNAME/syllabi.git
   cd syllabi
   ```
3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and commit them
5. **Push to your fork** and **submit a Pull Request**

## 📋 Development Setup

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

### Backend Setup (Optional)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn app.main:app --reload
```

## 🎨 Code Style

### Frontend (TypeScript/React)

- Use TypeScript for type safety
- Follow React best practices
- Use functional components and hooks
- Format code with Prettier
- Run ESLint before committing

```bash
npm run lint
npm run type-check
```

### Backend (Python)

- Follow PEP 8 style guide
- Use type hints
- Write docstrings for functions/classes
- Format with Black

```bash
black app/
```

## 📝 Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(chat): add attachment support to messages
fix(auth): resolve token expiration issue
docs(readme): update installation instructions
```

## 🧪 Testing

### Frontend Tests

```bash
npm test
```

### Backend Tests

```bash
pytest
```

## 📤 Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Update the README.md** if you've added functionality
5. **Write a clear PR description** explaining your changes
6. **Link related issues** in the PR description

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated and passing
- [ ] No new warnings generated
- [ ] Related issues linked

## 🐛 Reporting Bugs

Use GitHub Issues to report bugs. Include:

- **Clear title** and description
- **Steps to reproduce** the bug
- **Expected behavior**
- **Actual behavior**
- **Screenshots** if applicable
- **Environment** (OS, browser, Node version, etc.)

## 💡 Suggesting Features

We welcome feature suggestions! Please:

- **Check existing issues** first
- **Describe the feature** clearly
- **Explain the use case** and benefits
- **Provide examples** if possible

## 📚 Documentation

Improvements to documentation are always welcome:

- Fix typos or unclear explanations
- Add examples and use cases
- Improve code comments
- Create tutorials or guides

## 🎯 Project Structure

```
syllabi/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/      # App router pages
│   │   ├── components/
│   │   └── lib/
│   └── public/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── services/ # Business logic
│   │   └── worker/   # Celery tasks
│   └── tests/
└── docs/              # Documentation
```

## 🤔 Questions?

Feel free to:
- Open a GitHub Issue
- Join our Discord community
- Email the maintainers

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Syllabi! 🎉
