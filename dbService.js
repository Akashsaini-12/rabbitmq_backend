const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
    try {
        const uri = "mongodb+srv://akashsaini537:akashsaini537@cluster0.nltdj.mongodb.net/chatdb?retryWrites=true&w=majority&appName=Cluster0";
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB Atlas");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

// Connect to MongoDB
connectDB();

// MongoDB Schema for API Data
const apiDataSchema = new mongoose.Schema({
    issueNumber: { type: String, required: true },
    number: { type: String, required: true },
    colour: { type: String, required: true },
    premium: { type: String, required: true }
});

const ApiData = mongoose.model("ApiData", apiDataSchema);

// API endpoint to store API data
app.post("/api/store-api-data", async (req, res) => {
    try {
        const { messages } = req.body;
        let dataToSave = [];

        // Handle both single object and array formats
        if (Array.isArray(req.body)) {
            dataToSave = req.body;
        } else if (typeof req.body === 'object' && req.body !== null) {
            dataToSave = [req.body];
        } else {
            return res.status(400).json({
                success: false,
                error: "Invalid data format. Expected an object or array of objects."
            });
        }

        // Store all messages in MongoDB
        const savedMessages = await ApiData.insertMany(dataToSave);

        res.status(200).json({
            success: true,
            message: `Successfully stored ${savedMessages.length} messages`,
            data: savedMessages
        });
    } catch (error) {
        console.error("Error storing API data:", error);
        res.status(500).json({
            success: false,
            error: "Failed to store API data",
            details: error.message
        });
    }
});

// API endpoint to get all API data
app.get("/api/get-api-data", async (req, res) => {
    try {
        const data = await ApiData.find({});
        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to fetch API data",
            details: error.message
        });
    }
});

// Handle Process Termination
process.on("SIGINT", async () => {
    console.log("Shutting down gracefully...");
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 
