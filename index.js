const express = require('express');
const app = express()
const jwt = require("jsonwebtoken")
const cors = require('cors');
require("dotenv").config()
const port = process.env.PORT || 5000


// app.use(cors())
app.use(express.json())

app.use(cors({
    origin: "http://localhost:5173", // Replace with your frontend's URL
    credentials: true,
}));


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hnhnv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        const userCollection = client.db("bistroDB").collection("users")
        const menuCollection = client.db("bistroDB").collection("menu")
        const reviewsCollection = client.db("bistroDB").collection("reviews")
        const cartsCollection = client.db("bistroDB").collection("carts")

        // JWT Related APIs
        app.post("/jwt", (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1y" })
            res.send({ token })
        })


        // Middlewares

        const verifyToken = (req, res, next) => {
            console.log("Inside verified Token", req.headers.authorization)
            if (!req.headers.authorization) {
                return res.status(401).send({ message: "Forbidden Access" })
            }
            const token = req.headers.authorization.split(" ")[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: "Forbidden Access" })
                }
                req.decoded = decoded
                next()
            })

        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === "admin"
            if (!isAdmin) {
                return res.status(403).send({ message: "Forbidden Access" })
            }
            next()
        }

        // User Related Apis
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.get("/users/admin/:email", verifyToken, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "Unauthorized access" })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === "admin"
            }
            res.send({ admin })
        })

        app.post("/users", async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "User already exists", insertedId: null })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    "role": "admin"
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })
        // Menu Related apis
        app.get("/menu", async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })
        app.get("/reviews", async (req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result)
        })

        app.get("/carts", async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
        })

        app.post("/carts", async (req, res) => {
            const cartItem = req.body
            const result = await cartsCollection.insertOne(cartItem)
            res.send(result)
        })

        app.delete("/carts/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })




        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("Bistro is running")
})

app.listen(port, () => {
    console.log(`Bistro is running on port: ${port}`)
})