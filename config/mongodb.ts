import * as mongoose from "mongoose"

async function connect(uri?: string) {
    const connectionString =  "mongodb://localhost:27017/test";
    if (!connectionString) {
        throw new Error('MongoDB connection string is missing');
    }
    await mongoose.connect(connectionString);
    console.log('MongoDB connected to', connectionString);
}


export default connect;
