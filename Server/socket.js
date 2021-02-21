let io;

module.exports = {
    init: (httpServer) => {
        // prevent requiring multiple times when used
        io = require('socket.io')(httpServer, {
            cors: {
                origin: 'http://localhost:3000',
                methods: ['GET', 'POST'],
            },
        });
        return io;
    },
    getIo: () => {
        if (!io) {
            throw new Error('Socket.io not initialized.');
        }
        return io;
    },
};
