import React, { useState } from "react";

const SERVER_URL = process.env.REACT_APP_API_URL;

const Artifacts = ({ eventFiles, setEventFiles, eventId }) => {
    const [files, setFiles] = useState([]);
    const [fileNames, setFileNames] = useState([]);
    const [uploadStatus, setUploadStatus] = useState("");

    const handleFileSelection = (event) => {
        const selectedFiles = Array.from(event.target.files);
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles);
            setFileNames(selectedFiles.map((file) => file.name));
        }
    };

    const handleFileUpload = async () => {
        if (files.length === 0) {
            setUploadStatus("Please select a file to upload");
            return;
        }
        setUploadStatus("Uploading file...");
        const formData = new FormData();
        files.forEach((file) => {
            formData.append("file", file);
        });
        formData.append("event", String(eventId));
        try{
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${SERVER_URL}/event_files/upload/`, {
                method: 'POST',
                body: formData,
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error("Upload failed");
            }
            const data = await response.json();
            setUploadStatus("File uploaded successfully");

            const updatedFiles = data.files.map(newFile => {
                const existing = eventFiles.find(f => f.id === newFile.id);
                return {
                    ...newFile,
                    share: existing?.share || false,
                };
            });
            setEventFiles(updatedFiles);
            // Clear the file input
            setFiles([]);
            setFileNames([]);
            document.getElementById("file-upload").value = "";
        } catch (error) {
            setUploadStatus("Upload failed. Please try again.");
                    }
    };

    const handleFileDelete = async (fileId) => {
        if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone")) return;
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch( `${SERVER_URL}/event_files/delete/${fileId}/`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`,
                }
            });
            if (!response.ok) {
                throw new Error("Failed to delete file");
            }
            const data = await response.json();
            setEventFiles(data.files);
        } catch (error) {
                    }
    };

    const handleFileDownload = (fileId, fileName) => {
        const token = localStorage.getItem('accessToken');
        fetch(`${SERVER_URL}/event_files/download/${fileId}/`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Download failed");
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(error => {
                    });
        
    };

    const handleShareToggle = (fileId) => {
        const updatedFiles = eventFiles.map(file =>
            file.id === fileId ? { ...file, share: !file.share } : file
        );
        setEventFiles(updatedFiles);
    };

    return (
    <div className="container mt-4">
        <div className="border rounded p-4 shadow-md artifact-container theme-transition mb-4">
            <input
                id="file-upload"
                type="file"
                className="form-control custom-file-input mb-3"
                multiple // Allows multiple file selection
                onChange={handleFileSelection}
            />
            <button className="btn btn-primary" onClick={handleFileUpload}>
                Upload Files
            </button>
            {fileNames.length > 0 && (
                <p className="mt-2 text-success">
                    Selected files: {fileNames.join(", ")}
                </p>
            )}
            {uploadStatus && <p className="mt-2">{uploadStatus}</p>}
        </div>
        <h2>Uploaded Files</h2>
        <table className="table table-hover">
            <thead>
                <tr>
                    <th>Share</th>
                    <th>File Name</th>
                    <th>Uploaded By</th>
                    <th>Uploaded At</th>
                    <th></th>
                    <th>Delete</th>
                </tr>
            </thead>
            <tbody>
                {eventFiles.length > 0 ? (
                    eventFiles.map((file) => (
                        <tr key= {file.id}>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={file.share || false}
                                    onChange={() => handleShareToggle(file.id)}
                                />
                            </td>
                            <td>{file.file}</td>
                            <td>{file.uploaded_by}</td>
                            <td>{file.uploaded_at}</td>
                            <td>
                                <button className="btn btn-outline-secondary" onClick={() => handleFileDownload(file.id, file.file)}>
                                    Download
                                </button>
                            </td>
                            <td>
                                <button className="btn btn-outline-danger" onClick={() => handleFileDelete(file.id)}>
                                    <i className="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="text-center">No files uploaded for this event.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
    );
};

export default Artifacts;