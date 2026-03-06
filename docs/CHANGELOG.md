# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation (README, CONTRIBUTING, ARCHITECTURE, API, DEPLOYMENT)
- Test infrastructure with Vitest
- Unit tests for authentication and file validation (51 tests)
- CI/CD pipeline with GitHub Actions
- Security.txt file for vulnerability disclosure
- Excel utility functions for code reuse
- Type-safe cell manipulation utilities
- Automated deployment workflow
- Code coverage reporting
- Security scanning with Trivy

### Changed
- Refactored Excel processing logic to use shared utilities
- Improved code organization with extracted helper functions
- Enhanced error handling in file processing
- Updated package.json with test scripts

### Fixed
- Magic numbers replaced with named constants
- Code duplication in Excel cell operations
- Improved type safety in utility functions

## [0.1.0] - 2024-03-06

### Added
- Initial release
- IFR Scanner tool
- LIPA Summary tool
- Merge Files tool (PDF and Excel)
- Accomplishment Report generator
- Consolidate Land Profiles tool
- IFR Checker tool
- Template Manager
- Account Management
- Firebase authentication
- Role-based access control
- Audit trail logging
- Rate limiting with Upstash Redis
- Security headers
- Sentry error monitoring
- PWA support

### Security
- Implemented comprehensive security headers
- Added rate limiting for API endpoints
- Configured CORS policies
- Added input validation with Zod
- Implemented audit trail logging
- Added file upload security measures

[Unreleased]: https://github.com/your-org/niatools/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/niatools/releases/tag/v0.1.0
