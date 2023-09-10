require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

// Allow CORS for your frontend (replace 'http://yourfrontendurl.com' with your frontend's URL)
app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://timerseries-web.onrender.com"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Replace with your MongoDB connection string
mongoose.connect(
  process.env.MONGODB_URI, // Replace with your database name
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Create a Mongoose model for your time series data (replace 'TimeSeries' with your model name)
const timeSeriesSchema = new mongoose.Schema({
  name: String,
  origin: String,
  destination: String,
  timestamp: Date,
});
const TimeSeriesModel = mongoose.model("TimeSeries", timeSeriesSchema);

// Serve the React frontend (make sure to build your React app first)
app.use(express.static(path.join(__dirname, "build")));

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle incoming encrypted data stream
  socket.on("messageStream", (dataStream) => {
    const encryptedMessages = dataStream.split("|");
    const validMessages = [];

    for (const encryptedMessage of encryptedMessages) {
      const decryptedData = decryptAndValidate(encryptedMessage);

      if (decryptedData) {
        // Valid data, save to MongoDB and emit to frontend
        const timeSeriesData = new TimeSeriesModel(decryptedData);
        timeSeriesData.save((err) => {
          if (err) {
            console.error("Error saving data:", err);
          } else {
            console.log("Data saved:", decryptedData);
            validMessages.push(decryptedData);
          }
        });
      }
    }

    // Emit valid data to frontend
    socket.emit("validData", validMessages);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Decrypt and validate data
function decryptAndValidate(encryptedMessage) {
  const [iv, encryptedData] = encryptedMessage.split("|");

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-ctr",
      Buffer.from("your-secret-passphrase", "utf-8"), // Replace with your secret passphrase
      Buffer.from(iv, "hex")
    );

    // Update to accumulate the decrypted data
    let decryptedData = decipher.update(Buffer.from(encryptedData, "hex"));
    decryptedData = Buffer.concat([decryptedData, decipher.final()]);

    // Parse the decrypted data
    const dataObj = JSON.parse(decryptedData.toString());

    // Verify secret key
    const generatedSecretKey = generateSecretKey(dataObj);
    if (dataObj.secret_key !== generatedSecretKey) {
      console.error("Invalid secret key");
      return null;
    }

    return {
      name: dataObj.name,
      origin: dataObj.origin,
      destination: dataObj.destination,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error decrypting data:", error);
    return null;
  }
}

// Generate a secret key for validation
function generateSecretKey(obj) {
  const hash = crypto.createHash("sha256");
  hash.update(obj.name + obj.origin + obj.destination);
  return hash.digest("hex");
}

// Start the server
server.listen(port, () => {
  console.log(`Listener server is running on port ${port}`);
});
