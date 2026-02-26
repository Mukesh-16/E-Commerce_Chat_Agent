import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { StateGraph, Annotation } from "@langchain/langgraph"
import { tool } from "@langchain/core/tools"
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb"
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"
import { MongoClient } from "mongodb"
import { z } from "zod"
import "dotenv/config"

async function retryWithBackOff<T>(
    fn: () => Promise<T>,
    maxRetries = 3
) : Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error: any) {
            if (error?.status === 429 && attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
                console.error(`rate Limit hit. Retrying in ${delay/1000} seconds...`)
                await new Promise(resolve => setTimeout(resolve, delay))
                continue
            }
            throw error
        }
    }
    throw new Error("Max retries exceeded!!")
}

export async function callAgent(client: MongoClient, query: string, threadId: string) {
    try {
        const dbName = "inventory_database"
        const db = client.db(dbName)
        const collection = db.collection("items")

        const graphState = Annotation.Root({
            messages: Annotation<BaseMessage[]>({
                reducer: (x, y) => x.concat(y),
            })
        })

        const itemLookUpTool = tool(
            async ({ query, n = 16 }: { query: string; n?: number }) => {
                try {
                    console.log("Item lookup tool called with query:", query)
                    const totalCount = await collection.countDocuments()
                    console.log(`Total documents in collection: ${totalCount}`)

                    if (!totalCount || totalCount ===0) {
                        console.log("Collection is empty")
                        return JSON.stringify({
                            error: "No items found in the inventory",
                            message: "The inventory database appears to be empty",
                            count: 0
                        })
                    }

                    const sampleDocs = await collection.find({}).limit(3).toArray()
                    console.log("Sample Documents:", sampleDocs)

                    const dbConfig = {
                        collection: collection as any,
                        indexName: "vector_index",
                        textKey: "embedding_text",
                        embeddingKey: "embedding"
                    }

                    const vectorStore = new MongoDBAtlasVectorSearch(
                        new GoogleGenerativeAIEmbeddings({
                            apiKey: process.env.GOOGLE_API_KEY,
                            model: "gemini-embedding-001"
                        }),
                        dbConfig
                    )
                    console.log("Performing vector search...")

                    const results = await vectorStore.similaritySearchWithScore(query, n)
                    console.log(`Vector search returned ${results.length} results`)

                    if (!results || results.length === 0) {
                        console.log("Vector search returned no results, trying text search...")

                        const textResults = await collection.find({
                            $or: [
                                { item_name: { $regex: query, $options: "i" } },
                                { item_description: { $regex: query, $options: "i" } },
                                { embedding_text: { $regex: query, $options: "i" } },
                                { categories: { $regex: query, $options: "i" } },
                            ]
                        }).limit(n).toArray()

                        console.log(`Text search returned ${textResults.length} results`)

                        return JSON.stringify({
                            results: textResults,
                            searchType: 'text',
                            query: query,
                            count: textResults.length
                        })
                    }

                    return JSON.stringify({
                        results: results,
                        searchType: "vector",
                        query: query,
                        count: results.length
                    })
                } catch (error: any) {
                    console.error("Error in item lookup:", error)
                    console.error("Error details:", {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    })
                    return JSON.stringify({
                        error: "Failed to search inventory",
                        message: error.message,
                        query: query
                    })
                }
            },
            {
                name: "item_lookup",
                description: "Gather furniture item details from the inventory database",
                schema: z.object({
                    query: z.string().describe("The search query"),
                    n: z.number().optional().default(16).describe("Number of results to return")
                })
            }
        )

        const tools = [itemLookUpTool]
        const toolNode = new ToolNode<typeof graphState.State>(tools)

        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            temperature: 0,
            maxRetries: 0,
            apiKey: process.env.GOOGLE_API_KEY
        }).bindTools(tools)

        function shouldContinue(state: typeof graphState.State) {
            const messages = state.messages
            const lastMessage = messages[messages.length -1] as AIMessage

            if(lastMessage.tool_calls?.length) {
                return "tools"
            }
            return "__end__"
        }

        async function callModel(state: typeof graphState.State) {
            return retryWithBackOff(async() => {
                const prompt = ChatPromptTemplate.fromMessages([
                    [
                        "system",
                        `You are a helpful E-commerce Chatbot Agent for a furniture store.
                        
                        IMPORTANT: You have access to an item_lookup tool that searches the
                        furniture inventory database. ALWAYS use this tool when customers ask
                        about furniture items, even if the tool returns errors or empty results.
                        
                        When using the item_lookup tool:
                        - If it returns results, provide helpful details about the furniture items
                        - If it returns an error or no results, acknowledge this and offer to
                          help in other ways
                        - If the database appears to be empty, let the customer know that inventory
                          might be being updated
                        
                        Current time: {time}`
                    ],
                    new MessagesPlaceholder("messages"),
                ])

                const formattedPrompt = await prompt.formatMessages({
                    time: new Date().toISOString(),
                    messages: state.messages,
                })

                const result = await model.invoke(formattedPrompt)

                return { messages: [result] }
            })
        }

        const workflow = new StateGraph(graphState)
        .addNode("agent", callModel)
        .addNode("tools", toolNode)
        .addEdge("__start__", "agent")
        .addConditionalEdges("agent", shouldContinue)
        .addEdge("tools", "agent")

        const checkpointer = new MongoDBSaver({ client: client as any, dbName })
        const app = workflow.compile({ checkpointer })

        const finalState = await app.invoke({
            messages: [new HumanMessage(query)]
        }, {
            recursionLimit: 15,
            configurable: { 
                thread_id: threadId,
                checkpoint_ns: "chat",
                checkpoint_id: Date.now().toString()
            }
        })

        const response = finalState.messages[finalState.messages.length - 1].content

        console.log("Agent response:", response)

        return response

    } catch (error: any) {
        console.error("Error in callAgent:", error.message)

        if (error.status === 429) {
            throw new Error("Service Temporarily unavailable due to rate limits. Please try again.")
        } else if (error.status === 401) {
            throw new Error("Authentication Failed. Please check your API configuration.")
        } else {
            throw new Error(`Agent Failed: ${error.message}`)
        }
    }
}