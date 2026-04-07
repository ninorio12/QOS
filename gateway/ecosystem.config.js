module.exports = {
  apps: [
    {
      name:        'openclaw-gateway',
      script:      'dist/index.js',
      instances:   1,
      autorestart: true,
      watch:       false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT:     '18789',
      },
    },
  ],
}
