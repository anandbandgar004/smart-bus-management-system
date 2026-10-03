const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require("socket.io");
require('dotenv').config();

const gtfsService = require('./services/gtfsService');
const aiService = require('./services/aiService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/busai-navigator';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch(err => { console.error('Database connection error:', err); process.exit(1); });

app.use('/api/buses', require('./routes/buses'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/ai', require('./routes/ai'));
app.get('/', (req, res) => res.send('BusAI Navigator Backend is running!'));



io.on('connection', (socket) => {
  console.log(`A user connected with socket id: ${socket.id}`);
  socket.on('disconnect', () => console.log(`User with socket id ${socket.id} disconnected.`));
});

// start server and init services
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  aiService.init(io); 
  gtfsService.init(io, aiService); 
});
