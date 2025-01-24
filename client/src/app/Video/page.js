"use client"
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export default function VideoPage() {
  const myVideoRef = useRef(null);
  const strangerVideoRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const peerRef = useRef(null);
  const remoteSocketRef = useRef(null);
  const typeRef = useRef(null);
  const roomidRef = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    socket.current = io('http://localhost:8000');

    socket.current.on('disconnected', () => {
      alert('The other user disconnected.');
      window.location.href = '/?disconnect';
    });

    socket.current.emit('start', (person) => {
      typeRef.current = person;
    });

    socket.current.on('remote-socket', (id) => {
      remoteSocketRef.current = id;
      document.querySelector('.modal').style.display = 'none';

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      peer.onnegotiationneeded = async () => {
        if (typeRef.current === 'p1') {
          try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket.current.emit('sdp:send', { sdp: peer.localDescription });
          } catch (error) {
            console.error('Error during negotiation:', error);
          }
        }
      };

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.current.emit('ice:send', {
            candidate: e.candidate,
            to: id,
          });
        }
      };

      peer.ontrack = (e) => {
        if (strangerVideoRef.current) {
          strangerVideoRef.current.srcObject = e.streams[0];
        }
      };

      navigator.mediaDevices
        .getUserMedia({ audio: true, video: true })
        .then((stream) => {
          if (myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
          }
          stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        })
        .catch((error) => {
          console.error('Error accessing media devices:', error);
        });
    });

    socket.current.on('sdp:reply', async ({ sdp }) => {
      const peer = peerRef.current;
      if (peer) {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(sdp));
          if (typeRef.current === 'p2') {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.current.emit('sdp:send', { sdp: peer.localDescription });
          }
        } catch (error) {
          console.error('Error handling SDP reply:', error);
        }
      }
    });

    socket.current.on('ice:reply', async ({ candidate }) => {
      const peer = peerRef.current;
      if (peer) {
        try {
          await peer.addIceCandidate(candidate);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    socket.current.on('roomid', (id) => {
      roomidRef.current = id;
    });

    socket.current.on('get-message', (input) => {
      setMessages((prev) => [...prev, { from: 'Stranger', text: input }]);
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
      if (peerRef.current) {
        peerRef.current.close();
      }
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.current.emit('send-message', message, typeRef.current, roomidRef.current);
      setMessages((prev) => [...prev, { from: 'You', text: message }]);
      setMessage('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="modal fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
        <span className="text-white">Waiting For Someone...</span>
      </div>

      <div className="video-holder flex">
        <video ref={myVideoRef} autoPlay className="w-1/2 h-auto" />
        <video ref={strangerVideoRef} autoPlay className="w-1/2 h-auto" />
      </div>

      <div className="chat-holder mt-4 w-full max-w-md">
        <div className="messages bg-gray-800 p-4 rounded h-64 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div key={idx} className="mb-2">
              <b>{msg.from}:</b> <span>{msg.text}</span>
            </div>
          ))}
        </div>
        <div className="input flex mt-2">
          <input
            type="text"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-grow p-2 rounded-l bg-gray-700 text-white"
          />
          <button
            onClick={sendMessage}
            className="px-4 bg-yellow-500 rounded-r hover:bg-yellow-600 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
