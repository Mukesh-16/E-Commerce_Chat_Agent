import 'dotenv/config';
import express, { Express, Request, Response } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";

const app: Express = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_ATLAS_URL as string);

