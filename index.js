const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dmztt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect to MongoDB before running any operations
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    // console.log("Successfully connected to MongoDB!");
    // Connect to the collections
    const database = client.db("selectifyDB");
    const queriesCollection = database.collection("queries");
    const recommendationsCollection = database.collection("recommendations");

    // All queries route - GET
    app.get("/all-queries", async (req, res) => {
      const cursor = queriesCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    // Add Query Route - POST
    app.post("/add-query", async (req, res) => {
      try {
        // console.log("Request body:", req.body);
        const query = {
          productName: req.body.productName,
          productBrand: req.body.productBrand,
          productImageUrl: req.body.productImageUrl,
          queryTitle: req.body.queryTitle,
          boycottReason: req.body.boycottReason,
          userEmail: req.body.userEmail,
          userName: req.body.userName,
          userImage: req.body.userImage,
          timestamp: new Date(),
          recommendationCount: 0,
        };

        const result = await queriesCollection.insertOne(query);
        // console.log("Query inserted:", result);
        res.send(result);
      } catch (error) {
        console.error("Error inserting query:", error.message);
        res.status(500).send({ message: error.message });
      }
    });

    // Get My Queries Route - GET
    app.get("/my-queries/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { userEmail: email };
        const cursor = queriesCollection.find(query);
        const result = await cursor.sort({ timestamp: -1 }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Get Query Details Route - GET
    app.get("/query/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // Validate the ID format
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }

        const query = { _id: new ObjectId(id) };

        // Fetch the query from the database
        const result = await queriesCollection.findOne(query);

        if (!result) {
          // If no document is found, return a 404 response
          return res.status(404).send({ message: "Query not found" });
        }

        // Send the fetched query as the response
        res.send(result);
      } catch (error) {
        // Log the error and return a 500 response
        console.error("Error fetching query:", error.message);
        res.status(500).send({ message: "Failed to fetch query details" });
      }
    });

    // Delete Query Route - DELETE
    app.delete("/query/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await queriesCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Update Query Route - PATCH
    app.patch("/query/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) }; // Use ObjectId to query the document
        const updatedQuery = {
          $set: {
            productName: req.body.productName,
            productBrand: req.body.productBrand,
            productImageUrl: req.body.productImageUrl,
            queryTitle: req.body.queryTitle,
            boycottReason: req.body.boycottReason,
          },
        };
        const result = await queriesCollection.updateOne(filter, updatedQuery);
        if (result.modifiedCount === 1) {
          res.send({ message: "Query updated successfully" });
        } else {
          res
            .status(404)
            .send({ message: "Query not found or no changes made" });
        }
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    // Add Recommendation Route - POST
    app.post("/recommendations", async (req, res) => {
      const recommendation = req.body;
      const result = await recommendationsCollection.insertOne(recommendation);
      res.send(result);
    });
    // Get Recommendations for a Query Route - GET
    app.get("/recommendations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { queryId: id };
      const cursor = recommendationsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // Get My Recommendations Route - GET
    app.get("/my-recommendations/:email", async (req, res) => {
      const email = req.params.email;
      const query = { recommenderEmail: email };
      const cursor = recommendationsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // Delete Recommendation Route - DELETE
    app.delete("/recommendations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await recommendationsCollection.deleteOne(query);
      res.send(result);
    });
    // Get Recommendations for My Queries Route - GET
    app.get("/recommendations-for-my-queries/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const cursor = recommendationsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Increment Recommendation Count Route - PATCH
    app.patch("/query/:id/increment-recommendations", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queriesCollection.updateOne(query, {
        $inc: { recommendationCount: 1 },
      });
      res.send(result);
    });
    // Decrement Recommendation Count Route - PATCH
    app.patch("/query/:id/decrement-recommendations", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queriesCollection.updateOne(query, {
        $inc: { recommendationCount: -1 },
      });
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
