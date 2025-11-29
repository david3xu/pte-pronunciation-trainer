# Contributing Guidelines

We welcome contributions to the PTE Pronunciation Trainer! Please follow these guidelines to ensure a smooth collaboration process.

## 👩‍💻 Development Workflow

1.  **Fork & Clone**: Fork the repository and clone it locally.
2.  **Branching**: Create a new branch for your feature or fix.
    ```bash
    git checkout -b feature/my-new-feature
    # or
    git checkout -b fix/bug-description
    ```
3.  **Commit Messages**: Use conventional commits.
    - `feat: add new voice settings`
    - `fix: resolve audio playback issue`
    - `docs: update setup guide`
    - `style: format code`
    - `refactor: simplify auth logic`

## 🎨 Code Style

- **TypeScript**: We use TypeScript for type safety. Avoid `any` whenever possible.
- **Formatting**: Code is formatted using Prettier. Run `npm run lint` to check for issues.
- **Naming**:
  - Components: PascalCase (e.g., `AudioPlayer.tsx`)
  - Functions/Variables: camelCase (e.g., `playAudio`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

## 🧪 Testing

- Write unit tests for new logic using Vitest.
- Ensure all tests pass before submitting a PR.
```bash
npm test
```

## 📁 File Structure Conventions

- **Components**: Place co-located styles or sub-components in the same folder if they are tightly coupled.
- **Hooks**: Custom hooks go in `src/hooks` and start with `use`.
- **State**: Global state slices go in `src/stores`.

## 📝 Documentation

- Update `README.md` or relevant docs in `docs/` if you change functionality.
- Add JSDoc comments to complex functions.

## 🚀 Pull Requests

1.  Push your branch to GitHub.
2.  Open a Pull Request against the `main` branch.
3.  Describe your changes and link to any relevant issues.
4.  Wait for code review and address feedback.
