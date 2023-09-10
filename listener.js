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

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("data", (encryptedData) => {
    const messages = encryptedData.messages; // Updated to handle messages array
    const secretKey = encryptedData.secretKey;

    messages.forEach((message) => {
      const [iv, encryptedMessage, authTag] = message.split("|");
      const decryptedData = decryptData(
        encryptedMessage,
        iv,
        secretKey,
        authTag
      );

      console.log("Decrypted Data:", decryptedData);

      // Save the decrypted data to the database
      const timeSeries = new TimeSeriesModel({
        name: decryptedData.name,
        origin: decryptedData.origin,
        destination: decryptedData.destination,
        timestamp: decryptedData.timestamp,
      });
      timeSeries.save();
    });
  });
});

function decryptData(
  encryptedMessage,
  iv,
  secretKey,
  authTag // Added authTag parameter
) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(secretKey, "hex"),
    Buffer.from(iv, "hex")
  );

  const decrypted = decipher.update(Buffer.from(encryptedMessage, "hex"));
  decrypted += decipher.final();

  const calculatedAuthTag = decipher.getAuthTag();

  if (calculatedAuthTag !== authTag) {
    throw new Error("Message authentication failed");
  }

  return decrypted.toString();
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
