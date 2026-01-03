import mongoose, { Document, Schema } from 'mongoose';

export interface IFileMetadata extends Document {
    originalName: string;
    fileType: string; // mimetype or extension
    size: number;
    uploadDate: Date;
    targetModel: string;
    recordCount: number;
    status: 'pending' | 'confirmed' | 'failed';
    importErrors?: any[];
    uploadedBy?: mongoose.Types.ObjectId;
}

const fileMetadataSchema = new Schema<IFileMetadata>({
    originalName: { type: String, required: true },
    fileType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now },
    targetModel: { type: String, required: true },
    recordCount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
    importErrors: { type: Schema.Types.Mixed },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Admin' }
});

export const FileMetadata = mongoose.model<IFileMetadata>('FileMetadata', fileMetadataSchema);
