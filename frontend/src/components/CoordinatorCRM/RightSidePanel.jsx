import React from 'react';

const RightSidePanel = ({ selectedLead, crmMode }) => {
  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4 tracking-wide">Call Campaign</h2>
      <div className="flex-1 bg-white/50 rounded-2xl border border-white/60 p-4">
        <p className="text-gray-500 text-sm mb-2">Mode: <span className="font-bold text-blue-600">{crmMode}</span></p>
        {selectedLead ? (
          <p className="text-gray-600">Campaign details for {selectedLead.name}</p>
        ) : (
          <p className="text-gray-400 text-sm">Select a contact to manage call campaign</p>
        )}
      </div>
    </div>
  );
};

export default RightSidePanel;