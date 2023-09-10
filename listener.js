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
  console.log("Listener connected");

  socket.on("data", async (data) => {
    const { data: messageString, secretKey } = data; // Destructure data object

    try {
      const encryptedMessages = messageString.split("|");

      for (const encryptedMessage of encryptedMessages) {
        if (!encryptedMessage) {
          // Skip empty messages
          continue;
        }

        const [iv, encryptedData] = encryptedMessage.split("|");
        const decipher = crypto.createDecipheriv(
          "aes-256-ctr",
          Buffer.from(secretKey, "hex"),
          Buffer.from(iv, "hex")
        );

        let decryptedData = decipher.update(Buffer.from(encryptedData, "hex"));
        decryptedData = Buffer.concat([decryptedData, decipher.final()]);

        // Validate and process decrypted data (you can save it to MongoDB here)
        const jsonData = JSON.parse(decryptedData.toString("utf8"));
        console.log("Received and decrypted data:", jsonData);

        // Save to MongoDB using Mongoose model
        const timeseriesData = new TimeseriesData({
          ...jsonData,
          timestamp: new Date(),
        });
        await timeseriesData.save();
      }
    } catch (error) {
      console.error("Error decrypting data:", error);
    }
  });
});

const PORT = process.env.PORT || 4000; // Use the environment port or default to 4000

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
