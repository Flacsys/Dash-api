import * as mongoose from "mongoose"

async function connect(uri?: string) {
    // prefer explicit uri argument, then MONGO_URI env, then NODE_ENV-based defaults
    const MONGO_URI = uri || process.env.MONGO_URI || (process.env.NODE_ENV === 'test' ? 'mongodb://localhost:27017/test' : 'mongodb://localhost:27017/dash-api');
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected to', MONGO_URI);
}

// add a default export so other modules can `import connect from './config/mongodb'`
export default connect;
