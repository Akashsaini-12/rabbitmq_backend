const mongoose = require("mongoose");

const uri =
    "mongodb+srv://akashsaini537:akashsaini537@cluster0.nltdj.mongodb.net/chatdb?retryWrites=true&w=majority&appName=Cluster0";

mongoose
    .connect(uri)
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch((err) => console.error("Error connecting to MongoDB Atlas:", err));
const Schema = mongoose.Schema;
const chatSchema = new Schema({
    msg_id: { type: String, required: true },
    type: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Number, required: true }, // Ensure timestamp is a number
});

const Chat = mongoose.model("chat", chatSchema);

const createChat = async () => {
    try {
        const newChat = new Chat({
            msg_id: "1114444414441",
            type: "direct_message",
            from: "9444944",
            to: "00044444",
            content: "Hello, this is a test message!",
            timestamp: Date.now(),
        });

        const savedChat = await newChat.save();
        console.log("Chat saved:", savedChat);
    } catch (err) {
        console.error("Error saving chat:", err);
    }
};

createChat();
