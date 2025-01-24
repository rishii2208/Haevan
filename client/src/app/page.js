// pages/index.js
import Link from "next/link"
export default function Home() {

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <img src="/black yellow minimalist Idea Logo.gif" alt="logo" className="mb-4" />
      <a
        href="/Video"
        className="px-4 py-2 bg-yellow-500 rounded hover:bg-yellow-600 transition"
      >
        Start
      </a>
    </div>
  );
}
