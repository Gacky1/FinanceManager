const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

exports.generateUploadUrl = async (req, res) => {
    // CORS Headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const bucketName = 'finance-manager-uploads'; // Replace with your actual bucket name
        const fileName = 'raw.csv';

        const options = {
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: 'text/csv',
        };

        const [url] = await storage
            .bucket(bucketName)
            .file(fileName)
            .getSignedUrl(options);

        console.log('Generated Signed URL:', url); // Log the success
        res.status(200).json({ url });
    } catch (error) {
        console.error('Detailed Error generating signed URL:', error);
        // Send the actual error message back to the client for debugging
        res.status(500).json({
            error: 'Error generating upload URL',
            details: error.message
        });
    }
};
