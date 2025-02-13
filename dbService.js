const amqp = require("amqplib");
const mongoose = require("mongoose");
const express = require("express");

const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Schema
const chatSchema = new mongoose.Schema({
    msg_id: { type: String, required: true },
    type: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: String, required: true },
});

const Chat = mongoose.model("Chat", chatSchema);

// RabbitMQ Consumer Class
class MessageConsumer {
    constructor() {
        this.channel = null;
        this.connection = null;
    }

    async connectToDatabase() {
        try {
            const uri =
                "mongodb+srv://akashsaini537:akashsaini537@cluster0.nltdj.mongodb.net/chatdb?retryWrites=true&w=majority&appName=Cluster0";
            await mongoose.connect(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log("Connected to MongoDB Atlas");
        } catch (error) {
            console.error("Database connection error:", error);
            throw error;
        }
    }

    async connectToRabbitMQ() {
        try {
            this.connection = await amqp.connect("amqp://localhost");
            this.channel = await this.connection.createChannel();

            // Declare Exchange and Queue
            await this.channel.assertExchange("db_ex", "direct", { durable: true });
            const { queue } = await this.channel.assertQueue("db_queue", {
                durable: true,
                autoDelete: false,
            });

            await this.channel.bindQueue(queue, "db_ex", "db.message.save");
            console.log("Connected to RabbitMQ");

            return queue;
        } catch (error) {
            console.error("RabbitMQ connection error:", error);
            throw error;
        }
    }

    async saveMessage(messageData) {
        try {
            const newChat = new Chat({
                msg_id: messageData.msg_id,
                type: messageData.type,
                from: messageData.from,
                to: messageData.to,
                content: messageData.content,
                timestamp: messageData.timestamp,
            });

            await newChat.save();
            console.log("Chat saved:", newChat);

            return true;
        } catch (error) {
            console.error("Error saving chat:", error);
            return false;
        }
    }

    async startConsuming() {
        try {
            await this.connectToDatabase();
            const queue = await this.connectToRabbitMQ();

            console.log("Waiting for messages...");

            this.channel.consume(queue, async (msg) => {
                if (msg) {
                    try {
                        const messageData = JSON.parse(msg.content.toString());
                        const saved = await this.saveMessage(messageData);

                        if (saved) {
                            this.channel.ack(msg);
                        } else {
                            this.channel.nack(msg, false, false); // Don't requeue failed messages
                        }
                    } catch (error) {
                        console.error("Error processing message:", error);
                        this.channel.nack(msg, false, false);
                    }
                }
            });
        } catch (error) {
            console.error("Error starting consumer:", error);
            process.exit(1);
        }
    }

    async cleanup() {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
            console.log("RabbitMQ connections closed");

            await mongoose.connection.close();
            console.log("MongoDB connection closed");
        } catch (error) {
            console.error("Error during cleanup:", error);
        }
    }
}

// API Routes

// 1. Get all chats
app.get("/api/chats", async (req, res) => {
    try {
        const chats = await Chat.find({}).sort({ timestamp: -1 }); // Latest messages first

        res.status(200).json({
            success: true,
            count: chats.length,
            data: chats,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to fetch chats",
            details: error.message,
        });
    }
});

// 2. Get chats between two users
app.get("/api/chats/conversation", async (req, res) => {
    const { user1, user2 } = req.query;

    try {
        const chats = await Chat.find({
            $or: [
                { from: user1, to: user2 },
                { from: user2, to: user1 },
            ],
        }).sort({ timestamp: -1 });

        res.status(200).json({
            success: true,
            count: chats.length,
            data: chats,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to fetch conversation",
            details: error.message,
        });
    }
});

// Start the Consumer
// const consumer = new MessageConsumer();
// consumer.startConsuming();

// Handle Process Termination
process.on("SIGINT", async () => {
    console.log("Shutting down gracefully...");
    await consumer.cleanup();
    process.exit(0);
});
// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
