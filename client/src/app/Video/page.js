"use client"
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export default function VideoPage() {
  const myVideoRef = useRef(null);
  const strangerVideoRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [waitingForUser, setWaitingForUser] = useState(true);
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
      setWaitingForUser(false);

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      peer.onnegotiationneeded = async () => {
        if (typeRef.current === 'p1') {
          try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket.current.emit('sdp:send', { sdp: peer.localDescription, to: remoteSocketRef.current });
          } catch (error) {
            console.error('Error during negotiation:', error);
          }
        }
      };

      peer.onicecandidate = (e) => {
        if (e.candidate && remoteSocketRef.current) {
          socket.current.emit('ice:send', {
            candidate: e.candidate,
            to: remoteSocketRef.current,
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

    socket.current.on('waiting', () => {
      setWaitingForUser(true);
      document.querySelector('.modal').style.display = 'flex';
    });

    socket.current.on('sdp:reply', async ({ sdp }) => {
      const peer = peerRef.current;
      if (peer) {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(sdp));
          if (typeRef.current === 'p2') {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.current.emit('sdp:send', { sdp: peer.localDescription, to: remoteSocketRef.current });
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
          if (candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          }
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

  const [chatVisible, setChatVisible] = useState(false);

  const disconnectAndRedirect = () => {
    if (socket.current) {
      socket.current.disconnect();
    }
    if (peerRef.current) {
      peerRef.current.close();
    }
    window.location.href = '/';
  };

  const disconnectAndFindNew = () => {
    if (socket.current) {
      socket.current.disconnect();
    }
    if (peerRef.current) {
      peerRef.current.close();
    }
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      {/* Waiting Modal */}
      {waitingForUser && (
        <div className="modal fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <span className="text-white">Waiting For Someone...</span>
        </div>
      )}

      {/* Video Holder */}
      <div className="video-holder flex flex-wrap w-full h-[100vh] px-4 justify-center">
        <video
          ref={strangerVideoRef}
          autoPlay
          className="w-full lg:w-2/5 h-auto lg:mx-16 scale-[120%] my-auto"
        />
        <video
          ref={myVideoRef}
          autoPlay
          className="w-full lg:w-2/5 h-auto lg:mx-16 scale-[120%] my-auto"
        />
      </div>

      {/* Exit and Next Buttons */}
      <div className="absolute top-4 right-4 flex space-x-4">
        <button
          onClick={disconnectAndRedirect}
          className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 transition"
        >
          Exit
        </button>
        <button
          onClick={disconnectAndFindNew}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition"
        >
          Next
        </button>
      </div>

      {/* Chatbox Toggle Button */}
      {!chatVisible && (
        <button
          onClick={() => setChatVisible(true)}
          className="fixed bottom-4 right-4 bg-yellow-500 text-black p-3 rounded-full shadow-lg hover:bg-yellow-600 transition"
        >
          Chat
        </button>
      )}

      {/* Chatbox */}
      {chatVisible && (
        <div className="fixed bottom-0 right-0 bg-gray-800 chat-holder w-full max-w-md h-[70vh] shadow-lg rounded-t-lg flex flex-col">
          <button
            onClick={() => setChatVisible(false)}
            className="self-end text-white p-2"
          >
            ✖
          </button>

          <div className="messages flex-grow bg-gray-800 p-4 rounded-t overflow-y-auto">
            {messages.map((msg, idx) => (
              <div key={idx} className="mb-2">
                <b>{msg.from}:</b> <span>{msg.text}</span>
              </div>
            ))}
          </div>

          <div className="input flex mt-2 p-2 bg-gray-900">
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
      )}
    </div>
  );
}
