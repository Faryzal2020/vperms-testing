module.exports = {
    apps: [
        {
            name: "vperms-frontend",
            script: "npm",
            args: "run dev",
            watch: false,
            env: {
                NODE_ENV: "development",
            },
        },
    ],
};
