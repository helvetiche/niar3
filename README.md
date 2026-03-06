# NIA Productivity Tools

> National Irrigation Administration Region 3 productivity tools for automating manual processes into minute-level results.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## 🚀 Features

- **IFR Scanner**: Scan IFR documents automatically and extract relevant data fields
- **LIPA Summary**: Generate concise summaries from LIPA files
- **Merge Files**: Merge PDF and Excel files with ordering and structure integrity
- **Accomplishment Report**: Generate quincena accomplishment reports
- **Consolidate Land Profiles**: Consolidate multiple land profile Excel files
- **IFR Checker**: Validate consolidated files against source IFR data
- **Template Manager**: Manage shared templates across all tools

## 📋 Prerequisites

- Node.js 20.x or higher
- npm, yarn, or pnpm
- Firebase project with Admin SDK credentials
- Upstash Redis account (for production rate limiting)
- Sentry account (optional, for error monitoring)

## 🛠️ Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd niatools
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file with required credentials:

```env
# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email
FIREBASE_ADMIN_PRIVATE_KEY="your-private-key"

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Upstash Redis (optional, for production rate limiting)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Sentry (optional, for error monitoring)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development

# Gemini API (optional, for AI features)
GEMINI_API_KEY=your-gemini-api-key
```

5. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Architecture

```
niatools/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/v1/            # Versioned API endpoints
│   ├── workspace/         # Main workspace application
│   └── layout.tsx         # Root layout with metadata
├── components/            # React components
│   ├── AccountManagement/ # User account management
│   ├── ifr-scanner/      # IFR scanning components
│   ├── merge-files/      # File merging components
│   └── ui/               # Reusable UI components
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Core business logic
│   ├── api/             # Client-side API functions
│   ├── auth/            # Authentication utilities
│   ├── firebase-admin/  # Firebase Admin SDK wrappers
│   ├── monitoring/      # Logging and monitoring
│   ├── rate-limit/      # Rate limiting logic
│   └── services/        # Business services
├── types/               # TypeScript type definitions
├── constants/           # Application constants
└── public/              # Static assets
```

## 🔐 Security

- **Authentication**: Firebase session cookies with server-side verification
- **Authorization**: Role-based access control (super-admin, admin, user)
- **Rate Limiting**: Distributed rate limiting with Upstash Redis
- **Security Headers**: Comprehensive CSP, HSTS, X-Frame-Options
- **Audit Trail**: Complete logging of all actions to Firebase Realtime DB
- **Input Validation**: Zod schemas for all inputs
- **File Security**: Filename sanitization, size limits (2GB max)

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 📦 Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🚀 Deployment

This application is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables
4. Deploy

For other platforms, ensure:

- Node.js 20.x runtime
- Environment variables are set
- Build command: `npm run build`
- Start command: `npm start`

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run set-super-admin` - Set user as super admin
- `npm run check-user-role` - Check user role and permissions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- National Irrigation Administration Region 3
- Built with Next.js, React, and Firebase
- UI components from Radix UI and Tailwind CSS

## 📞 Support

For support, email your-support-email@example.com or open an issue in the repository.

## 🔗 Links

- [Documentation](./docs/README.md)
- [API Reference](./docs/API.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
