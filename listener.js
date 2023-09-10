require("dotenv").config();
const io = require("socket.io")();
const crypto = require("crypto");
const MongoClient = require("mongodb").MongoClient;
const dbName = "your_db_name_here";

const PORT = 3000;

io.on("connection", (socket) => {
  console.log("Emitter connected");

  socket.on("encryptedMessageStream", (messageStream) => {
    const messages = messageStream.split("|");

    messages.forEach((encryptedMessage) => {
      // Decrypt the message using the same AES-256-CTR algorithm and pass key
      const decryptedMessage = crypto
        .createDecipher("aes-256-ctr", "your_pass_key_here")
        .update(encryptedMessage, "hex", "utf8");

      // Parse the decrypted message
      const messageObj = JSON.parse(decryptedMessage);

      // Validate the secret_key
      const secret_key = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            name: messageObj.name,
            origin: messageObj.origin,
            destination: messageObj.destination,
          })
        )
        .digest("hex");

      if (secret_key === messageObj.secret_key) {
        // Data integrity is valid, save to MongoDB with a timestamp
        MongoClient.connect(MONGODB_URI, (err, client) => {
          if (err) throw err;

          const db = client.db(dbName);
          const collection = db.collection("timeseries");

          const timestamp = new Date();
          const minute = timestamp.getMinutes();

          collection.updateOne(
            { minute },
            { $push: { data: { ...messageObj, timestamp } } },
            { upsert: true },
            (error) => {
              if (error) throw error;
              console.log("Data saved to MongoDB");
              client.close();
            }
          );
        });
      } else {
        console.log("Data integrity compromised; message discarded");
      }
    });
  });
});

io.listen(PORT);
console.log(`Listener service listening on port ${PORT}`);
