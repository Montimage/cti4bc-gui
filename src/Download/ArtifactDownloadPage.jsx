import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/Toast';

const ArtifactDownloadPage = () => {
    const { id } = useParams();
    const { showError, showSuccess } = useToast();
    const hasDownloaded = useRef(false);
    const [downloadCompleted, setDownloadCompleted] = useState(false);

    useEffect(() => {
        if(hasDownloaded.current) return;
        hasDownloaded.current = true;

        const downloadArtifact = async () => {
            const SERVER_URL = process.env.REACT_APP_API_URL;
            const token = localStorage.getItem('accessToken');

            try {
                const response = await fetch(`${SERVER_URL}/event_files/download/${id}/`,{
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                });

                if (!response.ok){
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `artifact-${id}`;
                document.body.appendChild(link);
                link.click();

                window.URL.revokeObjectURL(url);
                document.body.removeChild(link);

                setDownloadCompleted(true);
                showSuccess('Artifact downloaded successfully!');
            } catch (error) {
                console.error('Error downloading artifact:', error);
                showError('Failed to download the artifact.');
            }
        };

        downloadArtifact();
    }, [id, showError, showSuccess]);

    return (
        <div>
            {downloadCompleted 
                ? <p>Download completed. You may now close this tab.</p>
                : <p>Preparing your download...</p>
            }
        </div>
    );

};

export default ArtifactDownloadPage;