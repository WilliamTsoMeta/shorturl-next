module.exports = {
  apps: [
    {
      name: 'limq-web',
      script: './node_modules/next/dist/bin/next',
      args: 'start',
      exec_mode: 'cluster',
      instances: 'max',
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3004
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3004
      }
    }
  ]
} 