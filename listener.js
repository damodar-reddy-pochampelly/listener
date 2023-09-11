const io = require("socket.io")();
const crypto = require("crypto");
const mongoose = require("mongoose");
const cors = require("cors");

io.use(cors());

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
    encryptedMessages.forEach((payload64) => {
      try {
        // Base64 decode the payload
        const encryptedPayload = Buffer.from(payload64, "base64").toString(
          "hex"
        );

        // Extract IV, encrypted message, and authentication tag
        const iv = encryptedPayload.slice(0, 24); // 24 bytes for AES-GCM IV
        const encryptedMessageWithAuthTag = encryptedPayload.slice(24);

        // Create a Decipher object for AES-GCM decryption
        const decipher = crypto.createDecipheriv(
          "aes-256-gcm",
          encryptionKey, // Use the appropriate key
          Buffer.from(iv, "hex")
        );

        // Set the authentication tag
        decipher.setAuthTag(
          Buffer.from(encryptedMessageWithAuthTag.slice(-32), "hex")
        );

        // Decrypt the message
        let decryptedMessage = decipher.update(
          encryptedMessageWithAuthTag.slice(0, -32),
          "hex",
          "utf8"
        );
        decryptedMessage += decipher.final("utf8");

        // Check if the decrypted message is valid JSON
        const parsedMessage = JSON.parse(decryptedMessage);

        // Output the decrypted message (as a string)
        console.log("Decrypted message:", parsedMessage);

        // Create a new TimeSeries document and save it to MongoDB
        const timeSeriesData = new TimeSeries({
          data: parsedMessage,
        });
        timeSeriesData
          .save()
          .then(() => {
            console.log("Saved to MongoDB");
          })
          .catch((error) => {
            console.error("Error saving to MongoDB:", error);
          });
      } catch (error) {
        console.error("Error parsing decrypted message:", error);
      }
    });
  });
});

const port = process.env.PORT || 3000;

io.listen(port, () => {
  console.log(`Listener service listening on port ${port}`);
});
