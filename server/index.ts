import 'dotenv/config';
import express, { Express, Request, Response } from "express";
import { MongoClient } from "mongodb";
import { callAgent } from './agent';
import cors from "cors";

const app: Express = express();

app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_ATLAS_URL as string)

async function startServer() {
    try {
        await client.connect()
        await client.db("admin").command({ ping: 1 })
        console.log("You are successfully connected to MongoDB!")

        app.get('/', (req: Request, res: Response) => {
            res.send('LangGraph Agent Server')
        })

        // Endpoint to start new conversation
        app.post('/chat', async (req: Request, res: Response) => {
            const rawMessage = req.body.message
            const initialMessage = Array.isArray(rawMessage) ? rawMessage[0] : String(rawMessage)
            const threadId = Date.now().toString()

            console.log(initialMessage)

            try {
                const response = await callAgent(client, initialMessage, threadId)
                res.json({ threadId, response })
            } catch (error) {
                console.error("Error starting conversation:",error)
                res.status(500).json({ error: "Internal Server Error" })
            }
        })

        //Endpoint to resume a conversation
        app.post('/chat/:threadId', async (req: Request, res: Response) => {
            const rawThreadId = req.params.threadId
            const threadId = Array.isArray(rawThreadId) ? rawThreadId[0] : String(rawThreadId)
            const rawMessage = req.body.message
            const message = Array.isArray(rawMessage) ? rawMessage[0] : String(rawMessage)

            try {
                const response = await callAgent(client, message, threadId ?? '')
                res.json({ response })
            } catch (error) {
                console.error("Error resuming conversation:", error)
                res.status(500).json({ error: "Internal Server Error"})
            }
        })

        const PORT = process.env.PORT || 8000
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })
    } catch (error) {
        console.error("Error connecting to MongoDB:", error)
        process.exit(1)
    }
}

startServer()