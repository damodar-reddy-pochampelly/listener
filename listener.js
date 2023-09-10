const io = require("socket.io")();
const crypto = require("crypto");
const mongoose = require("mongoose");

mongoose.set("strictQuery", true);

// Create a MongoDB connection
mongoose.connect(
  "mongodb+srv://damodarreddy18107:bgmjge181078@cluster0.vg9l0jd.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Define a MongoDB schema and model for time-series data (adjust as needed)
const timeSeriesSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  data: Object, // Adjust the data structure as needed
});

const TimeSeries = mongoose.model("TimeSeries", timeSeriesSchema);

io.on("connection", (socket) => {
  console.log("Emitter connected");

  socket.on("encryptedMessageStream", (messageStream) => {
    console.log("Received encrypted message stream");

    // Split the message stream into individual encrypted messages
    const encryptedMessages = messageStream.split("|");

    // Process each encrypted message
    encryptedMessages.forEach((encryptedMessage) => {
      // Decrypt the message using your decryption algorithm (e.g., aes-256-ctr)
      const decryptionKey = crypto.randomBytes(32); // Use the appropriate key
      const iv = crypto.randomBytes(16); // Use the appropriate IV
      const decipher = crypto.createDecipheriv(
        "aes-256-ctr",
        decryptionKey,
        iv
      );
      let decryptedMessage = decipher.update(encryptedMessage, "hex", "utf8");
      decryptedMessage += decipher.final("utf8");

      // Output the decrypted message (as a string)
      console.log("Decrypted message:", decryptedMessage);

      // Create a new TimeSeries document and save it to MongoDB
      const timeSeriesData = new TimeSeries({
        data: JSON.parse(decryptedMessage),
      });
      timeSeriesData
        .save()
        .then(() => {
          console.log("Saved to MongoDB");
        })
        .catch((error) => {
          console.error("Error saving to MongoDB:", error);
        });
    });
  });
});

io.listen(3000); // Listen on port 3000
console.log("Listener service listening on port 3000");
