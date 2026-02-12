// Upload Page Logic

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const uploadBtn = document.getElementById('uploadBtn');
const statusMessage = document.getElementById('statusMessage');

let selectedFile = null;

// Replace this with your deployed Cloud Function URL
const SIGNED_URL_API = 'https://generateuploadurl-505432234681.asia-south1.run.app';

// Drag and Drop Events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

// File Input Change
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            selectedFile = file;
            fileInfo.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            uploadBtn.disabled = false;
            statusMessage.innerHTML = '';
        } else {
            showStatus('Please select a valid CSV file.', 'error');
            selectedFile = null;
            uploadBtn.disabled = true;
            fileInfo.textContent = '';
        }
    }
}

// Upload Handling
uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    showStatus('<i class="fa-solid fa-spinner fa-spin"></i> Initializing upload...', 'info');
    uploadBtn.disabled = true;

    try {
        // 1. Get Signed URL
        const response = await fetch(SIGNED_URL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Failed to get upload URL');

        const { url } = await response.json();

        // 2. Upload to GCS using Signed URL
        showStatus('<i class="fa-solid fa-spinner fa-spin"></i> Uploading to cloud...', 'info');

        const uploadResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'text/csv'
            },
            body: selectedFile
        });

        if (!uploadResponse.ok) throw new Error('Failed to upload file to storage');

        showStatus(`
            <div class="success-content">
                <i class="fa-solid fa-circle-check"></i>
                <div>
                    <strong>File uploaded successfully!</strong><br>
                    Your data is now being processed.
                </div>
                <a href="batch_dashboard.html" class="btn-dashboard-link">
                    <i class="fa-solid fa-chart-pie"></i> Watch in Dashboard
                </a>
            </div>
        `, 'success');

        fileInfo.textContent = '';
        selectedFile = null;

    } catch (error) {
        console.error('Upload Error:', error);
        showStatus(`❌ Error: ${error.message}`, 'error');
        uploadBtn.disabled = false;
    }
});

function showStatus(message, type) {
    statusMessage.innerHTML = message;
    statusMessage.className = `status-message status-${type}`;
}
