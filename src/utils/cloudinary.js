import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return 'No file path provided';
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
            
        })
        // console.log('File uploaded successfully : ', response.url);
        console.log("response: ", response);
        fs.unlinkSync(localFilePath);
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath);// removes the locally saved file as the upload operation got failed
    }
}

const deletFromCloudinary = async(prevImage) => {
    try {
        if(!prevImage) return 'No image path provided';
        const publicId = prevImage.split('/').pop().split('.')[0];
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'auto',
        })
        console.log('File deleted successfully : ', response);
        return response;

    } catch (error) {
        console.log('Error while deleting the image from cloudinary: ', error.message);
    }
}

export {uploadOnCloudinary, deletFromCloudinary};