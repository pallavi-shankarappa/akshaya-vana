import { MongoClient } from 'mongodb';

const client = new MongoClient("mongodb+srv://smartcity:Y9biZsF1q5YNfYoJ@cluster0.zfvzbxs.mongodb.net/akshayavana?retryWrites=true&w=majority");

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

// Call this only when your application terminates
export async function disconnectFromMongoDB() {
  await client.close();
}