
module.exports = {
  apps: [
    {
      name: 'jarvis-shewtech-net',
      instances: 'max',
      exec_mode: 'cluster',
      cwd: 'build',
      script: 'bin/server.js',
    }
  ]
}