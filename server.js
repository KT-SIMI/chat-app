const mongoose = require('mongoose');
const socketIO = require('socket.io');

// Connect to MongoDB
mongoose.connect('mongodb+srv://user111:MJki7GHZOsRCHIKo@cluster0.suasqti.mongodb.net/eseries?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected...');
    startSocketServer();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
  });

// Create mongoose schema and model for chats
const chatSchema = new mongoose.Schema({
  name: String,
  message: String
});

const Chat = mongoose.model('Chat', chatSchema);

function startSocketServer() {
  const io = socketIO.listen(4000);

  io.on('connection', socket => {
    // Get chats from mongo collection
    Chat.find().limit(100).sort({ _id: 1 }).then(res => {
      // Emit the messages
      socket.emit('output', res);
    }).catch(err => {
      console.error('Failed to fetch chats:', err);
    });

    // Create function to send status
    function sendStatus(s) {
      socket.emit('status', s);
    }

    // Handle input events
    socket.on('input', data => {
      let name = data.name;
      let message = data.message;

      // Check for name and message
      if (name == '' || message == '') {
        // Send error status
        sendStatus('Please enter a name and message');
      } else {
        // Insert message
        const newChat = new Chat({ name, message });
        newChat.save().then(() => {
          io.emit('output', [data]);

          // Send status object
          sendStatus({
            message: 'Message sent',
            clear: true
          });
        }).catch(err => {
          console.error('Failed to save chat:', err);
        });
      }
    });

    // Handle clear
    socket.on('clear', () => {
      // Remove all chats from collection
      Chat.deleteMany().then(() => {
        // Emit cleared
        socket.emit('cleared');
      }).catch(err => {
        console.error('Failed to clear chats:', err);
      });
    });
  });
}
