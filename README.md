## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Production Deployment with PM2

To deploy the application using PM2:

1. Build the application:
```bash
pnpm build
```

2. Start with PM2:
```bash
# Start application
pnpm pm2:start

# Start in production mode
pm2 start ecosystem.config.js --env production
```

3. PM2 Management Commands:
```bash
# View status
pm2 status

# View logs
pm2 logs shorturl

# Stop application
pnpm pm2:stop

# Restart application
pnpm pm2:restart

# Delete from PM2
pnpm pm2:delete
```

The application will be running on port 3004.
