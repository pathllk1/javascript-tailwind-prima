# Deployment Guide

## Overview
This guide provides instructions for deploying the application to a production environment, including server requirements, configuration, and deployment procedures.

## Server Requirements

### Hardware Requirements
- Minimum: 1 CPU core, 1GB RAM
- Recommended: 2+ CPU cores, 2GB+ RAM

### Software Requirements
- Node.js (version 14 or higher)
- PostgreSQL (version 10 or higher)
- Operating System: Linux, macOS, or Windows Server
- Web Server: nginx or Apache (recommended for reverse proxy)

## Pre-deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are configured:
- `DATABASE_URL`: Production database connection string
- `JWT_SECRET`: Strong secret for access tokens
- `JWT_REFRESH_SECRET`: Strong secret for refresh tokens
- `SESSION_SECRET`: Strong secret for session management
- `NODE_ENV`: Set to "production"
- `PORT`: Server port (typically 3000)

### 2. Database Setup
- Create production PostgreSQL database
- Configure database user with appropriate permissions
- Run migrations to set up schema
- Ensure SQLite database file is writable by application user

### 3. SSL Certificate
- Obtain SSL certificate for your domain
- Configure web server for HTTPS

### 4. Domain Configuration
- Point domain to server IP
- Configure DNS records

## Deployment Steps

### 1. Code Deployment
1. Clone or transfer the application code to the server:
   ```bash
   git clone <repository-url> /var/www/myapp
   cd /var/www/myapp
   ```

2. Install dependencies:
   ```bash
   npm install --production
   ```

### 2. Environment Configuration
1. Create `.env` file with production values:
   ```bash
   cp .env.example .env
   nano .env
   ```

2. Configure the following variables:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/production_db?schema=public"
   JWT_SECRET="your_strong_jwt_secret_here"
   JWT_REFRESH_SECRET="your_strong_refresh_secret_here"
   SESSION_SECRET="your_strong_session_secret_here"
   NODE_ENV="production"
   PORT=3000
   ```

### 3. Database Migration
1. Run database migrations:
   ```bash
   npm run migrate
   ```

2. Generate Prisma client:
   ```bash
   npm run generate
   ```

### 4. Application Build
1. Build Tailwind CSS for production:
   ```bash
   npx tailwindcss -i ./views/css/main.css -o ./public/css/output.css --minify
   ```

### 5. Process Manager Setup
Use PM2 or similar process manager to keep the application running:

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the application with PM2:
   ```bash
   pm2 start index.js --name "myapp"
   ```

3. Save PM2 configuration:
   ```bash
   pm2 save
   ```

4. Set PM2 to start on boot:
   ```bash
   pm2 startup
   ```

### 6. Web Server Configuration (nginx example)

1. Create nginx configuration file:
   ```bash
   sudo nano /etc/nginx/sites-available/myapp
   ```

2. Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
   ```

4. Test nginx configuration:
   ```bash
   sudo nginx -t
   ```

5. Restart nginx:
   ```bash
   sudo systemctl restart nginx
   ```

### 7. SSL Configuration (Let's Encrypt example)

1. Install Certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. Obtain SSL certificate:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

3. Test automatic renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

## Production Environment Configuration

### Security Hardening

#### 1. File Permissions
Set appropriate file permissions:
```bash
chmod 600 .env
chown -R www-data:www-data /var/www/myapp
```

