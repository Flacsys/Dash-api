import * as mongoose from "mongoose"

const ENV_MONGO_URI = process.env.MONGO_URI;

async function connect(uri?: string) {
    const connectionString = uri || ENV_MONGO_URI;
    if (!connectionString) {
        throw new Error('MongoDB connection string is missing');
    }
    await mongoose.connect(connectionString);
    console.log('MongoDB connected to', connectionString);
}


export default connect;
