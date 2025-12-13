# Development Guide

## Overview
This guide provides information for developers working on the application, including setup instructions, coding standards, and contribution guidelines.

## Prerequisites
- Node.js (version 14 or higher)
- PostgreSQL database
- npm or yarn package manager

## Initial Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure your settings:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
- Database connection string
- JWT secrets
- Server port
- Node environment

### 4. Database Setup
Run the database migrations:
```bash
npm run migrate
```

Generate the Prisma client:
```bash
npm run generate
```

### 5. Start Development Server
```bash
npm run dev
```

This will start the server with auto-reload and compile Tailwind CSS in watch mode.

## Project Structure

### Root Directory
- `index.js`: Main application entry point
- `package.json`: Project dependencies and scripts
- `.env`: Environment variables (not in version control)
- `.env.example`: Template for environment variables

### Server Directory (`server/`)
- `config/`: Configuration files
- `controller/`: Route controllers
- `middleware/`: Express middleware
- `routes/`: Route definitions
- `utils/`: Utility functions

### Views Directory (`views/`)
- `layout/`: Layout templates
- `pages/`: Page templates
- `css/`: Source CSS files

### Public Directory (`public/`)
- `css/`: Compiled CSS files
- `js/`: Client-side JavaScript

### Database (`prisma/`)
- `schema.prisma`: Prisma schema definition
- `migrations/`: Database migration files

### Documentation (`docs/`)
- `README.md`: Main documentation
- `ARCHITECTURE.md`: Architecture documentation
- `API_DOCUMENTATION.md`: API documentation
- `SECURITY_ANALYSIS.md`: Security analysis
- `DEVELOPMENT_GUIDE.md`: This file

## Development Workflow

### Adding New Features
1. Create a new branch for your feature
2. Implement the feature following the existing patterns
3. Write tests if applicable
4. Update documentation as needed
5. Submit a pull request

### Code Organization
- Follow the existing MVC pattern
- Place new routes in appropriate files in `server/routes/`
- Implement route handlers in `server/controller/`
- Add new middleware to `server/middleware/` if needed
- Utility functions go in `server/utils/`

### Database Changes
1. Modify `prisma/schema.prisma` as needed
2. Create a new migration:
   ```bash
   npx prisma migrate dev --name migration_name
   ```
3. Regenerate the Prisma client:
   ```bash
   npm run generate
   ```

### Frontend Development
- Use EJS templates in `views/`
- Add new styles to `views/css/main.css`
- Client-side JavaScript goes in `public/js/`
- Tailwind CSS classes can be used directly in templates

### Testing
Run the authentication test script:
```bash
npm run test-auth
```

Set up sample users for testing:
```bash
npm run setup-db
```

## Coding Standards

### JavaScript
- Use ES6+ features where appropriate
- Follow consistent indentation (2 spaces)
- Use descriptive variable and function names
- Add comments for complex logic
- Handle errors appropriately

### EJS Templates
- Use consistent indentation
- Minimize logic in templates
- Use partials for reusable components
- Follow accessibility best practices

### CSS/Tailwind
- Use Tailwind utility classes primarily
- Add custom styles sparingly
- Maintain consistent styling across pages
- Use responsive design principles

## Security Considerations

### Input Validation
- Always validate and sanitize user inputs
- Use the existing input sanitization middleware
- Implement server-side validation for all forms

### Authentication
- Follow the existing authentication patterns
- Protect routes with appropriate middleware
- Use CSRF protection for forms that modify data

### Error Handling
- Never expose sensitive information in error messages
- Log errors appropriately for debugging
- Show user-friendly error messages

## Debugging

### Common Issues
1. **Database Connection**: Ensure DATABASE_URL is correctly configured
2. **Missing Dependencies**: Run `npm install` to install all dependencies
3. **Port Conflicts**: Change the PORT environment variable if needed
4. **Environment Variables**: Ensure all required environment variables are set

### Logging
The application logs information to the console:
- Server startup messages
- Database errors
- Authentication events
- General application errors

### Development Tools
- Use browser developer tools for frontend debugging
- Use console.log statements for backend debugging
- Monitor network requests in browser dev tools

## Deployment

### Production Build
1. Set NODE_ENV to "production"
2. Ensure all environment variables are configured
3. Run database migrations
4. Generate Prisma client
5. Start the server with `npm start`

### Environment Differences
- HTTPS is enforced in production
- Secure cookies are used in production
- More restrictive CSP in production

## Contributing

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

### Code Review Guidelines
- Follow established patterns in the codebase
- Ensure adequate test coverage
- Verify security considerations
- Check for performance implications
- Confirm documentation is updated

## Useful Commands

### Development
- `npm run dev`: Start development server with auto-reload
- `npm run generate`: Generate Prisma client
- `npm run migrate`: Run database migrations
- `npm run setup-db`: Set up sample users
- `npm run test-auth`: Test authentication utilities

### Database
- `npx prisma studio`: Open Prisma Studio for database browsing
- `npx prisma migrate dev --name migration_name`: Create new migration
- `npx prisma migrate reset`: Reset database (development only)

### Testing
- `npm test`: Run test suite (if implemented)
- `npm run test-auth`: Test authentication utilities

## Troubleshooting

### Common Errors
1. **Module not found**: Run `npm install` to ensure all dependencies are installed
2. **Database connection failed**: Check DATABASE_URL in .env file
3. **Port already in use**: Change PORT in .env file
4. **Migration failed**: Check database permissions and connectivity

### Getting Help
- Check existing documentation
- Review error messages and logs
- Consult team members
- Search online resources for framework-specific issues

## Versioning
The project follows semantic versioning (SemVer) for releases.

## License
See LICENSE file for licensing information.