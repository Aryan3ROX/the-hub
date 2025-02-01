import { v2 } from "cloudinary";
import fs from "fs"
import dotenv from "dotenv"
dotenv.config({path: './env'})

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = cloudinary.v2.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
    }
}

export {uploadOnCloudinary}