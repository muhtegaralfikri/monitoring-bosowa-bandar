module.exports = {
  apps: [{
    name: "backend-monitoring-bosowa-bandar",
    script: "./dist/src/main.js",
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: "production"
    }
  }]
};
