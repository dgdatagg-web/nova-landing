module.exports = {
  apps: [{
    name: 'nova-dashboard',
    script: 'server.js',
    cwd: '/Users/dongocminh/nova-workspace/nova-dashboard',
    node_args: '--experimental-specifier-resolution=node',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
