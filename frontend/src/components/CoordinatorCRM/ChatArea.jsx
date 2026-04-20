import React from 'react';

const ChatArea = ({ selectedLead }) => {
  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4 tracking-wide">Chat Area</h2>
      <div className="flex-1 flex items-center justify-center bg-white/50 rounded-2xl border border-white/60">
        {selectedLead ? (
          <p className="text-gray-500">Chat with {selectedLead.name} will appear here.</p>
        ) : (
          <p className="text-gray-400">Select a contact to start chatting</p>
        )}
      </div>
    </div>
  );
};

export default ChatArea;