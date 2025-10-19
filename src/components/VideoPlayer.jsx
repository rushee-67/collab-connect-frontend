import React, { useEffect, useRef } from 'react';

const VideoPlayer = ({ stream, participantId }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement && stream) {
      // Attach the media stream
      videoElement.srcObject = stream;
    }

    // Handle cleanup when component unmounts or stream changes
    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={participantId === 'local' || participantId?.startsWith('user-')} // Mute self video
      className="w-full h-full object-cover rounded-lg bg-black"
    />
  );
};

export default VideoPlayer;
