module.exports = {
  apps: [
    {
      name: 'busbnb-backend',
      script: 'dist/index.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      max_memory_restart: '500M', // Auto-restart if it eats too much memory
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