#### 2. Firewall Configuration
Configure firewall to only allow necessary ports:
```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

#### 3. Database Security
- Use strong database passwords
- Restrict database access to localhost only
- Regular backups
- Ensure SQLite database file permissions are restricted
- Monitor database access logs

### Performance Optimization

#### 1. Reverse Proxy Caching
Configure nginx caching for static assets:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### 2. Compression
Enable gzip compression in nginx:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

#### 3. Database Connection Pooling
Configure connection pooling in database settings.

#### 4. File Upload Limits
Configure web server to limit file upload sizes for Excel automation:
```nginx
client_max_body_size 5M;
```

## Monitoring and Maintenance

### Application Monitoring
- Set up logging with PM2:
  ```bash
  pm2 logs
  ```

- Monitor application health:
  ```bash
  pm2 monit
  ```

### Database Monitoring
- Monitor PostgreSQL database performance
- Set up alerts for slow queries
- Regular maintenance tasks
- Monitor SQLite database size and performance
- Set up alerts for stock data update failures

### Backup Strategy

#### 1. Database Backups
Regular automated database backups:

PostgreSQL database backup:
```bash
pg_dump production_db > backup_$(date +%F).sql
```

SQLite database backup:
```bash
cp yahoo_finance_data.db yahoo_finance_data_backup_$(date +%F).db
```

#### 2. Application Backups
- Backup application code
- Backup environment files (securely)
- Backup configuration files

### Update Procedure
1. Put application in maintenance mode
2. Backup current version
3. Pull latest code:
   ```bash
   git pull origin main
   ```
4. Install new dependencies:
   ```bash
   npm install --production
   ```
5. Run database migrations:
   ```bash
   npm run migrate
   ```
6. Generate Prisma client:
   ```bash
   npm run generate
   ```
7. Build assets:
   ```bash
   npx tailwindcss -i ./views/css/main.css -o ./public/css/output.css --minify
   ```
8. Restart application:
   ```bash
   pm2 reload myapp
   ```
9. Verify application is working
10. Disable maintenance mode

### Special Considerations for New Features
- Verify SQLite database permissions after updates
- Test Excel file upload functionality
- Verify stock data updates are working correctly

## Troubleshooting

### Common Deployment Issues

#### 1. Application Not Starting
- Check PM2 logs: `pm2 logs myapp`
- Verify environment variables
- Check database connectivity

#### 2. Database Connection Failed
- Verify DATABASE_URL in .env
- Check database service status
- Verify database user permissions

#### 3. SSL Configuration Issues
- Check certificate validity
- Verify nginx configuration
- Test with SSL Labs

#### 4. Performance Issues
- Monitor server resources
- Check database query performance
- Optimize slow endpoints

#### 5. Excel Automation Issues
- Check file upload size limits
- Verify ExcelJS library installation
- Check temporary file permissions

#### 6. Live Stock Data Issues
- Verify Yahoo Finance API connectivity
- Check SQLite database permissions
- Monitor background update processes

### Health Checks
Implement health check endpoints:
- Database connectivity check
- Application responsiveness check
- External service availability
- Excel file processing functionality
- Stock data update status

## Scaling Considerations

### Horizontal Scaling
- Use load balancer for multiple instances
- Shared session storage (Redis)
- Database connection pooling
- Shared SQLite database for stock data (or replication strategy)

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching

### Database Scaling
- Read replicas for heavy read loads
- Connection pooling
- Query optimization
- SQLite database optimization for stock data
- Partitioning strategies for large datasets

## Disaster Recovery

### Recovery Plan
1. Restore from latest backup
2. Recreate environment configuration
3. Restore database from backup
4. Deploy application code
5. Verify functionality

### Business Continuity
- Regular backup testing
- Secondary deployment environment
- Monitoring and alerting

## Compliance and Security Audits

### Regular Audits
- Security vulnerability scans
- Dependency security checks
- Penetration testing

### Compliance Requirements
- GDPR compliance if applicable
- Data retention policies
- Access logging

## Support and Maintenance

### Scheduled Maintenance
- Regular security updates
- Dependency updates
- Performance optimizations

### Emergency Procedures
- Rollback procedure
- Incident response plan
- Contact information for critical issues

## Conclusion
Following this deployment guide will help ensure a successful production deployment of the application with proper security, performance, and monitoring considerations. Regular maintenance and monitoring are essential for continued smooth operation.