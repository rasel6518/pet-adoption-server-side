const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;

//middleware

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j6xnqa4.mongodb.net/?retryWrites=true&w=majority`;

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

        const categoryCollection = client.db('petadoptDB').collection("categories")
        const userCollection = client.db('petadoptDB').collection("users")
        const petlistingCollection = client.db('petadoptDB').collection("petlistings")
        const adoptionCollection = client.db('petadoptDB').collection("adoptions")
        const donationCampaignsCollection = client.db('petadoptDB').collection("donationcampaignss")


        //jwt api

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
            res.send({ token })
        })

        //middlewires 

        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access from 51 line' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
                if (error) {
                    return res.status(401).send({ message: 'unauthorized access from 56 line' })

                }
                req.decoded = decoded
                console.log('from 60', req.decoded);
                next()
            })
        }


        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(401).send({ message: 'forbidden access' })
            }
            next()
        }


        //user api

        app.post('/users', async (req, res) => {
            const user = req.body;

            //insert email if user doesnot exists

            const query = { email: user.email }
            const existuser = await userCollection.findOne(query);
            if (existuser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }

            const result = await userCollection.insertOne(user);
            res.send(result)
        })
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updateRole = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(query, updateRole)
            res.send(result)
        })

        app.get('/user/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req?.decoded?.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';


            }
            res.send({ admin })


        })

        app.get('/categories', async (req, res) => {
            const result = await categoryCollection.find().toArray()
            res.send(result)
        })

        // pet adopt add api

        app.post('/petlistings', verifyToken, async (req, res) => {
            const query = req.body;
            const result = await petlistingCollection.insertOne(query);
            res.send(result)
        })

        app.get('/petlistings', verifyToken, async (req, res) => {
            console.log('from 146 ', req.decoded);
            console.log('hello');
            const result = await petlistingCollection.find().toArray()
            res.send(result)
        })
        app.get('/petlisting/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await petlistingCollection.findOne(query);
            res.send(result)
        })
        app.get('/mypetlistings/:email', verifyToken, async (req, res) => {
            const email = req.params.email

            const result = await petlistingCollection.find({ userEmail: email }).toArray()
            res.send(result)
        })
        app.get('/updatepetlist/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await petlistingCollection.findOne(query);
            res.send(result)
        })

        app.put('/petlistings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatepets = req.body;
            const pets = {
                $set: {
                    petName: updatepets.petName,
                    petImage: updatepets.petImage,
                    petCategory: updatepets.category,
                    petAge: updatepets.petAge,
                    petLocation: updatepets.petLocation,
                    shortDescription: updatepets.shortDescription,
                    longDescription: updatepets.longDescription,
                }
            }
            const result = await petlistingCollection.updateOne(filter, pets, options);

            res.send(result)
        })

        app.delete('/petlistings/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            console.log('Deleting book with id:', id);

            const query = { _id: new ObjectId(id) };
            const result = await petlistingCollection.deleteOne(query);
            res.send(result);
        });


        //Adoption Request api

        app.post('/adoptionrequest', verifyToken, async (req, res) => {
            const query = req.body;
            const result = await adoptionCollection.insertOne(query);
            res.send(result)
        })

        app.get('/adoptionrequest', verifyToken, async (req, res) => {
            const result = await adoptionCollection.find().toArray()
            res.send(result)
        })
        app.get('/myadoptionrequest/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const result = await donationCampaignsCollection.find({ userEmail: email }).toArray()
            res.send(result)
        })


        //donation campaigns api

        app.post('/donationcampaigns', verifyToken, async (req, res) => {
            const user = req.body;

            const result = await donationCampaignsCollection.insertOne(user);
            res.send(result)
        })

        app.get('/donationcampaigns', verifyToken, async (req, res) => {
            const result = await donationCampaignsCollection.find().sort({ date: -1 }).toArray()
            res.send(result)
        })
        app.get('/mydonationcamp/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const result = await donationCampaignsCollection.find({ userEmail: email }).toArray()
            res.send(result)
        })
        app.get('/updatedonationcamp/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await donationCampaignsCollection.findOne(query);
            res.send(result)
        })

        app.put('/updatedonationcamp/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDonation = req.body;
            const pets = {
                $set: {
                    petName: updateDonation.petName,
                    donationImage: updateDonation.donationImage,
                    lastDate: updateDonation.lastDate,
                    maxAmount: updateDonation.maxAmount,
                    shortDescription: updateDonation.shortDescription,
                    longDescription: updateDonation.longDescription,
                }
            }
            const result = await donationCampaignsCollection.updateOne(filter, pets, options);

            res.send(result)
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });



        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('pet adoption is running')
})
app.listen(port, () => {
    console.log(`Pet Adoption is running on port ${port}`);
})