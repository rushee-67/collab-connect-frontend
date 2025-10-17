import React, { useEffect, useRef } from 'react';

const VideoPlayer = ({ stream, participantId }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={participantId === 'local'} // mute local video to avoid echo
      className="w-full h-full object-cover"
    />
  );
};

export default VideoPlayer;
