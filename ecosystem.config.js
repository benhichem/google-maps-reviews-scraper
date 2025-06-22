module.exports = {
    apps: [{
        name: 'my-app',
        script: './dist/index.js',
        instances:1,
        max_memory_restart: '128M',
        autorestart: true,
        min_uptime: '60s',
        watch: true,
        env: {
            NODE_ENV: 'production',
        },
        max_restarts:3,
        restart_delay: 5000,
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        merge_logs: true,
        log_file: './logs/pm2-combined.log',
        time:true
    }]
}